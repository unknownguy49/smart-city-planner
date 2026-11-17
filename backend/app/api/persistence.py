
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.firebase_auth import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.analysis import Analysis
from app.models.persistent_data import (
    Conversation,
    ChatMessage,
    ProjectArtifact,
    ProjectAsset,
)

router = APIRouter(tags=["Persistence"])


def verify_project(db: Session, project_id: int, uid: str) -> Project:
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_uid == uid,
        )
        .first()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def verify_conversation(
    db: Session, conversation_id: int, uid: str
) -> Conversation:
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.owner_uid == uid,
        )
        .first()
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    verify_project(db, conversation.project_id, uid)
    return conversation


class ArtifactInput(BaseModel):
    artifact_type: Literal["design", "layout", "scenario", "report", "change"]
    name: str = Field(min_length=1, max_length=255)
    data: dict[str, Any]


class ConversationInput(BaseModel):
    title: str = Field(default="Planning chat", max_length=255)


class MessageInput(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1)
    extra_data: dict[str, Any] | None = None


class AssetInput(BaseModel):
    asset_type: Literal["model2d", "model3d", "image", "report", "document", "other"]
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    storage_provider: str = Field(min_length=1, max_length=50)
    storage_key: str = Field(min_length=1, max_length=1024)
    file_url: str | None = None
    metadata_json: dict[str, Any] | None = None


def serialize_artifact(row: ProjectArtifact) -> dict[str, Any]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "artifact_type": row.artifact_type,
        "name": row.name,
        "data": row.data,
        "version": row.version,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/projects/{project_id}/analyses")
def list_analyses(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    rows = (
        db.query(Analysis)
        .filter(
            Analysis.project_id == project_id,
            Analysis.owner_uid == user["uid"],
        )
        .order_by(Analysis.created_at.desc())
        .all()
    )

    return [
        {
            "id": row.id,
            "project_id": row.project_id,
            "overall_score": row.overall_score,
            "agent_scores": row.agent_scores,
            "planning_decision": row.planning_decision,
            "architecture": row.architecture,
            "civil": row.civil,
            "sustainability": row.sustainability,
            "municipal": row.municipal,
            "citizen": row.citizen,
            "osm": row.osm,
            "scoring": row.scoring,
            "recommendations": row.recommendations,
            "full_result": row.full_result,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/projects/{project_id}/artifacts")
def list_artifacts(
    project_id: int,
    artifact_type: str | None = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    query = db.query(ProjectArtifact).filter(
        ProjectArtifact.project_id == project_id,
        ProjectArtifact.owner_uid == user["uid"],
    )

    if artifact_type:
        query = query.filter(ProjectArtifact.artifact_type == artifact_type)

    rows = query.order_by(ProjectArtifact.updated_at.desc()).all()
    return [serialize_artifact(row) for row in rows]


@router.post("/projects/{project_id}/artifacts")
def save_artifact(
    project_id: int,
    payload: ArtifactInput,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    # Use the artifact name and type as its stable identity. Saving again
    # updates the existing artifact instead of creating duplicate versions.
    row = (
        db.query(ProjectArtifact)
        .filter(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.owner_uid == user["uid"],
            ProjectArtifact.artifact_type == payload.artifact_type,
            ProjectArtifact.name == payload.name,
        )
        .first()
    )

    now = datetime.utcnow()

    if row is None:
        row = ProjectArtifact(
            project_id=project_id,
            owner_uid=user["uid"],
            artifact_type=payload.artifact_type,
            name=payload.name,
            data=payload.data,
            version=1,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.data = payload.data
        row.version = (row.version or 1) + 1
        row.updated_at = now

    db.commit()
    db.refresh(row)
    return serialize_artifact(row)


@router.get("/projects/{project_id}/artifacts/{artifact_id}")
def get_artifact(
    project_id: int,
    artifact_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    row = (
        db.query(ProjectArtifact)
        .filter(
            ProjectArtifact.id == artifact_id,
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.owner_uid == user["uid"],
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Saved artifact not found")

    return serialize_artifact(row)


@router.delete("/projects/{project_id}/artifacts/{artifact_id}")
def delete_artifact(
    project_id: int,
    artifact_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    row = (
        db.query(ProjectArtifact)
        .filter(
            ProjectArtifact.id == artifact_id,
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.owner_uid == user["uid"],
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Saved artifact not found")

    db.delete(row)
    db.commit()
    return {"success": True}


@router.post("/projects/{project_id}/conversations")
def create_conversation(
    project_id: int,
    payload: ConversationInput,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    row = Conversation(
        project_id=project_id,
        owner_uid=user["uid"],
        title=payload.title.strip() or "Planning chat",
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "project_id": row.project_id,
        "title": row.title,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/projects/{project_id}/conversations")
def list_conversations(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    rows = (
        db.query(Conversation)
        .filter(
            Conversation.project_id == project_id,
            Conversation.owner_uid == user["uid"],
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    return [
        {
            "id": row.id,
            "project_id": row.project_id,
            "title": row.title,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in rows
    ]


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    conversation = verify_conversation(db, conversation_id, user["uid"])

    rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == conversation.id,
            ChatMessage.owner_uid == user["uid"],
        )
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )

    return [
        {
            "id": row.id,
            "conversation_id": row.conversation_id,
            "role": row.role,
            "content": row.content,
            "extra_data": row.extra_data,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/conversations/{conversation_id}/messages")
def save_message(
    conversation_id: int,
    payload: MessageInput,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    conversation = verify_conversation(db, conversation_id, user["uid"])

    row = ChatMessage(
        conversation_id=conversation.id,
        owner_uid=user["uid"],
        role=payload.role,
        content=payload.content,
        extra_data=payload.extra_data,
    )
    db.add(row)
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "conversation_id": row.conversation_id,
        "role": row.role,
        "content": row.content,
        "extra_data": row.extra_data,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/projects/{project_id}/assets")
def list_assets(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    rows = (
        db.query(ProjectAsset)
        .filter(
            ProjectAsset.project_id == project_id,
            ProjectAsset.owner_uid == user["uid"],
        )
        .order_by(ProjectAsset.id.desc())
        .all()
    )

    return [
        {
            "id": row.id,
            "project_id": row.project_id,
            "asset_type": row.asset_type,
            "file_name": row.file_name,
            "content_type": row.content_type,
            "file_size": row.file_size,
            "storage_provider": row.storage_provider,
            "storage_key": row.storage_key,
            "file_url": row.file_url,
            "metadata_json": row.metadata_json,
        }
        for row in rows
    ]


@router.post("/projects/{project_id}/assets")
def save_asset(
    project_id: int,
    payload: AssetInput,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    verify_project(db, project_id, user["uid"])

    row = ProjectAsset(
        project_id=project_id,
        owner_uid=user["uid"],
        asset_type=payload.asset_type,
        file_name=payload.file_name,
        content_type=payload.content_type,
        file_size=payload.file_size,
        storage_provider=payload.storage_provider,
        storage_key=payload.storage_key,
        file_url=payload.file_url,
        metadata_json=payload.metadata_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "project_id": row.project_id,
        "asset_type": row.asset_type,
        "file_name": row.file_name,
        "content_type": row.content_type,
        "file_size": row.file_size,
        "storage_provider": row.storage_provider,
        "storage_key": row.storage_key,
        "file_url": row.file_url,
        "metadata_json": row.metadata_json,
    }
