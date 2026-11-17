
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_uid = Column(String(128), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Planning chat")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_uid = Column(String(128), nullable=False, index=True)
    role = Column(String(30), nullable=False)
    content = Column(Text, nullable=False)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ProjectArtifact(Base):
    """
    JSON-based saved outputs such as design specifications,
    GeoJSON layouts, scenarios, reports, and change history.
    """
    __tablename__ = "project_artifacts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_uid = Column(String(128), nullable=False, index=True)

    artifact_type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    data = Column(JSON, nullable=False)
    version = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class ProjectAsset(Base):
    """
    Metadata for files held in external object storage.
    Store the actual file outside PostgreSQL.
    """
    __tablename__ = "project_assets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_uid = Column(String(128), nullable=False, index=True)

    asset_type = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    content_type = Column(String(150), nullable=True)
    file_size = Column(Integer, nullable=True)

    storage_provider = Column(String(50), nullable=False)
    storage_key = Column(String(1024), nullable=False)
    file_url = Column(Text, nullable=True)

    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
