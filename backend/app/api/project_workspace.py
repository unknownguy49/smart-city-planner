
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.firebase_auth import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.project_workspace import ProjectWorkspace

router = APIRouter(
    prefix="/projects",
    tags=["Project Workspace"],
)


def get_owned_project(
    db: Session,
    project_id: int,
    uid: str,
) -> Project:
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_uid == uid,
        )
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return project


@router.get("/{project_id}/workspace")
def load_workspace(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    project = get_owned_project(
        db, project_id, user["uid"]
    )

    saved = (
        db.query(ProjectWorkspace)
        .filter(
            ProjectWorkspace.project_id == project.id,
            ProjectWorkspace.owner_uid == user["uid"],
        )
        .first()
    )

    if saved is None:
        return {
            "project_id": project.id,
            "revision": 0,
            "workspace": {},
            "message": "No workspace has been saved yet",
        }

    return {
        "project_id": project.id,
        "revision": saved.revision,
        "workspace": saved.state,
        "updated_at": (
            saved.updated_at.isoformat()
            if saved.updated_at else None
        ),
    }


@router.put("/{project_id}/workspace")
def save_workspace(
    project_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    project = get_owned_project(
        db, project_id, user["uid"]
    )

    state = payload.get("workspace")

    if not isinstance(state, dict):
        raise HTTPException(
            status_code=422,
            detail=(
                "Send a JSON object inside the "
                "'workspace' property."
            ),
        )

    saved = (
        db.query(ProjectWorkspace)
        .filter(
            ProjectWorkspace.project_id == project.id
        )
        .first()
    )

    now = datetime.utcnow()

    if saved is None:
        saved = ProjectWorkspace(
            project_id=project.id,
            owner_uid=user["uid"],
            state=state,
            revision=1,
            created_at=now,
            updated_at=now,
        )
        db.add(saved)
    else:
        # Ownership was checked before this query is updated.
        saved.owner_uid = user["uid"]
        saved.state = state
        saved.revision += 1
        saved.updated_at = now

    project.updated_at = now

    try:
        db.commit()
        db.refresh(saved)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save project workspace",
        ) from exc

    return {
        "success": True,
        "project_id": project.id,
        "revision": saved.revision,
        "updated_at": saved.updated_at.isoformat(),
    }


@router.post("/{project_id}/workspace/events")
def append_workspace_event(
    project_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Append a small event to the workspace history."""
    project = get_owned_project(
        db, project_id, user["uid"]
    )

    event = payload.get("event")

    if not isinstance(event, dict):
        raise HTTPException(
            status_code=422,
            detail="event must be a JSON object",
        )

    saved = (
        db.query(ProjectWorkspace)
        .filter(
            ProjectWorkspace.project_id == project.id
        )
        .first()
    )

    now = datetime.utcnow()

    if saved is None:
        saved = ProjectWorkspace(
            project_id=project.id,
            owner_uid=user["uid"],
            state={"history": [event]},
            revision=1,
            created_at=now,
            updated_at=now,
        )
        db.add(saved)
    else:
        state = dict(saved.state or {})
        history = list(state.get("history") or [])
        history.append(event)

        # Prevent unbounded growth of this simple event list.
        state["history"] = history[-500:]

        saved.state = state
        saved.revision += 1
        saved.updated_at = now

    project.updated_at = now

    try:
        db.commit()
        db.refresh(saved)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save workspace event",
        ) from exc

    return {
        "success": True,
        "revision": saved.revision,
    }
