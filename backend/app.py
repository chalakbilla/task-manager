"""Flask API for TaskFlow. Every route lives under /api so Vercel can route it to this function.

Auth flow (OAuth 2.0 authorization-code flow, handled server side):
  1. Browser -> GET /api/auth/google/login          -> redirect to Google
  2. Google  -> GET /api/auth/google/callback?code  -> we exchange the code for tokens,
     upsert the user in Supabase, set our own JWT in an HttpOnly cookie, redirect to /dashboard
  3. The browser sends that cookie automatically on every /api request (same origin)
"""
import os
import traceback
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from urllib.parse import quote, urlencode

import jwt
import requests
from flask import Flask, g, jsonify, redirect, request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .db import supabase
from .mailer import email_configured, send_email

JWT_SECRET = os.environ["JWT_SECRET"]
CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
REDIRECT_URI = os.environ["GOOGLE_REDIRECT_URI"]

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = "openid email profile"  # sign-in only; email goes through EmailJS

COOKIE = "session"
SESSION_DAYS = 7
PRIORITIES = {"low", "medium", "high"}
STATUSES = {"pending", "in_progress", "completed"}

app = Flask(__name__)

# Signs the OAuth "state" value so we can reject forged callbacks (CSRF protection)
state_signer = URLSafeTimedSerializer(JWT_SECRET, salt="oauth-state")

# "creator:users!tasks_created_by_fkey(...)" = join users twice, using the named foreign keys
TASK_SELECT = (
    "*, creator:users!tasks_created_by_fkey(name,email,picture),"
    " assignee:users!tasks_assigned_to_fkey(name,email,picture)"
)


# ---------------------------------------------------------------- helpers
def issue_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def is_https() -> bool:
    return request.headers.get("X-Forwarded-Proto", request.scheme) == "https"


