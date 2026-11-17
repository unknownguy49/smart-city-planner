
import os
from email.message import EmailMessage

import aiosmtplib


async def send_report_email(
    recipient: str,
    report_name: str,
    report_bytes: bytes,
    content_type: str = "application/pdf",
) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM_EMAIL", smtp_username)

    if not all(
        [smtp_host, smtp_username, smtp_password, sender]
    ):
        raise RuntimeError(
            "Email service is not configured."
        )

    message = EmailMessage()
    message["Subject"] = f"Smart City Planner Report: {report_name}"
    message["From"] = sender
    message["To"] = recipient

    message.set_content(
        "Your Smart City Planner report is attached.\n\n"
        "Please review the report and verify applicable "
        "planning regulations before making real-world decisions."
    )

    main_type, _, sub_type = content_type.partition("/")

    if main_type not in {"application", "text"} or not sub_type:
        raise ValueError("Unsupported report content type.")

    message.add_attachment(
        report_bytes,
        maintype=main_type,
        subtype=sub_type,
        filename=report_name,
    )

    await aiosmtplib.send(
        message,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_username,
        password=smtp_password,
        start_tls=True,
        timeout=30,
    )
