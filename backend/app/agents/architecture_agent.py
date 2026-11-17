from math import ceil, floor
import re

from app.rag.retriever import retrieve_context
from app.rag.rule_extractor import extract_rules


def extract_height_limits(text: str) -> list[float]:
    """
    Extract explicit commercial building heights
    from Table 24.
    """

    heights = []

    commercial_rows = [
        "Convenient/Neighbourhood shopping centre",
        "Sector shopping",
        "Sub-district centre",
        "Central business district",
        "Hotels",
        "Banks",
        "Cinema/multiplex",
        "Informal/bazaar market",
        "Warehousing/godowns",
    ]

    normalized = " ".join(text.split())

    normalized = normalized.replace(
        "Convenient/Neighbourho od",
        "Convenient/Neighbourhood"
    )

    for row_name in commercial_rows:

        pattern = (
            re.escape(row_name)
            + r".{0,120}?"
            + r"-\s*"
            + r"\d+(?:\.\d+)?\s+"
            + r"\d+(?:\.\d+)?\s+"
            + r"(\d+(?:\.\d+)?)"
        )

        matches = re.findall(
            pattern,
            normalized,
            flags=re.IGNORECASE
        )

        for match in matches:

            height = float(match)

            if height not in heights:
                heights.append(height)

    return sorted(heights)