def login_required(fn):
    """Decorator: validate the JWT cookie and put the user on flask.g."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.cookies.get(COOKIE)
        if not token:
            return jsonify(error="Not logged in"), 401
        try:
            claims = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.PyJWTError:
            return jsonify(error="Invalid or expired session"), 401
        res = (
            supabase.table("users")
            .select("id,name,email,picture")
            .eq("id", claims["sub"])
            .limit(1)
            .execute()
        )
        if not res.data:
            return jsonify(error="User not found"), 401
        row = res.data[0]
        g.user = row
        return fn(*args, **kwargs)

    return wrapper


def log_activity(*items):
    """items: (type, message) tuples. Failing to log must never break the request."""
    try:
        supabase.table("activity").insert(
            [{"actor_id": g.user["id"], "type": t, "message": m} for t, m in items]
        ).execute()
    except Exception as exc:  # noqa: BLE001
        print(f"activity: {exc}")


def fetch_task(task_id):
    res = supabase.table("tasks").select(TASK_SELECT).eq("id", task_id).limit(1).execute()
    return res.data[0] if res.data else None


# ------------------------------------------------------------------ auth routes
@app.get("/api/auth/google/login")
def google_login():
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "prompt": "select_account",  # let the user choose which Google account to use
        "state": state_signer.dumps("login"),
    }
    return redirect(f"{AUTH_URL}?{urlencode(params)}")


@app.get("/api/auth/google/callback")
def google_callback():
    """Finish Google sign-in. Any failure is logged with a traceback (visible in Vercel
    function logs) and sent back to the login page with a short error code."""
    try:
        return _finish_login()
    except Exception:  # noqa: BLE001
        print("google_callback crashed:\n" + traceback.format_exc(), flush=True)
        return redirect("/?error=server_error")


def _finish_login():
    if request.args.get("error"):
        return redirect("/?error=access_denied")

    try:
        state_signer.loads(request.args.get("state", ""), max_age=600)
    except BadSignature:
        return redirect("/?error=bad_state")

    code = request.args.get("code")
    if not code:
        return redirect("/?error=no_code")

    # 1) authorization code -> tokens
    tok = requests.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    ).json()
    if "access_token" not in tok:
        # Google says why (e.g. redirect_uri_mismatch). Log the reason, not the secrets.
        print(f"token exchange failed: {tok.get('error')} - {tok.get('error_description')}", flush=True)
        return redirect(f"/?error=token_exchange_failed&reason={quote(str(tok.get('error', 'unknown')))}")

    # 2) access token -> who is this?
    info = requests.get(
        USERINFO_URL, headers={"Authorization": f"Bearer {tok['access_token']}"}, timeout=10
    ).json()
    if "sub" not in info:
        print(f"userinfo failed: {info}", flush=True)
        return redirect("/?error=userinfo_failed")

    # 3) create the account on first login, update it on later ones
    row = {
        "google_id": info["sub"],
        "email": info["email"],
        "name": info.get("name") or info["email"],
        "picture": info.get("picture"),
    }
    user = supabase.table("users").upsert(row, on_conflict="google_id").execute().data[0]

    # 4) our own session: JWT in an HttpOnly cookie (JavaScript can't read it, so XSS can't steal it)
    resp = redirect("/dashboard")
    resp.set_cookie(
        COOKIE,
        issue_jwt(user["id"]),
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        secure=is_https(),
        samesite="Lax",
        path="/",
    )
    return resp


@app.get("/api/diagnose")
def diagnose():
    """Temporary setup check. Reports which env vars exist and whether Supabase answers.
    Never returns secret values. Remove this route before submitting."""
    names = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GOOGLE_CLIENT_ID",
             "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "JWT_SECRET",
             "EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY", "EMAILJS_PRIVATE_KEY"]
    report = {n: bool(os.environ.get(n)) for n in names}
    report["GOOGLE_REDIRECT_URI_value"] = os.environ.get("GOOGLE_REDIRECT_URI")  # not secret
    try:
        supabase.table("users").select("id").limit(1).execute()
        report["supabase_users_table"] = "ok"
    except Exception as exc:  # noqa: BLE001
        report["supabase_users_table"] = f"error: {exc}"
    return jsonify(report)


@app.post("/api/auth/logout")
def logout():
    resp = jsonify(ok=True)
    resp.delete_cookie(COOKIE, path="/")
    return resp


# ------------------------------------------------------------------- api routes
@app.get("/api/health")
def health():
    return jsonify(status="ok")


@app.get("/api/me")
@login_required
def me():
    return jsonify({**g.user, "email_configured": email_configured()})


@app.get("/api/users")
@login_required
def list_users():
    """Everyone who has signed up (the team), so tasks can be assigned to them."""
    return jsonify(supabase.table("users").select("id,name,email,picture").order("name").execute().data)


@app.get("/api/tasks")
@login_required
def list_tasks():
    """All workspace tasks. Everyone on the team can see them; only creator/assignee can edit."""
    res = supabase.table("tasks").select(TASK_SELECT).order("created_at", desc=True).execute()
    return jsonify(res.data)


@app.get("/api/activity")
@login_required
def list_activity():
    res = (
        supabase.table("activity")
        .select("id,type,message,created_at")
        .order("created_at", desc=True)
        .limit(8)
        .execute()
    )
    return jsonify(res.data)


@app.post("/api/tasks")
@login_required
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify(error="Title is required"), 400

    priority = data.get("priority") or "medium"
    if priority not in PRIORITIES:
        return jsonify(error="Invalid priority"), 400

    due = data.get("due_date") or None
    if due:
        try:
            date.fromisoformat(due)
        except ValueError:
            return jsonify(error="Invalid due date"), 400

    assigned_to = data.get("assigned_to") or g.user["id"]
    found = supabase.table("users").select("id,name,email").eq("id", assigned_to).limit(1).execute().data
    if not found:
        return jsonify(error="Assignee not found"), 400
    assignee = found[0]

    created = (
        supabase.table("tasks")
        .insert(
            {
                "title": title,
                "description": (data.get("description") or "").strip() or None,
                "priority": priority,
                "due_date": due,
                "created_by": g.user["id"],
                "assigned_to": assigned_to,
            }
        )
        .execute()
        .data[0]
    )

    # Email the assignee through EmailJS
    email_sent, email_error = send_email(
        to_email=assignee["email"],
        subject=f"New task assigned: {title}",
        message=(
            f"Hi {assignee['name']},\n\n"
            f"{g.user['name']} assigned you a new task:\n\n"
            f"  {title}\n"
            f"  Priority: {priority}\n"
            f"  Due: {due or 'no due date'}\n"
            f"  {created.get('description') or ''}\n\n"
            "Open TaskFlow to view it."
        ),
    )

    events = [("created", f"New task “{title}” created by {g.user['name']}")]
    if assignee["id"] != g.user["id"]:
        events.append(("assigned", f"Task “{title}” assigned to {assignee['name']} by {g.user['name']}"))
    if email_sent:
        events.append(("email", f"Email notification sent to {assignee['name']} for task assignment"))
    log_activity(*events)

    return jsonify(task=fetch_task(created["id"]), email_sent=email_sent, email_error=email_error), 201


@app.patch("/api/tasks/<task_id>/status")
@login_required
def update_status(task_id):
    new_status = (request.get_json(silent=True) or {}).get("status")
    if new_status not in STATUSES:
        return jsonify(error="Invalid status"), 400

    task = fetch_task(task_id)
    if not task:
        return jsonify(error="Task not found"), 404
    # Only the assignee or the creator may change a task
    if g.user["id"] not in (task["assigned_to"], task["created_by"]):
        return jsonify(error="Only the creator or assignee can update this task"), 403
    if task["status"] == new_status:
        return jsonify(task=task, email_sent=False)

    completed_at = datetime.now(timezone.utc).isoformat() if new_status == "completed" else None
    supabase.table("tasks").update({"status": new_status, "completed_at": completed_at}).eq("id", task_id).execute()

    email_sent, email_error = False, ""
    if new_status == "in_progress":
        # Email notification when a task is started (In Progress)
        recipient = task["creator"] if g.user["id"] != task["created_by"] else task["assignee"]
        email_sent, email_error = send_email(
            to_email=recipient["email"],
            subject=f"Task started: {task['title']}",
            message=(
                f"Hi {recipient['name']},\n\n"
                f"{g.user['name']} has started working on this task:\n\n"
                f"  {task['title']}\n"
                f"  Priority: {task.get('priority', 'medium')}\n"
                f"  Status: In Progress\n\n"
                f"Open TaskFlow to view progress."
            ),
        )
        events = [("assigned", f"Task “{task['title']}” started (In Progress) by {g.user['name']}")]
        if email_sent:
            events.append(("email", f"Email notification sent to {recipient['name']} for task start"))
        log_activity(*events)

    elif new_status == "completed":
        # Email notification when a task is completed
        recipient = task["creator"] if g.user["id"] != task["created_by"] else task["assignee"]
        email_sent, email_error = send_email(
            to_email=recipient["email"],
            subject=f"Task completed: {task['title']}",
            message=f"Hi {recipient['name']},\n\n{g.user['name']} marked this task as completed:\n\n  {task['title']}\n",
        )
        events = [("completed", f"Task “{task['title']}” marked as completed by {g.user['name']}")]
        if email_sent:
            events.append(("email", f"Email notification sent to {recipient['name']} for task completion"))
        log_activity(*events)

    return jsonify(task=fetch_task(task_id), email_sent=email_sent, email_error=email_error)


if __name__ == "__main__":
    # Local dev: python -m backend.app   (Next.js proxies /api/* here)
    app.run(host="127.0.0.1", port=5000, debug=True)
