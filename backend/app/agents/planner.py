from typing import Any, Dict, List

from app.agents.architecture_agent import architecture_agent
from app.agents.civil_agent import civil_agent
from app.agents.sustainability_agent import sustainability_agent
from app.agents.municipal_agent import municipal_agent
from app.agents.citizen_agent import analyze_places
from app.services.constraint_engine import ConstraintEngine
from app.services.site_context_service import site_context_builder
from app.services.scoring_engine import ScoringEngine
from app.services.scoring_engine import ScoringEngine
from app.services.recommendation_service import (
    recommendation_service,
)
from app.services.site_suitability_service import (
    site_suitability_service,
)
from app.services.design_service import design_service


# ============================================================
# HELPERS
# ============================================================

def _normalize_facility_list(value: Any) -> List[Dict[str, Any]]:
    """
    Convert different OSM/GeoJSON response shapes into a
    simple list that CitizenAgent can safely consume.

    Supported examples:

        []
        [{...}, {...}]

        {
            "features": [{...}, {...}]
        }

        {
            "results": [{...}, {...}]
        }

        None
    """

    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, dict):

        # GeoJSON-style response
        features = value.get("features")

        if isinstance(features, list):
            return features

        # Generic API response
        results = value.get("results")

        if isinstance(results, list):
            return results

        # Some services return elements
        elements = value.get("elements")

        if isinstance(elements, list):
            return elements

    return []


