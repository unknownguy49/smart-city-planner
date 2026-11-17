
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.firebase_auth import get_current_user
from app.database import get_db
from app.models.project import Project
from app.models.analysis import Analysis
from app.schemas.planner import PlannerRequest
from app.agents.planner import run_agents

from app.models.persistent_data import ProjectArtifact
from app.services.design_service import design_service
from datetime import datetime

from app.services.scenario_evaluator import scenario_evaluator
from app.services.intervention_service import intervention_service
from app.services.scenario_design_service import (
    scenario_design_service,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/planner",
    tags=["AI Planner"],
)


# =========================================================
# ANALYZE PROJECT
# =========================================================

@router.post("/analyze")
def analyze_project(
    request: PlannerRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # Ensure the project exists and belongs to the logged-in user.
    project_row = (
        db.query(Project)
        .filter(
            Project.id == request.project_id,
            Project.owner_uid == user["uid"],
        )
        .first()
    )

    if project_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Preserve the original planner input structure while using saved
    # project location details when optional values are not supplied.
    coordinates = request.coordinates

    project = {
        "project_name": request.project_name,
        "building_type": request.building_type,
        "commercial_subtype": request.commercial_subtype,
        "city": request.city or project_row.city,
        "state": request.state or project_row.state,
        "jurisdiction": (
            request.state
            or project_row.state
            or "Andhra Pradesh"
        ),
        "budget": request.budget,
        "area": request.area,
        "coordinates": [
            (
                point.model_dump()
                if hasattr(point, "model_dump")
                else {"lat": point.lat, "lng": point.lng}
            )
            for point in coordinates
        ],
    }

    try:
        result = run_agents(project)

        # Save the analysis and associate it with the project owner.
        record = Analysis(
            project_id=project_row.id,
            owner_uid=user["uid"],
            overall_score=result.get("overall_score"),
            agent_scores=result.get("agent_scores"),
            planning_decision=result.get("planning_decision"),
            architecture=result.get("architecture"),
            civil=result.get("civil"),
            sustainability=result.get("sustainability"),
            municipal=result.get("municipal"),
            citizen=result.get("citizen"),
            osm=result.get("osm"),
            scoring=result.get("scoring"),
            recommendations=result.get("recommendations"),
            full_result=result,
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        architecture_result = result.get("architecture")

        if isinstance(architecture_result, dict):
            try:
                design_response = design_service.generate_design(
                    project=project,
                    architecture_result=architecture_result,
                )

                design_specification = design_response.get(
                    "design_specification"
                )

                if not isinstance(design_specification, dict):
                    raise ValueError(
                        "Architecture design generation returned invalid data."
                    )

                artifact = (
                    db.query(ProjectArtifact)
                    .filter(
                        ProjectArtifact.project_id == project_row.id,
                        ProjectArtifact.owner_uid == user["uid"],
                        ProjectArtifact.artifact_type == "design",
                        ProjectArtifact.name == "Architecture Room Plan",
                    )
                    .first()
                )

                now = datetime.utcnow()

                if artifact is None:
                    artifact = ProjectArtifact(
                        project_id=project_row.id,
                        owner_uid=user["uid"],
                        artifact_type="design",
                        name="Architecture Room Plan",
                        data=design_specification,
                        version=1,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(artifact)
                else:
                    artifact.data = design_specification
                    artifact.version = (artifact.version or 1) + 1
                    artifact.updated_at = now

                db.commit()

            except Exception:
                db.rollback()
                logger.exception(
                    "Architecture Room Plan generation or persistence failed "
                    "for project %s",
                    project_row.id,
                )

        return {
            **result,
            "analysis_id": record.id,
            "project_id": project_row.id,
        }

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()
        logger.exception("AI planner analysis failed")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Project analysis failed",
        ) from exc


# =========================================================
# ANALYSIS HISTORY
# =========================================================

@router.get("/history")
def get_analysis_history(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # Return only analyses belonging to the authenticated user.
    analyses = (
        db.query(Analysis)
        .filter(Analysis.owner_uid == user["uid"])
        .order_by(Analysis.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "project_id": item.project_id,
            "overall_score": item.overall_score,
            "full_result": item.full_result,
            "created_at": (
                item.created_at.isoformat()
                if item.created_at
                else None
            ),
        }
        for item in analyses
    ]


# =========================================================
# EVALUATE SCENARIO
# =========================================================

@router.post("/scenario")
def evaluate_scenario(request: dict):
    project = request.get("project")

    if not isinstance(project, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project data is required.",
        )

    intervention = request.get("intervention")

    if not intervention:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intervention type is required.",
        )

    parameters = request.get("parameters", {})

    return scenario_evaluator.evaluate(
        project=project,
        intervention=intervention,
        parameters=parameters,
        architecture_result=request.get("architecture", {}),
        civil_result=request.get("civil", {}),
        sustainability_result=request.get("sustainability", {}),
        municipal_result=request.get("municipal", {}),
        citizen_result=request.get("citizen", {}),
    )


# =========================================================
# GENERATE SCENARIO DESIGN
# =========================================================

@router.post("/scenario-design")
def generate_scenario_design(request: dict):
    project = request.get("project")

    if not isinstance(project, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project data is required.",
        )

    design = request.get("design")

    if not isinstance(design, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Baseline design is required.",
        )

    intervention = request.get("intervention")

    if not intervention:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intervention type is required.",
        )

    return scenario_design_service.generate_scenario_design(
        project=project,
        design=design,
        intervention=intervention,
        parameters=request.get("parameters", {}),
        scenario_project=request.get("scenario_project"),
    )


# =========================================================
# ANALYZE INTERVENTION
# =========================================================

@router.post("/intervention")
def analyze_intervention(request: dict):
    project = request.get("project")

    if not isinstance(project, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project data is required.",
        )

    intervention = request.get("intervention")

    if not intervention:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intervention type is required.",
        )

    return intervention_service.analyze(
        project=project,
        intervention=intervention,
        parameters=request.get("parameters", {}),
    )
