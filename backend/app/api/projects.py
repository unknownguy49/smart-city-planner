
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.firebase_auth import get_current_user
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import ProjectService


router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


def serialize_project(project: Project) -> dict:
    """Convert a Project model into a JSON-compatible response."""
    return {
        "id": project.id,
        "owner_uid": getattr(project, "owner_uid", None),
        "name": project.name,
        "building_type": project.building_type,
        "commercial_subtype": project.commercial_subtype,
        "city": project.city,
        "state": project.state,
        "area": project.area,
        "budget": project.budget,
        "description": project.description,
        "coordinates": project.coordinates or [],
        "created_at": (
            project.created_at.isoformat()
            if project.created_at
            else None
        ),
        "updated_at": (
            project.updated_at.isoformat()
            if project.updated_at
            else None
        ),
    }


def get_owned_project(
    db: Session,
    project_id: int,
    uid: str,
) -> Project:
    """Return a project only if it belongs to the authenticated user."""
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


def ensure_project_ownership_support() -> None:
    """Placeholder for the ownership field requirement."""
    if not hasattr(Project, "owner_uid"):
        raise RuntimeError(
            "Project model must define owner_uid before "
            "authenticated project routes can be used."
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ensure_project_ownership_support()

    # Preserve the existing ProjectService creation workflow.
    project = ProjectService.create_project(db, payload)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create project",
        )

    # Associate the newly created project with its authenticated owner.
    project.owner_uid = user["uid"]

    db.commit()
    db.refresh(project)

    return serialize_project(project)


@router.get("/")
def get_projects(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ensure_project_ownership_support()

    projects = (
        db.query(Project)
        .filter(Project.owner_uid == user["uid"])
        .order_by(
            Project.created_at.desc(),
            Project.id.desc(),
        )
        .all()
    )

    return [serialize_project(project) for project in projects]


@router.get("/{project_id}")
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ensure_project_ownership_support()

    project = get_owned_project(db, project_id, user["uid"])
    return serialize_project(project)


@router.put("/{project_id}")
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ensure_project_ownership_support()

    # Check ownership before updating.
    project = get_owned_project(db, project_id, user["uid"])

    values = payload.model_dump(exclude_unset=True)

    # Convert Pydantic coordinate objects to JSON-compatible dictionaries.
    if values.get("coordinates") is not None:
        values["coordinates"] = [
            point.model_dump()
            if hasattr(point, "model_dump")
            else point
            for point in values["coordinates"]
        ]

    # Preserve the existing service's update workflow.
    updated_project = ProjectService.update_project(
        db,
        project_id,
        payload,
    )

    if updated_project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Apply normalized coordinates if provided.
    if "coordinates" in values:
        project.coordinates = values["coordinates"]

    project.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(project)

    return serialize_project(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ensure_project_ownership_support()

    # Never delete a project belonging to another user.
    project = get_owned_project(db, project_id, user["uid"])

    deleted_project = ProjectService.delete_project(db, project_id)

    if not deleted_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return {"message": "Project deleted successfully"}