def _normalize_nearby_infrastructure(
    site_context: Dict[str, Any],
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Normalize nearby infrastructure from SiteContextBuilder.

    CitizenAgent expects simple lists for each facility type.
    """

    nearby = site_context.get(
        "nearby_infrastructure",
        {},
    )

    osm = site_context.get(
        "osm",
        {},
    )

    if not isinstance(nearby, dict):
        nearby = {}

    if not isinstance(osm, dict):
        osm = {}

    # --------------------------------------------------------
    # Facility names expected by CitizenAgent
    # --------------------------------------------------------

    facility_keys = [
        "parks",
        "hospitals",
        "schools",
        "colleges",
        "bus_stops",
        "police",
        "fire_stations",
    ]

    normalized: Dict[str, List[Dict[str, Any]]] = {}

    for key in facility_keys:

        value = nearby.get(key)

        # Fallback to OSM data when nearby_infrastructure
        # does not contain the facility.
        if value is None:
            value = osm.get(key)

        normalized[key] = _normalize_facility_list(
            value
        )

    return normalized


# ============================================================
# PLANNER SYNTHESIS
# ============================================================

def build_planning_decision(
    project,
    architecture_result,
    civil_result,
    sustainability_result,
    municipal_result,
    citizen_result,
):
    """
    Converts the individual agent analyses into a single
    high-level planning decision.

    This is intentionally rule-based for now.
    LLM-based planning synthesis can be added later.
    """

    recommendations = []
    priorities = []
    risks = []
    strengths = []

    # ---------------------------------------------------------
    # AGENT SCORES
    # ---------------------------------------------------------

    architecture_score = architecture_result.get(
        "score",
        0,
    )

    civil_score = civil_result.get(
        "score",
        0,
    )

    sustainability_score = sustainability_result.get(
        "score",
        0,
    )

    municipal_score = municipal_result.get(
        "score",
        0,
    )

    citizen_score = citizen_result.get(
        "score",
        0,
    )

    # ---------------------------------------------------------
    # ARCHITECTURE
    # ---------------------------------------------------------

    if architecture_score >= 80:

        strengths.append(
            "The proposed development is architecturally "
            "feasible based on the available planning controls."
        )

    else:

        risks.append(
            "Architectural feasibility requires further "
            "review of development controls."
        )

        priorities.append(
            "Verify detailed architectural controls including "
            "FAR, ground coverage, height and setbacks."
        )

    for recommendation in architecture_result.get(
        "recommendations",
        [],
    ):

        if recommendation not in recommendations:
            recommendations.append(
                recommendation
            )

    # ---------------------------------------------------------
    # CIVIL
    # ---------------------------------------------------------

    if civil_score < 80:

        risks.append(
            "Civil infrastructure requires additional "
            "verification before development."
        )

        priorities.append(
            "Verify road access, parking, setbacks, "
            "and site infrastructure."
        )

    else:

        strengths.append(
            "Civil infrastructure requirements are "
            "generally satisfactory based on the current analysis."
        )

    for recommendation in civil_result.get(
        "recommendations",
        [],
    ):

        if recommendation not in recommendations:
            recommendations.append(
                recommendation
            )

    # ---------------------------------------------------------
    # SUSTAINABILITY
    # ---------------------------------------------------------

    if sustainability_score < 80:

        priorities.append(
            "Improve sustainability measures including "
            "green space, rainwater management, and energy efficiency."
        )

    else:

        strengths.append(
            "The project has a good preliminary sustainability profile."
        )

    for recommendation in sustainability_result.get(
        "recommendations",
        [],
    ):

        if recommendation not in recommendations:
            recommendations.append(
                recommendation
            )

    # ---------------------------------------------------------
    # MUNICIPAL
    # ---------------------------------------------------------

    if municipal_score < 80:

        risks.append(
            "Municipal approval requirements need "
            "additional verification."
        )

        priorities.append(
            "Verify statutory approvals, fire safety, "
            "setbacks, parking and occupancy requirements."
        )

    else:

        strengths.append(
            "The project aligns well with the municipal "
            "requirements identified by the regulation retrieval."
        )

    for recommendation in municipal_result.get(
        "recommendations",
        [],
    ):

        if recommendation not in recommendations:
            recommendations.append(
                recommendation
            )

    # ---------------------------------------------------------
    # CITIZEN
    # ---------------------------------------------------------

    if citizen_score < 80:

        risks.append(
            "Citizen accessibility and nearby public "
            "infrastructure require further consideration."
        )

        priorities.append(
            "Review access to parks, healthcare, education, "
            "public transport and emergency services."
        )

    else:

        strengths.append(
            "The site has a generally favorable preliminary "
            "citizen-accessibility profile."
        )

    for recommendation in citizen_result.get(
        "recommendations",
        [],
    ):

        if recommendation not in recommendations:
            recommendations.append(
                recommendation
            )

    # ---------------------------------------------------------
    # RISK LEVELS
    # ---------------------------------------------------------

    risk_levels = {

        "architecture":
            "low"
            if architecture_score >= 80
            else "medium",

        "civil":
            "low"
            if civil_score >= 80
            else "medium",

        "sustainability":
            "low"
            if sustainability_score >= 80
            else "medium",

        "municipal":
            "low"
            if municipal_score >= 80
            else "medium",

        "citizen":
            "low"
            if citizen_score >= 80
            else "medium",
    }

    # ---------------------------------------------------------
    # OVERALL SCORE
    # ---------------------------------------------------------

    overall_score = round(
        (
            architecture_score
            + civil_score
            + sustainability_score
            + municipal_score
            + citizen_score
        ) / 5,
        2,
    )

    # ---------------------------------------------------------
    # FINAL STATUS
    # ---------------------------------------------------------

    if overall_score >= 85:

        status = "Recommended"

        decision = (
            "The project has a strong preliminary planning "
            "profile based on the available analysis."
        )

    elif overall_score >= 70:

        status = "Recommended with conditions"

        decision = (
            "The project is potentially feasible but requires "
            "additional verification of identified planning "
            "conditions."
        )

    elif overall_score >= 50:

        status = "Requires review"

        decision = (
            "The project requires additional site, regulatory "
            "and infrastructure review before proceeding."
        )

    else:

        status = "Not recommended"

        decision = (
            "The current analysis identifies substantial "
            "planning concerns requiring resolution."
        )

    # ---------------------------------------------------------
    # PROJECT TYPE
    # ---------------------------------------------------------

    building_type = project.get(
        "building_type"
    )

    commercial_subtype = project.get(
        "commercial_subtype"
    )

    if commercial_subtype:

        development_type = (
            f"{commercial_subtype} commercial development"
        )

    elif building_type:

        development_type = (
            f"{building_type} development"
        )

    else:

        development_type = (
            "proposed development"
        )

    # ---------------------------------------------------------
    # FINAL DECISION
    # ---------------------------------------------------------

    return {

        "development_type":
            development_type,

        "status":
            status,

        "overall_score":
            overall_score,

        "risk_levels":
            risk_levels,

        "recommendation":
            decision,

        "strengths":
            strengths,

        "priority_actions":
            priorities,

        "risks":
            risks,

        "recommendations":
            recommendations,
    }


# ============================================================
# MAIN PLANNER
# ============================================================

def run_agents(project: dict):

    # ---------------------------------------------------------
    # BUILD SITE CONTEXT
    # ---------------------------------------------------------

    site_context = site_context_builder.build(
        project
    )

    site_suitability = site_suitability_service.evaluate(
        project=project,
        site_context=site_context,
    )

    # ---------------------------------------------------------
    # OSM / SITE DATA
    # ---------------------------------------------------------

    places = _normalize_nearby_infrastructure(
        site_context
    )

    osm_data = site_context.get(
        "osm",
        {},
    )

    if not isinstance(osm_data, dict):
        osm_data = {}

    osm_status = osm_data.get(
        "status",
        "unknown",
    )

    osm_error = osm_data.get(
        "error"
    )

    # ---------------------------------------------------------
    # REAL POLYGON AREA
    # ---------------------------------------------------------

    project_area = project.get(
        "area",
        0,
    )

    if project_area <= 0:

        raise ValueError(
            "Project area must be greater than zero."
        )

    # ---------------------------------------------------------
    # RUN ARCHITECTURE AGENT
    # ---------------------------------------------------------

    architecture_result = architecture_agent(
        project,
        project_area,
    )

    # ---------------------------------------------------------
    # NORMALIZE DESIGN SPECIFICATION WITH SITE DATA
    # ---------------------------------------------------------

    architecture_result = dict(
        architecture_result
    )

    normalized_design = design_service.generate_design(
        project=project,
        architecture_result=architecture_result,
        site_context=site_context,
        site_suitability=site_suitability,
    )

    architecture_result["design_specification"] = (
        normalized_design["design_specification"]
    )

    # ---------------------------------------------------------
    # RUN CIVIL AGENT
    # ---------------------------------------------------------

    civil_result = civil_agent(
        project,
        project_area,
    )

    # ---------------------------------------------------------
    # RUN SUSTAINABILITY AGENT
    # ---------------------------------------------------------

    sustainability_result = sustainability_agent(
        project
    )

    # ---------------------------------------------------------
    # RUN MUNICIPAL AGENT
    # ---------------------------------------------------------

    municipal_result = municipal_agent(
        project
    )

    # ---------------------------------------------------------
    # RUN CITIZEN AGENT
    # ---------------------------------------------------------

    citizen_result = analyze_places(
        places,
    )

    # ---------------------------------------------------------
    # CONSTRAINT EVALUATION
    # ---------------------------------------------------------

    constraint_engine = ConstraintEngine()

    constraint_result = constraint_engine.evaluate(
        project=project,
        architecture=architecture_result,
        civil=civil_result,
        sustainability=sustainability_result,
        municipal=municipal_result,
    )

    # ---------------------------------------------------------
    # OSM DATA QUALITY INFORMATION
    # ---------------------------------------------------------

    citizen_result["osm_status"] = osm_status

    if osm_error:
        citizen_result["osm_error"] = osm_error

    citizen_result["data_quality"] = {
        key: len(value)
        for key, value in places.items()
    }

    # ---------------------------------------------------------
    # AGENT SCORES
    # ---------------------------------------------------------

    agent_scores = {

        "architecture":
            architecture_result.get(
                "score",
                0,
            ),

        "civil":
            civil_result.get(
                "score",
                0,
            ),

        "sustainability":
            sustainability_result.get(
                "score",
                0,
            ),

        "municipal":
            municipal_result.get(
                "score",
                0,
            ),

        "citizen":
            citizen_result.get(
                "score",
                0,
            ),
    }

    # ---------------------------------------------------------
    # OVERALL SCORE
    # ---------------------------------------------------------

    overall_score = round(
        sum(
            agent_scores.values()
        )
        / len(agent_scores),
        2,
    )

    # ---------------------------------------------------------
    # BUILD SYNTHESIZED PLANNING DECISION
    # ---------------------------------------------------------

    planning_decision = build_planning_decision(

        project=project,

        architecture_result=
            architecture_result,

        civil_result=
            civil_result,

        sustainability_result=
            sustainability_result,

        municipal_result=
            municipal_result,

        citizen_result=
            citizen_result,
    )

    # ---------------------------------------------------------
    # SCORING ENGINE
    # ---------------------------------------------------------

    scoring_engine = ScoringEngine()

    scoring_result = scoring_engine.calculate(

        architecture=
            architecture_result,

        civil=
            civil_result,

        sustainability=
            sustainability_result,

        municipal=
            municipal_result,

        citizen=
            citizen_result,
    )

    # ---------------------------------------------------------
    # RECOMMENDATION ENGINE
    # ---------------------------------------------------------

    recommendation_result = (
        recommendation_service.generate(
            project=project,

            architecture=
                architecture_result,

            civil=
                civil_result,

            sustainability=
                sustainability_result,

            municipal=
                municipal_result,

            citizen=
                citizen_result,

            scoring=
                scoring_result,

            planning_decision=
                planning_decision,
        )
    )

    # ---------------------------------------------------------
    # PROJECT SUMMARY
    # ---------------------------------------------------------

    project_summary = {

        "project_name":
            project.get(
                "project_name"
            ),

        "building_type":
            project.get(
                "building_type"
            ),

        "commercial_subtype":
            project.get(
                "commercial_subtype"
            ),

        "city":
            project.get(
                "city"
            ),

        "state":
            project.get(
                "state"
            ),

        "jurisdiction":
            project.get(
                "jurisdiction"
            ),

        "area":
            project_area,
    }

    # ---------------------------------------------------------
    # RETURN
    # ---------------------------------------------------------

    return {

        "overall_score":
            overall_score,

        "agent_scores":
            agent_scores,

        "planning_decision":
            planning_decision,

        "project":
            project,

        "project_summary":
            project_summary,

        "site_context": site_context,

        "site_suitability": site_suitability,

        "osm":
            site_context.get(
                "osm",
                {},
            ),

        "architecture":
            architecture_result,

        "civil":
            civil_result,

        "sustainability":
            sustainability_result,

        "municipal":
            municipal_result,

        "citizen":
            citizen_result,

        "scoring":
            scoring_result,

        "constraints": constraint_result,

        "recommendations":
            recommendation_result,
    }