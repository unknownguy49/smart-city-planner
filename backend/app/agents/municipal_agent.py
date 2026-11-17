from typing import Dict, Any

from app.rag.retriever import retrieve_context
from app.rag.rule_extractor import extract_rules


def municipal_agent(project: dict) -> Dict[str, Any]:
    jurisdiction = (
        project.get("jurisdiction")
        or project.get("state")
        or "Andhra Pradesh"
    )
    # ---------------------------------------------------------
    # PROJECT INFORMATION
    # ---------------------------------------------------------

    building = str(
        project.get("building_type", "")
    ).strip().lower()

    commercial_subtype = str(
        project.get("commercial_subtype", "")
    ).strip()

    area = float(
        project.get("area", 0) or 0
    )

    budget = float(
        project.get("budget", 0) or 0
    )

    # ---------------------------------------------------------
    # MAIN REGULATION QUERY
    # ---------------------------------------------------------

    question = f"""
    {jurisdiction} building and development regulations
    for a {building} project.

    Project information:
    - Building type: {building}
    - Commercial subtype: {commercial_subtype}
    - Plot area: {area} square metres

    Find applicable regulations regarding:
    1. Development controls
    2. FAR / FSI
    3. Ground coverage
    4. Maximum building height
    5. Setbacks
    6. Parking requirements
    7. Road access and road width
    8. Green/open areas
    9. Rainwater harvesting
    10. Water conservation
    11. Groundwater recharge
    12. Drainage
    13. Fire and safety
    14. Accessibility
    15. Sustainability requirements

    Prefer provisions specifically applicable to the
    project building type and commercial subtype.

    Return only provisions supported by the
    {jurisdiction} regulations.
    """

    # ---------------------------------------------------------
    # MAIN RAG RETRIEVAL
    # ---------------------------------------------------------

    context = retrieve_context(
        question,
        k=10,
        jurisdiction=jurisdiction
    )

    # ---------------------------------------------------------
    # TARGETED RAINWATER RETRIEVAL
    #
    # The general municipal query may not reliably retrieve
    # the dedicated rainwater-harvesting table.
    # Therefore, perform a second targeted RAG query.
    # ---------------------------------------------------------

    rainwater_question = f"""
    {jurisdiction} building regulations:

    Commercial/Mixed Use rainwater harvesting requirements.

    Find the provisions for:

    - rainwater harvesting structure
    - plot size applicability
    - soft landscape
    - open spaces
    - percolation pits
    - storm water drainage
    - recharging well
    - storage and reuse
    - recharge bore requirements
    - groundwater recharge

    Give priority to:
    - Table 35
    - Annex AI
    - Sustainability chapter
    - Environmental conditions
    - provisions specifically applicable to
      Commercial/Mixed Use buildings

    Return only provisions supported by the
    {jurisdiction} regulations.
    """

    rainwater_context = retrieve_context(
        rainwater_question,
        k=10,
        jurisdiction=jurisdiction
    )

    # ---------------------------------------------------------
    # ADD TARGETED RAINWATER REGULATIONS
    # ---------------------------------------------------------

    if (
        rainwater_context
        and "No relevant regulations were found."
        not in rainwater_context
    ):
        context = (
            context
            + "\n\n"
            + "==================================================\n"
            + "RAINWATER HARVESTING REGULATIONS\n"
            + "==================================================\n"
            + rainwater_context
        )

    # ---------------------------------------------------------
    # STRUCTURED RULE EXTRACTION
    # ---------------------------------------------------------

    rules = extract_rules(context)

    # ---------------------------------------------------------
    # RECOMMENDATIONS
    # ---------------------------------------------------------

    recommendations = []

    context_lower = context.lower()

    # ---------------------------------------------------------
    # GENERAL REGULATORY RECOMMENDATIONS
    # ---------------------------------------------------------

    if "parking" in context_lower:
        recommendations.append(
            f"Provide parking according to the applicable "
            f"{jurisdiction} regulatory requirements."
        )

    if "setback" in context_lower:
        recommendations.append(
            f"Maintain the applicable building setbacks "
            f"specified by the {jurisdiction} regulations."
        )

    if "road width" in context_lower or "road" in context_lower:
        recommendations.append(
            "Verify road access and minimum road-width "
            "requirements before final approval."
        )

    if (
        "fire" in context_lower
        or "fire safety" in context_lower
    ):
        recommendations.append(
            "Provide required fire-safety provisions "
            "and obtain applicable fire clearances."
        )

    if (
        "accessibility" in context_lower
        or "differently abled" in context_lower
    ):
        recommendations.append(
            "Provide accessibility facilities for "
            "differently abled persons, elderly persons "
            "and children where applicable."
        )

    # ---------------------------------------------------------
    # RAINWATER HARVESTING
    # ---------------------------------------------------------

    if (
        "rainwater harvesting regulations"
        in context_lower
        or "rainwater harvesting" in context_lower
        or "rain water harvesting" in context_lower
    ):
        recommendations.append(
            f"Provide a rainwater harvesting structure "
            f"as required by the applicable {jurisdiction} "
            f"regulations."
        )

        recommendations.append(
            "Provide appropriate soft landscape and "
            "percolation-pit provisions for the site."
        )

        recommendations.append(
            "Indicate the storm-water drainage, rainwater "
            "harvesting structure and recharging-well system "
            "in the development plan."
        )

        recommendations.append(
            "Give emphasis to rainwater storage and reuse."
        )

    else:
        recommendations.append(
            "Provide rainwater harvesting structures "
            "where applicable."
        )

    # ---------------------------------------------------------
    # WATER CONSERVATION
    # ---------------------------------------------------------

    if (
        "water conservation" in context_lower
        or "water conservation" in str(rules).lower()
    ):
        recommendations.append(
            "Include water-conservation and groundwater "
            "recharge measures where applicable."
        )

    # ---------------------------------------------------------
    # SOLAR / ENERGY
    # ---------------------------------------------------------

    if (
        "solar" in context_lower
        or "renewable energy" in context_lower
    ):
        recommendations.append(
            "Consider applicable solar-energy and "
            "renewable-energy provisions."
        )

    # ---------------------------------------------------------
    # BUDGET-BASED RECOMMENDATIONS
    # ---------------------------------------------------------

    if budget >= 500000000:

        recommendations.extend([
            "Smart Building Automation",
            "Green Roof",
            "Building Management System (BMS)",
        ])

    elif budget >= 100000000:

        recommendations.extend([
            "Solar Power System",
            "Rainwater Harvesting",
        ])

    # ---------------------------------------------------------
    # COMMERCIAL SUBTYPE
    # ---------------------------------------------------------

    if commercial_subtype:

        recommendations.append(
            f"Apply development controls specifically "
            f"applicable to the '{commercial_subtype}' "
            f"commercial use."
        )

    # ---------------------------------------------------------
    # SCORE
    # ---------------------------------------------------------

    score = 60

    # Regulation retrieval succeeded
    if (
        context
        and "No relevant regulations were found."
        not in context
    ):
        score += 15

    # Setbacks retrieved
    if rules.get("setbacks"):
        score += 5

    # Parking rules retrieved
    if rules.get("parking"):
        score += 5

    # Road-width rules retrieved
    if rules.get("road_width"):
        score += 5

    # Green-area rules retrieved
    if rules.get("green_area"):
        score += 5

    # Commercial subtype available
    if commercial_subtype:
        score += 5

    score = min(score, 100)

    # ---------------------------------------------------------
    # STATUS
    # ---------------------------------------------------------

    status = "success"

    # ---------------------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------------------

    return {
        "agent": "Municipal Agent",
        "score": score,
        "status": status,
        "jurisdiction": jurisdiction,
        "summary": "Municipal Regulatory and Compliance Analysis",
        "building_type": building,
        "commercial_subtype": commercial_subtype,
        "plot_area": area,
        "budget": budget,
        "recommendations": recommendations,
        "regulation_context": context,
        "regulation_rules": rules,
    }