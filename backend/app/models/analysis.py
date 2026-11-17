
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Float,
    JSON,
    ForeignKey,
    DateTime,
    String,
)

from app.database import Base


class Analysis(Base):
    __tablename__ = "analysis"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=True,
        index=True,
    )

    # Firebase UID of the user who owns this analysis.
    # Nullable temporarily for compatibility with existing records.
    owner_uid = Column(
        String,
        nullable=True,
        index=True,
    )

    overall_score = Column(Float)

    agent_scores = Column(JSON, nullable=True)
    planning_decision = Column(JSON, nullable=True)
    architecture = Column(JSON, nullable=True)
    civil = Column(JSON, nullable=True)
    sustainability = Column(JSON, nullable=True)
    municipal = Column(JSON, nullable=True)
    citizen = Column(JSON, nullable=True)
    osm = Column(JSON, nullable=True)
    scoring = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    full_result = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
