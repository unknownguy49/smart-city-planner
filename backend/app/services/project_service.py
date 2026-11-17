from sqlalchemy.orm import Session

from app.models.analysis import Analysis

from app.models.project import Project
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
)


class ProjectService:

    @staticmethod
    def create_project(
        db: Session,
        project: ProjectCreate,
    ):

        db_project = Project(
            name=project.name,
            building_type=project.building_type,
            commercial_subtype=project.commercial_subtype,
            city=project.city,
            state=project.state,
            area=project.area,
            budget=project.budget,
            description=project.description,
            coordinates=[
                coordinate.model_dump()
                for coordinate in project.coordinates
            ],
        )

        db.add(db_project)

        db.commit()

        db.refresh(db_project)

        return db_project

    @staticmethod
    def get_projects(db: Session):

        return db.query(Project).all()

    @staticmethod
    def get_project(
        db: Session,
        project_id: int,
    ):

        return (
            db.query(Project)
            .filter(Project.id == project_id)
            .first()
        )

    @staticmethod
    def update_project(
        db: Session,
        project_id: int,
        project: ProjectUpdate,
    ):

        db_project = (
            db.query(Project)
            .filter(Project.id == project_id)
            .first()
        )

        if not db_project:
            return None

        update_data = project.model_dump(
            exclude_unset=True
        )

        if "coordinates" in update_data:
            coordinates = update_data["coordinates"]

            if coordinates is not None:
                update_data["coordinates"] = [
                    coordinate.model_dump()
                    if hasattr(coordinate, "model_dump")
                    else coordinate
                    for coordinate in coordinates
                ]

        for field, value in update_data.items():

            setattr(
                db_project,
                field,
                value,
            )

        db.commit()

        db.refresh(db_project)

        return db_project

    @staticmethod
    def delete_project(
        db: Session,
        project_id: int,
    ):

        project = (
            db.query(Project)
            .filter(Project.id == project_id)
            .first()
        )

        if project:

            db.query(Analysis).filter(
                Analysis.project_id == project_id
            ).delete(synchronize_session=False)

            db.delete(project)

            db.commit()

        return project