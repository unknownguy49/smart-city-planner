import base64
import binascii
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from app.auth.firebase_auth import get_current_user
from app.services.email_service import send_report_email


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


class ReportEmailRequest(BaseModel):
    recipient: EmailStr
    report_name: str = Field(
        default="planning-report.pdf",
        min_length=1,
        max_length=120,
    )
    report_base64: str = Field(
        min_length=1,
        max_length=15_000_000,
    )



@router.post("/report-email")
async def email_report(
    request: ReportEmailRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    del user  # Identity is verified; do not trust client-supplied user IDs.

    if not re.fullmatch(
        r"[\w .()-]+\.pdf",
        request.report_name,
        flags=re.IGNORECASE,
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF report attachments are supported.",
        )

    try:
        report_bytes = base64.b64decode(
            request.report_base64,
            validate=True,
        )
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(
            status_code=400,
            detail="The report attachment is invalid.",
        ) from exc

    if not report_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="The attachment is not a valid PDF.",
        )

    try:
        await send_report_email(
            recipient=str(request.recipient),
            report_name=request.report_name,
            report_bytes=report_bytes,
        )
    except Exception as exc:
        # Log the exception on the server in production.
        raise HTTPException(
            status_code=502,
            detail="Unable to send the report email.",
        ) from exc

    return {
        "status": "success",
        "message": "Report email sent successfully.",
    }
