"""Send notification emails through EmailJS (REST API). All keys come from environment variables."""
import os

import requests

EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send"
NEEDED = ("EMAILJS_SERVICE_ID", "EMAILJS_TEMPLATE_ID", "EMAILJS_PUBLIC_KEY", "EMAILJS_PRIVATE_KEY")


def email_configured() -> bool:
    """True when all four EmailJS variables are set (used by /api/me and the Integrations card)."""
    return all(os.environ.get(name, "").strip() for name in NEEDED)


def send_email(to_email: str, subject: str, message: str) -> tuple[bool, str]:
    """Send one email via the EmailJS template (variables: to_email, subject, message).

    Returns (sent, reason). `reason` is "" on success, otherwise a message safe to show the user.
    Never raises: a mail failure must not make task creation/completion fail.
    """
    if not email_configured():
        print("mailer: EMAILJS_* variables are missing", flush=True)
        return False, "EmailJS is not configured on the server (missing EMAILJS_* variables)."

    try:
        resp = requests.post(
            EMAILJS_URL,
            json={
                "service_id": os.environ["EMAILJS_SERVICE_ID"].strip(),
                "template_id": os.environ["EMAILJS_TEMPLATE_ID"].strip(),
                "user_id": os.environ["EMAILJS_PUBLIC_KEY"].strip(),  # EmailJS calls the public key "user_id"
                "accessToken": os.environ["EMAILJS_PRIVATE_KEY"].strip(),  # server-side calls need the private key
                "template_params": {"to_email": to_email, "subject": subject, "message": message},
            },
            timeout=10,
        )
        if resp.ok:
            return True, ""

        print(f"mailer: EmailJS error {resp.status_code}: {resp.text}", flush=True)
        if "non-browser" in resp.text.lower():
            return False, (
                "EmailJS blocks server calls. In EmailJS go to Account > Security and turn on "
                "'Allow EmailJS API for non-browser applications'."
            )
        # EmailJS answers with a short plain-text reason (e.g. "The Public Key is invalid")
        return False, f"EmailJS error {resp.status_code}: {resp.text[:120]}"
    except Exception as exc:  # noqa: BLE001
        print(f"mailer: unexpected error: {exc}", flush=True)
        return False, "Could not reach EmailJS. Check the server logs."
