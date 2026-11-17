import json
import logging
import os
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def initialize_firebase():
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

    if service_account_json:
        try:
            credential_data = json.loads(service_account_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.") from exc
        credential = credentials.Certificate(credential_data)
    elif service_account_path:
        path = Path(service_account_path)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        if not path.is_file():
            raise RuntimeError(f"Firebase service-account file not found: {path}")
        credential = credentials.Certificate(str(path))
    else:
        credential = credentials.ApplicationDefault()

    try:
        return firebase_admin.initialize_app(credential)
    except ValueError:
        return firebase_admin.get_app()


def get_current_user(
    token: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if token is None or token.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        decoded = auth.verify_id_token(
            token.credentials,
            app=initialize_firebase(),
            check_revoked=True,
        )
    except Exception as exc:
        logger.warning("Firebase ID token verification failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The authentication token has no user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "uid": uid,
        "email": decoded.get("email"),
        "name": decoded.get("name"),
    }


initialize_firebase()
