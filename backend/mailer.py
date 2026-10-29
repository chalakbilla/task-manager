"""Send email through the Gmail API using the acting user's own Google account."""
import base64
import os
from email.mime.text import MIMEText

import requests

from .db import supabase

TOKEN_URL = "https://oauth2.googleapis.com/token"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def _access_token(refresh_token: str) -> str:
    """Access tokens last ~1h, so we trade the stored refresh token for a fresh one."""
    r = requests.post(
        TOKEN_URL,
        data={
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def send_email(sender_id: str, to_email: str, subject: str, body: str) -> bool:
    """Send `body` from the Gmail account of user `sender_id`. Returns True on success.

    Never raises: a mail failure must not make task creation/completion fail.
    """
    try:
        res = supabase.table("users").select("email,refresh_token").eq("id", sender_id).limit(1).execute()
        if not res.data or not res.data[0].get("refresh_token"):
            print("mailer: sender has no refresh token")
            return False
        sender = res.data[0]

        msg = MIMEText(body)
        msg["To"] = to_email
        msg["From"] = sender["email"]
        msg["Subject"] = subject
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()  # Gmail wants base64url

        token = _access_token(sender["refresh_token"])
        r = requests.post(SEND_URL, headers={"Authorization": f"Bearer {token}"}, json={"raw": raw}, timeout=10)
        r.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"mailer: failed to send email: {exc}")
        return False
