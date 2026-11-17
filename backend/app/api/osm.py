from fastapi import APIRouter

from app.services.osm_service import OSMService
from app.agents.citizen_agent import analyze_places

router = APIRouter(
    prefix="/osm",
    tags=["OSM"],
)

osm = OSMService()


@router.get("/nearby")
def nearby(lat: float, lng: float):

    places = osm.nearby_places(
        latitude=lat,
        longitude=lng,
    )

    return analyze_places(places)