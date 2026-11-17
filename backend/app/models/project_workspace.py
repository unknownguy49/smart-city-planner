
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)

from app.database import Base


class ProjectWorkspace(Base):
    __tablename__ = "project_workspaces"

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            name="uq_project_workspaces_project_id",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    owner_uid = Column(
        String(128),
        nullable=False,
        index=True,
    )

    state = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    revision = Column(
        Integer,
        nullable=False,
        default=1,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
