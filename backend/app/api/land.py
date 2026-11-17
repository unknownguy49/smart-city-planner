
from typing import Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.firebase_auth import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.persistent_data import ProjectArtifact
from app.schemas.land import LandRequest as ExistingLandRequest


router = APIRouter(
    prefix="/land",
    tags=["Land"],
)


# =========================================================
# REQUEST SCHEMA
# =========================================================

class LandSaveRequest(BaseModel):
    """Request schema for saving a land boundary."""
    project_id: int
    project_name: str = Field(min_length=1, max_length=255)
    area: float = Field(gt=0)
    geojson: dict[str, Any]


# =========================================================
# SAVE LAND
# =========================================================

@router.post("/save")
def save_land(
    request: LandSaveRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # Only allow the owner of a project to save its boundary.
    project = (
        db.query(Project)
        .filter(
            Project.id == request.project_id,
            Project.owner_uid == user["uid"],
        )
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    try:
        # Update the existing project details.
        project.area = request.area
        project.updated_at = datetime.utcnow()

        # Find the existing land-boundary artifact, if any.
        artifact = (
            db.query(ProjectArtifact)
            .filter(
                ProjectArtifact.project_id == project.id,
                ProjectArtifact.owner_uid == user["uid"],
                ProjectArtifact.artifact_type == "layout",
                ProjectArtifact.name == "land-boundary",
            )
            .first()
        )

        data = {
            "geojson": request.geojson,
            "area": request.area,
            "project_name": project.name,
        }

        if artifact is None:
            artifact = ProjectArtifact(
                project_id=project.id,
                owner_uid=user["uid"],
                artifact_type="layout",
                name="land-boundary",
                data=data,
                version=1,
            )
            db.add(artifact)
        else:
            artifact.data = data
            artifact.version = (artifact.version or 1) + 1

        db.commit()
        db.refresh(project)

        return {
            "success": True,
            "message": "Land boundary saved successfully",
            "project_id": project.id,
            "area": project.area,
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to save land boundary",
        )


# =========================================================
# GET LAND BOUNDARY
# =========================================================

@router.get("/{project_id}")
def get_land(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_uid == user["uid"],
        )
        .first()
    )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    artifact = (
        db.query(ProjectArtifact)
        .filter(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.owner_uid == user["uid"],
            ProjectArtifact.artifact_type == "layout",
            ProjectArtifact.name == "land-boundary",
        )
        .first()
    )

    if artifact is None:
        return {
            "project_id": project_id,
            "area": project.area,
            "geojson": None,
        }

    artifact_data = artifact.data or {}

    return {
        "project_id": project_id,
        "area": artifact_data.get("area", project.area),
        "geojson": artifact_data.get("geojson"),
    }
