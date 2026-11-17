
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load the backend .env file.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.database import Base, engine

# Import existing models before database initialization.
from app.models.project import Project
from app.models.analysis import Analysis
from app.models.persistent_data import (
    ProjectArtifact,
    ProjectAsset,
)

# Import all existing API routers.
from app.api.projects import router as project_router
from app.api.land import router as land_router
from app.api.planner import router as planner_router
from app.api.osm import router as osm_router
from app.api.scenario import router as scenario_router
from app.api.design import router as design_router
from app.api.chatbot import router as chatbot_router
from app.api.speech import router as speech_router
from app.api.persistence import router as persistence_router
from app.api.notifications import router as notifications_router


app = FastAPI(
    title="Smart City Planner API",
    description="AI-powered urban planning and land utilization",
    version="2.0.0",
)

@app.get("/health")
def health_check():
    return {"status": "ok"}


# CORS configuration.
# FRONTEND_ORIGINS can contain comma-separated frontend URLs.
origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        (
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "http://localhost:3001"
        ),
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create missing database tables for imported models.
# This does not migrate existing table columns.
@app.on_event("startup")
def initialize_database():
    Base.metadata.create_all(bind=engine)


# Register all existing routers.
app.include_router(project_router)
app.include_router(land_router)
app.include_router(planner_router)
app.include_router(osm_router)
app.include_router(scenario_router)
app.include_router(design_router)
app.include_router(chatbot_router)
app.include_router(speech_router)
app.include_router(persistence_router)
app.include_router(notifications_router)


@app.get("/")
def root():
    return {
        "message": "Smart City Planner Backend Running 🚀"
    }
