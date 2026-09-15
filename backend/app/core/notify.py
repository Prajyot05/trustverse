"""In-app inbox + best-effort email. SMTP is optional; we always persist the notification."""
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.db.session import SessionLocal
from app.db.models import Notification


def send_email(to_addr: Optional[str], subject: str, body: str) -> bool:
    if not to_addr:
        print(f"[notify:email-skip] {subject}")
        return False
    host = os.getenv("SMTP_HOST")
    if not host:
        print(f"[notify:email-log] to={to_addr} subject={subject}\n{body}")
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = os.getenv("SMTP_FROM", "trustverse@localhost")
        msg["To"] = to_addr
        msg.set_content(body)
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587"))) as smtp:
            if os.getenv("SMTP_USER"):
                smtp.starttls()
                smtp.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(msg)
        return True
    except Exception as exc:
        print(f"[notify:email-fail] {exc}")
        return False


def notify(
    recipient_did: str,
    title: str,
    body: str,
    kind: str,
    href: Optional[str] = None,
    email_to: Optional[str] = None,
) -> Optional[int]:
    db = SessionLocal()
    try:
        row = Notification(
            recipient_did=recipient_did,
            title=title,
            body=body,
            kind=kind,
            href=href,
            email_to=email_to,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        send_email(email_to, title, body)
        return row.id
    except Exception as exc:
        print(f"[notify:fail] {exc}")
        db.rollback()
        return None
    finally:
        db.close()