def get_commercial_recommendations(
    commercial_subtype: str,
    area: float,
    budget: float
) -> list[str]:
    """
    Generate recommendations based on the selected
    commercial subtype instead of budget alone.
    """

    subtype = commercial_subtype.lower().strip()

    recommendations = []

    # ---------------------------------------------------------
    # NEIGHBOURHOOD / CONVENIENT SHOPPING
    # ---------------------------------------------------------

    if (
        "convenient" in subtype
        or "neighbourhood" in subtype
        or "neighborhood" in subtype
    ):

        recommendations.extend([
            "Pedestrian-friendly shop frontage",
            "Customer parking area",
            "Service and loading zone",
            "Clear pedestrian circulation",
            "Waste collection area",
        ])

    # ---------------------------------------------------------
    # SECTOR SHOPPING
    # ---------------------------------------------------------

    elif "sector shopping" in subtype:

        recommendations.extend([
            "Central pedestrian circulation zone",
            "Dedicated customer parking",
            "Service and loading area",
            "Fire engine access",
            "Accessible pedestrian entrances",
            "Waste management area",
        ])

        if area >= 5000:
            recommendations.append(
                "Landscaped pedestrian plaza"
            )

    # ---------------------------------------------------------
    # SUB-DISTRICT CENTRE
    # ---------------------------------------------------------

    elif "sub-district" in subtype:

        recommendations.extend([
            "Multi-level commercial circulation",
            "Dedicated customer parking",
            "Service and loading dock",
            "Pedestrian plaza",
            "Fire and emergency access",
            "Public transport integration",
            "Waste management facility",
        ])

        if area >= 10000:
            recommendations.append(
                "Structured parking solution"
            )

    # ---------------------------------------------------------
    # CENTRAL BUSINESS DISTRICT
    # ---------------------------------------------------------

    elif (
        "central business district" in subtype
        or subtype == "cbd"
    ):

        recommendations.extend([
            "High-capacity parking solution",
            "Pedestrian plaza",
            "Public transport integration",
            "Dedicated service/loading access",
            "Fire and emergency access",
            "Universal accessibility",
            "Smart parking management",
        ])

        if area >= 10000:
            recommendations.append(
                "Structured or multi-level parking"
            )

    # ---------------------------------------------------------
    # HOTEL
    # ---------------------------------------------------------

    elif "hotel" in subtype:

        recommendations.extend([
            "Dedicated hotel entrance",
            "Reception and lobby",
            "Guest parking",
            "Service entrance",
            "Kitchen and service zone",
            "Fire escape and emergency access",
            "Housekeeping/service circulation",
        ])

        if area >= 10000:
            recommendations.append(
                "Banquet and conference facilities"
            )

    # ---------------------------------------------------------
    # BANK
    # ---------------------------------------------------------

    elif "bank" in subtype:

        recommendations.extend([
            "Secure customer entrance",
            "Dedicated staff/service entrance",
            "Customer parking",
            "Security-controlled circulation",
            "Emergency access",
            "Accessible entrance",
        ])

        if area >= 5000:
            recommendations.append(
                "Dedicated ATM and self-service zone"
            )

    # ---------------------------------------------------------
    # CINEMA / MULTIPLEX
    # ---------------------------------------------------------

    elif (
        "cinema" in subtype
        or "multiplex" in subtype
    ):

        recommendations.extend([
            "Multiple emergency exits",
            "Fire-safe evacuation routes",
            "Dedicated entrance and exit circulation",
            "Customer parking",
            "Food and concession zone",
            "Accessible seating and circulation",
            "Service/loading area",
        ])

        if area >= 10000:
            recommendations.append(
                "Multi-screen entertainment complex"
            )

    # ---------------------------------------------------------
    # INFORMAL / BAZAAR MARKET
    # ---------------------------------------------------------

    elif (
        "informal" in subtype
        or "bazaar" in subtype
        or "market" in subtype
    ):

        recommendations.extend([
            "Pedestrian-first market circulation",
            "Covered vendor areas",
            "Sanitation facilities",
            "Waste collection points",
            "Service/loading access",
            "Emergency access corridor",
        ])

        if area >= 5000:
            recommendations.append(
                "Landscaped public gathering area"
            )

    # ---------------------------------------------------------
    # WAREHOUSE / GODOWN
    # ---------------------------------------------------------

    elif (
        "warehouse" in subtype
        or "godown" in subtype
    ):

        recommendations.extend([
            "Dedicated loading and unloading area",
            "Truck circulation route",
            "Service entrance",
            "Fire engine access",
            "Goods storage zone",
            "Staff parking",
            "Emergency access",
        ])

        if area >= 10000:
            recommendations.append(
                "Dedicated logistics staging area"
            )

    # ---------------------------------------------------------
    # FALLBACK COMMERCIAL
    # ---------------------------------------------------------

    else:

        recommendations.extend([
            "Customer parking",
            "Service and loading area",
            "Fire and emergency access",
            "Pedestrian-friendly circulation",
            "Waste management area",
        ])

    # ---------------------------------------------------------
    # SUSTAINABILITY
    # ---------------------------------------------------------

    if budget >= 100000000:

        recommendations.extend([
            "Solar Power System",
            "Rainwater Harvesting",
        ])

    # ---------------------------------------------------------
    # SMART BUILDING
    # ---------------------------------------------------------

    if budget >= 300000000:

        recommendations.append(
            "Building Management System (BMS)"
        )

        recommendations.append(
            "Smart Energy Monitoring"
        )

    # ---------------------------------------------------------
    # GREEN ROOF
    # ---------------------------------------------------------

    if area >= 10000 and budget >= 200000000:

        recommendations.append(
            "Green Roof or Rooftop Green Space"
        )

    # ---------------------------------------------------------
    # HELIPAD
    # ---------------------------------------------------------

    if area >= 25000 and budget >= 500000000:

        recommendations.append(
            "Helipad feasibility assessment"
        )

    return recommendations


def build_design_specification(
    project: dict,
    area: float,
    floors: int,
    estimated_builtup_area: float,
    far: float | None,
    building_height_m: float | None,
    ground_coverage_percent: float | None,
    parking_capacity: int,
    commercial_subtype: str | None,
    selected_commercial_control: dict | None,
) -> dict:
    """
    Build a structured architectural design specification.

    This specification is the common data contract for future:
        - 2D site-plan generation
        - 3D visualization
        - scenario visualization
        - planning reports
        - project-aware chatbot

    Only values already calculated or retrieved by the
    Architecture Agent are included. No unsupported
    regulatory values are invented here.
    """

    building_type = project.get(
        "building_type",
        "unknown",
    )

    design_specification = {
        "site": {
            "area_m2": area,
            "jurisdiction": project.get(
                "jurisdiction"
            ),
            "state": project.get(
                "state"
            ),
            "city": project.get(
                "city"
            ),
        },

        "building": {
            "type": building_type,
            "subtype": commercial_subtype,
            "floors": floors,
            "height_m": building_height_m,
            "far": far,
            "ground_coverage_percent": (
                ground_coverage_percent
            ),
            "estimated_builtup_area_m2": (
                estimated_builtup_area
            ),
        },

        "site_elements": {
            "parking": parking_capacity > 0,
            "parking_capacity": parking_capacity,
            "green_area": True,
            "pedestrian_circulation": True,
            "service_access": True,
            "fire_access": True,
        },

        "regulatory_basis": {
            "selected_commercial_control": (
                selected_commercial_control
            ),
        },
    }

    return design_specification


