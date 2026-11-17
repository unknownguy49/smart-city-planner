
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    DateTime,
    JSON,
)

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Firebase UID of the project owner.
    # Nullable temporarily so existing rows remain compatible.
    owner_uid = Column(
        String,
        nullable=True,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    building_type = Column(
        String,
        nullable=False,
    )

    commercial_subtype = Column(
        String,
        nullable=True,
    )

    city = Column(String)
    state = Column(String)
    area = Column(Float)
    budget = Column(Float)
    description = Column(String)

    coordinates = Column(
        JSON,
        nullable=True,
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
