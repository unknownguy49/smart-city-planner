
import re
from copy import deepcopy
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.design_service import design_service


router = APIRouter(
    prefix="/design",
    tags=["Design"],
)


# =========================================================
# GENERATE DESIGN
# =========================================================

@router.post("/generate")
def generate_design(request: dict[str, Any]):
    """
    Generate a normalized architectural design specification
    from project data and architecture analysis.
    """
    project = request.get("project")
    architecture_result = request.get("architecture")

    if not isinstance(project, dict):
        raise HTTPException(
            status_code=400,
            detail="Project data is required.",
        )

    if not isinstance(architecture_result, dict):
        raise HTTPException(
            status_code=400,
            detail="Architecture analysis result is required.",
        )

    try:
        # Preserve the optional context parameters from the old version.
        return design_service.generate_design(
            project=project,
            architecture_result=architecture_result,
            site_context=request.get("site_context"),
            site_suitability=request.get("site_suitability"),
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate the design specification.",
        ) from exc


# =========================================================
# MODIFY DESIGN
# =========================================================

@router.post("/modify")
def modify_design(request: dict[str, Any]):
    """
    Apply supported natural-language modifications to a design
    specification without mutating the original input.
    """
    specification = request.get("design_specification")
    instruction = request.get("instruction")

    if not isinstance(specification, dict):
        raise HTTPException(
            status_code=400,
            detail="A design specification is required.",
        )

    if not isinstance(instruction, str) or not instruction.strip():
        raise HTTPException(
            status_code=400,
            detail="Please describe the design change.",
        )

    text = instruction.lower().strip()

    # Normalize a few number words used in natural-language requests.
    number_words = {
        "thirty five": "35",
        "twenty": "20",
        "forty": "40",
        "ten": "10",
    }

    for word, number in number_words.items():
        text = re.sub(rf"\b{re.escape(word)}\b", number, text)

    try:
        updated = deepcopy(specification)
        building = updated.setdefault("building", {})
        elements = updated.setdefault("site_elements", {})
        changes = []

        # -----------------------------------------------------
        # 1. Ground coverage / building footprint
        # -----------------------------------------------------
        coverage_topic = re.search(
            r"\b(ground coverage|site coverage|building coverage|"
            r"building footprint|footprint|coverage)\b",
            text,
        )

        percentage = re.search(
            r"\b(\d+(?:\.\d+)?)\s*%",
            text,
        )

        if coverage_topic and percentage:
            value = float(percentage.group(1))

            if not 0 <= value <= 100:
                raise HTTPException(
                    status_code=400,
                    detail="Ground coverage must be between 0 and 100%.",
                )

            building["ground_coverage_percent"] = value

            site = updated.get("site", {})
            site_area = site.get("area_m2") if isinstance(site, dict) else None

            if isinstance(site_area, (int, float)) and site_area >= 0:
                building["footprint_area_m2"] = site_area * value / 100

            changes.append(f"Ground coverage set to {value:g}%.")

        # -----------------------------------------------------
        # 2. Parking capacity
        # -----------------------------------------------------
        parking_topic = re.search(
            r"\b(parking|parking spaces|parking spots|"
            r"car parks|car parking|parking capacity)\b",
            text,
        )

        number = re.search(
            r"\b(\d+)\s*(?:parking\s*)?"
            r"(?:spaces?|spots?|cars?)\b",
            text,
        )

        if parking_topic and number:
            value = int(number.group(1))
            current = elements.get("parking_capacity", 0)

            if not isinstance(current, (int, float)):
                current = 0

            reduce_words = re.search(
                r"\b(reduce|decrease|lower|cut|remove|fewer|less)\b",
                text,
            )

            increase_words = re.search(
                r"\b(increase|raise|add|more|extra|expand)\b",
                text,
            )

            relative = re.search(
                r"\b(by|fewer|less|extra|more)\b",
                text,
            )

            if reduce_words and relative:
                capacity = max(0, int(current) - value)
            elif increase_words and relative:
                capacity = int(current) + value
            else:
                capacity = value

            elements["parking_capacity"] = capacity
            elements["parking"] = capacity > 0

            changes.append(
                f"Parking capacity set to {capacity} spaces."
            )

        # -----------------------------------------------------
        # 3. Site features: enable or disable
        # -----------------------------------------------------
        toggles = {
            "green_area": (
                r"\b(green area|green space|greenery|landscaping|"
                r"garden|vegetation|park area)\b",
                "Green area",
            ),
            "pedestrian_circulation": (
                r"\b(pedestrian circulation|pedestrian path|walkway|"
                r"walking path|footpath|sidewalk)\b",
                "Pedestrian circulation",
            ),
            "service_access": (
                r"\b(service access|service road|service entrance)\b",
                "Service access",
            ),
            "fire_access": (
                r"\b(fire access|fire lane|fire route|fire truck access)\b",
                "Fire access",
            ),
        }

        for key, (pattern, label) in toggles.items():
            if not re.search(pattern, text):
                continue

            disable = re.search(
                r"\b(disable|remove|exclude|turn off|"
                r"deactivate|without|no)\b",
                text,
            )

            enable = re.search(
                r"\b(enable|add|include|turn on|activate|"
                r"create|provide|introduce)\b",
                text,
            )

            if disable:
                elements[key] = False
                changes.append(f"{label} disabled.")

            elif enable:
                elements[key] = True
                changes.append(f"{label} enabled.")

        # -----------------------------------------------------
        # Validate requested changes
        # -----------------------------------------------------
        if not changes:
            raise HTTPException(
                status_code=400,
                detail=(
                    "I couldn't identify the requested change. "
                    "Describe the feature and include a value when "
                    "changing coverage or parking."
                ),
            )

        return {
            "status": "success",
            "message": "Design updated.",
            "changes": changes,
            "design_specification": updated,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to modify the design.",
        ) from exc