def architecture_agent(project: dict, area: float):
    jurisdiction = (
        project.get("jurisdiction")
        or project.get("state")
        or "Andhra Pradesh"
    )

    building = project["building_type"].lower()

    commercial_subtype = project.get(
        "commercial_subtype"
    )

    budget = project["budget"]

    # ---------------------------------------------------------
    # RAG QUESTION
    # ---------------------------------------------------------

    rag_question = f"""
    {jurisdiction} building regulations for a {building} building
    on a {area} square meter plot.

    Commercial subtype:
    {commercial_subtype if commercial_subtype else "Not specified"}

    Find regulations specifically relevant to:

    1. Permissible FAR / FSI for the land use
    2. Purchasable FAR
    3. Maximum building height
    4. Front, side and rear setbacks
    5. Maximum ground coverage
    6. Minimum plot area
    7. Road width requirements
    8. Parking requirements

    Prioritize Table 24 "Development Controls for Different Uses"
    and explicit regulatory provisions, tables, numerical limits,
    and applicability conditions.

    If a commercial subtype is specified, prioritize the
    regulation row corresponding to that subtype.

    Do not return general definitions unless no
    specific requirement is available.
    """

    # ---------------------------------------------------------
    # RETRIEVE REGULATIONS
    # ---------------------------------------------------------

    rag_context = retrieve_context(
        rag_question,
        k=10,
        jurisdiction=jurisdiction
    )

    # ---------------------------------------------------------
    # EXTRACT RULES
    # ---------------------------------------------------------

    rules = extract_rules(
        rag_context
    )

    commercial_controls = rules.get(
        "commercial_controls",
        {}
    )

    # ---------------------------------------------------------
    # SELECT COMMERCIAL SUBTYPE
    # ---------------------------------------------------------

    selected_commercial_control = None

    if commercial_subtype and commercial_controls:

        for use, control in commercial_controls.items():

            if use.lower() == commercial_subtype.lower():

                selected_commercial_control = {
                    "use": use,
                    **control
                }

                break

    # ---------------------------------------------------------
    # OTHER REGULATION VALUES
    # ---------------------------------------------------------

    height_limits = extract_height_limits(
        rag_context
    )

    far_values = rules.get(
        "far_values",
        []
    )

    # ---------------------------------------------------------
    # PROJECT SIZE
    # ---------------------------------------------------------

    if area < 5000:

        size = "Small"

    elif area < 25000:

        size = "Medium"

    else:

        size = "Large"

    # ---------------------------------------------------------
    # FAR-AWARE FLOOR CALCULATION
    # ---------------------------------------------------------

    far = None
    coverage = None
    maximum_height = None

    proposed_ground_coverage_percent = None

    if selected_commercial_control:

        # ---------------------------------------------
        # Read the selected Table 24 controls
        # ---------------------------------------------

        far = selected_commercial_control.get(
            "far"
        )

        coverage = selected_commercial_control.get(
            "ground_coverage_percent"
        )

        maximum_height = selected_commercial_control.get(
            "height_m"
        )

        # ---------------------------------------------
        # FAR-based permissible floor area
        # ---------------------------------------------

        if far is not None:

            permissible_floor_area = area * far

        else:

            permissible_floor_area = None

        # ---------------------------------------------
        # Height-based floor limit
        # ---------------------------------------------

        if maximum_height is not None:

            height_based_floors = floor(
                maximum_height / 3.5
            )

        else:

            height_based_floors = 10

        # ---------------------------------------------
        # Ground-coverage-based calculation
        # ---------------------------------------------

        if coverage:

            footprint = area * coverage / 100

            proposed_ground_coverage_percent = coverage

            if (
                permissible_floor_area is not None
                and footprint > 0
            ):

                coverage_based_floors = ceil(
                    permissible_floor_area / footprint
                )

            else:

                coverage_based_floors = 1

        else:

            proposed_ground_coverage_percent = None

            if far is not None:

                coverage_based_floors = ceil(
                    far
                )

            else:

                coverage_based_floors = 1

        # ---------------------------------------------
        # Final floor count
        # ---------------------------------------------

        floors = min(
            max(coverage_based_floors, 1),
            max(height_based_floors, 1),
        )

        # Proposed building height based on the selected
        # floor count and the planning floor-to-floor height.

        proposed_building_height_m = floors * 3.5

        # ---------------------------------------------
        # Estimated built-up area
        # ---------------------------------------------

        if permissible_floor_area is not None:

            estimated_builtup_area = min(
                permissible_floor_area,
                area * floors,
            )

        else:

            estimated_builtup_area = area * floors

    else:

        # -------------------------------------------------
        # Fallback when FAR isn't available.
        # -------------------------------------------------

        if area < 5000:

            floors = 2

        elif area < 25000:

            floors = 5

        else:

            floors = 10

        estimated_builtup_area = area * floors

        proposed_ground_coverage_percent = None

        # Same planning assumption used by the
        # FAR-aware calculation.

        proposed_building_height_m = floors * 3.5

    # ---------------------------------------------------------
    # BUILDING-SPECIFIC RECOMMENDATIONS
    # ---------------------------------------------------------

    recommendations = []
    parking = 0

    if building == "hospital":

        recommendations.extend([
            "Separate OPD and IPD Blocks",
            "Dedicated Emergency Entrance",
            "Ambulance Access Road",
            "Medical Gas Plant",
            "ICU Block",
            "Operation Theatre Wing",
        ])

        parking = ceil(
            area / 250
        )

    elif building == "school":

        recommendations.extend([
            "Playground",
            "Science Laboratories",
            "Library",
            "Bus Parking Area",
            "Assembly Ground",
        ])

        parking = ceil(
            area / 300
        )

    elif building == "mall":

        recommendations.extend([
            "Food Court",
            "Escalators",
            "Loading Dock",
            "Fire Escape Staircases",
            "Entertainment Zone",
        ])

        parking = ceil(
            area / 120
        )

    elif building == "residential":

        recommendations.extend([
            "Club House",
            "Children's Park",
            "Jogging Track",
            "Visitor Parking",
        ])

        parking = ceil(
            area / 180
        )

    else:

        # Commercial projects now use subtype-specific
        # recommendations.

        if (
            building == "commercial"
            and commercial_subtype
        ):

            recommendations.extend(
                get_commercial_recommendations(
                    commercial_subtype,
                    area,
                    budget,
                )
            )

        else:

            recommendations.append(
                "General Commercial Building"
            )

        parking = ceil(
            area / 200
        )

    # ---------------------------------------------------------
    # DEVELOPMENT SCALE
    # ---------------------------------------------------------

    if maximum_height:

        recommendations.append(
            f"Recommended development height within "
            f"the {maximum_height} m regulatory limit"
        )

    else:

        recommendations.append(
            f"Ground + {floors} Floors"
        )

    # Don't duplicate the floor statement if height
    # information already generated the recommendation.

    floor_statement = f"Ground + {floors} Floors"

    if floor_statement not in recommendations:

        recommendations.insert(
            0,
            floor_statement,
        )

    # ---------------------------------------------------------
    # SELECTED COMMERCIAL REGULATION
    # ---------------------------------------------------------

    if selected_commercial_control:

        control = selected_commercial_control

        far = control.get(
            "far"
        )

        coverage = control.get(
            "ground_coverage_percent"
        )

        height = control.get(
            "height_m"
        )

        if height is None:

            height_text = control.get(
                "height_limit",
                "No limit"
            )

        else:

            height_text = f"{height} m"

        recommendations.append(
            f"Selected commercial use: "
            f"{control['use']}"
        )

        recommendations.append(
            f"Applicable Table 24 controls: "
            f"FAR {far}, "
            f"ground coverage {coverage}%, "
            f"maximum height {height_text}"
        )

        if far is not None:

            recommendations.append(
                f"Maximum FAR-based floor area: "
                f"{area * far:,.2f} m²"
            )

    # ---------------------------------------------------------
    # COMMERCIAL CONTROLS FOUND
    # ---------------------------------------------------------

    if commercial_controls:

        recommendations.append(
            "Commercial development controls "
            "retrieved from Table 24."
        )

        if not selected_commercial_control:

            for use, control in commercial_controls.items():

                far_value = control.get(
                    "far"
                )

                coverage_value = control.get(
                    "ground_coverage_percent"
                )

                height_value = control.get(
                    "height_m"
                )

                if height_value is None:

                    height_text = control.get(
                        "height_limit",
                        "No limit"
                    )

                else:

                    height_text = f"{height_value} m"

                recommendations.append(
                    f"{use}: "
                    f"FAR {far_value}, "
                    f"ground coverage "
                    f"{coverage_value}%, "
                    f"maximum height "
                    f"{height_text}"
                )

    else:

        recommendations.append(
            "Commercial development controls "
            "were not found in the retrieved "
            "regulation context."
        )

    # ---------------------------------------------------------
    # FAR FALLBACK
    # ---------------------------------------------------------

    if not commercial_controls:

        if far_values:

            recommendations.append(
                "Numerical FAR values retrieved "
                "from regulations: "
                + ", ".join(
                    str(value)
                    for value in far_values
                )
            )

        else:

            recommendations.append(
                "Numerical permissible FAR was "
                "not found in the retrieved "
                "regulation context; further "
                "regulation lookup is required."
            )

    # ---------------------------------------------------------
    # HEIGHT INFORMATION
    # ---------------------------------------------------------

    if (
        height_limits
        and not selected_commercial_control
    ):

        recommendations.append(
            "Commercial height limits retrieved "
            "from the regulations: "
            + ", ".join(
                f"{height}m"
                for height in height_limits
            )
        )

    # ---------------------------------------------------------
    # SCORE
    # ---------------------------------------------------------

    score = 70

    if area > 50000:

        score += 10

    if budget >= 500000000:

        score += 10

    if building == "hospital":

        score += 5

    if selected_commercial_control:

        score += 5

    score = min(
        score,
        100
    )

    # ---------------------------------------------------------
    # DESIGN SPECIFICATION
    # ---------------------------------------------------------

    design_specification = build_design_specification(
        project=project,
        area=area,
        floors=floors,
        estimated_builtup_area=estimated_builtup_area,
        far=far,
        building_height_m=proposed_building_height_m,
        ground_coverage_percent=(
            proposed_ground_coverage_percent
        ),
        parking_capacity=parking,
        commercial_subtype=commercial_subtype,
        selected_commercial_control=(
            selected_commercial_control
        ),
    )

    # ---------------------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------------------

    return {

        "agent": "Architecture Agent",

        "score": score,

        "summary": (
            f"{size} "
            f"{building.title()} Development"
        ),

        "floors": floors,

        "parking_capacity": parking,

        "estimated_builtup_area": (
            estimated_builtup_area
        ),

        "proposed_far": far,

        "building_height_m": (
            proposed_building_height_m
        ),

        "proposed_ground_coverage_percent": (
            proposed_ground_coverage_percent
        ),

        "recommendations": recommendations,

        "regulation_context": rag_context,

        "regulation_rules": rules,

        "commercial_controls": commercial_controls,

        "selected_commercial_control": (
            selected_commercial_control
        ),

        "height_limits_from_regulations": (
            height_limits
        ),

        "far_values_from_regulations": (
            far_values
        ),

        "design_specification": design_specification,
    }