from math import ceil

from app.rag.retriever import retrieve_context
from app.rag.rule_extractor import extract_rules


def sustainability_agent(project: dict):

    jurisdiction = (
        project.get("jurisdiction")
        or project.get("state")
        or "Andhra Pradesh"
    )

    building = project["building_type"].lower().strip()
    commercial_subtype = (
        project.get("commercial_subtype") or ""
    ).strip()

    budget = project["budget"]
    area = project["area"]

    recommendations = []

    # ---------------------------------------------------------
    # REGULATION / RAG QUERY
    # ---------------------------------------------------------

    question = f"""
    {jurisdiction} building regulations and sustainability
    requirements for:

    Building Type:
    {building}

    Commercial Subtype:
    {commercial_subtype if commercial_subtype else "Not specified"}

    Plot Area:
    {area} square meters

    Find requirements relevant to:

    1. Rainwater harvesting
    2. Water recycling
    3. Solar energy / solar water heating
    4. Green/open space requirements
    5. Landscaping
    6. Storm water management
    7. Waste management
    8. Environmental sustainability provisions
    9. Energy efficiency
    10. Any requirements specifically applicable
        to this building type or commercial use.

    Prioritize explicit regulatory requirements,
    numerical requirements, and applicability conditions.

    Do not invent numerical requirements when the
    regulations do not specify them.
    """

    rag_context = retrieve_context(
        question,
        k=8,
        jurisdiction=jurisdiction,
    )

    rules = extract_rules(rag_context)

    # ---------------------------------------------------------
    # BASE SUSTAINABILITY PARAMETERS
    # ---------------------------------------------------------

    # These are planning estimates, not regulatory limits.
    solar_capacity = round(area * 0.08, 2)

    green_percentage = 20

    if area >= 10000:
        green_percentage = 30

    if area >= 50000:
        green_percentage = 35

    rainwater_harvesting = True

    ev_chargers = max(
        2,
        ceil(area / 10000),
    )

    # ---------------------------------------------------------
    # REGULATION-BASED RECOMMENDATIONS
    # ---------------------------------------------------------

    context_lower = rag_context.lower()

    if (
        "rain water harvesting" in context_lower
        or "rainwater harvesting" in context_lower
    ):
        recommendations.append(
            "Provide rainwater harvesting structures "
            "as required by applicable regulations"
        )

    if (
        "water recycling" in context_lower
        or "recycling of water" in context_lower
    ):
        recommendations.append(
            "Provide water recycling facilities "
            "where applicable"
        )

    if (
        "solar water heating" in context_lower
        or "solar lighting" in context_lower
    ):
        recommendations.append(
            "Provide applicable solar water heating "
            "and solar lighting systems"
        )

    if (
        "storm water" in context_lower
        or "stormwater" in context_lower
    ):
        recommendations.append(
            "Provide an appropriate storm-water "
            "management system"
        )

    if (
        "landscaping" in context_lower
        or "greenery" in context_lower
    ):
        recommendations.append(
            "Provide landscaping and organized "
            "green/open-space areas where applicable"
        )

    # ---------------------------------------------------------
    # BUILDING-SPECIFIC RECOMMENDATIONS
    # ---------------------------------------------------------

    if building == "hospital":

        recommendations.extend([
            "Medical waste segregation",
            "Greywater recycling system",
            "Energy-efficient hospital lighting",
            "Natural daylight and ventilation planning",
            "Water-efficient sanitary fixtures",
        ])

    elif building == "school":

        recommendations.extend([
            "Solar-powered common facilities",
            "Tree plantation and landscaping",
            "Rainwater harvesting",
            "Waste segregation and recycling",
            "Natural daylight and ventilation",
        ])

    elif building == "mall":

        recommendations.extend([
            "Rooftop solar installation",
            "Energy-efficient LED lighting",
            "Electric vehicle charging facilities",
            "Rainwater harvesting",
            "Waste segregation and recycling",
            "Energy-efficient HVAC planning",
        ])

    elif building == "residential":

        recommendations.extend([
            "Rooftop solar installation",
            "Rainwater harvesting",
            "Water-efficient fixtures",
            "Waste segregation",
            "Landscaped open spaces",
        ])

    elif building == "commercial":

        # -----------------------------------------------------
        # COMMERCIAL SUBTYPE
        # -----------------------------------------------------

        subtype = commercial_subtype.lower()

        if "sector shopping" in subtype:

            recommendations.extend([
                "Rooftop solar installation",
                "Energy-efficient lighting",
                "Rainwater harvesting",
                "Waste segregation",
                "Electric vehicle charging facilities",
                "Landscaped pedestrian areas",
            ])

        elif "sub-district" in subtype:

            recommendations.extend([
                "Rooftop solar installation",
                "Energy-efficient lighting",
                "Rainwater harvesting",
                "Water recycling",
                "Waste management system",
                "Electric vehicle charging facilities",
                "Landscaped public areas",
            ])

        elif (
            "central business district" in subtype
            or subtype == "cbd"
        ):

            recommendations.extend([
                "Large-scale rooftop solar feasibility",
                "Smart energy monitoring",
                "Rainwater harvesting",
                "Water recycling",
                "Electric vehicle charging facilities",
                "Green public spaces",
            ])

        elif "hotel" in subtype:

            recommendations.extend([
                "Solar water heating",
                "Rooftop solar installation",
                "Greywater recycling",
                "Water-efficient fixtures",
                "Food and organic waste management",
                "Energy-efficient HVAC systems",
            ])

        elif "bank" in subtype:

            recommendations.extend([
                "Rooftop solar installation",
                "Energy-efficient lighting",
                "Smart energy monitoring",
                "Rainwater harvesting",
                "Electric vehicle charging facilities",
            ])

        elif (
            "cinema" in subtype
            or "multiplex" in subtype
        ):

            recommendations.extend([
                "Energy-efficient lighting",
                "Energy-efficient HVAC systems",
                "Rooftop solar feasibility",
                "Rainwater harvesting",
                "Waste segregation",
                "Electric vehicle charging facilities",
            ])

        elif (
            "informal" in subtype
            or "bazaar" in subtype
            or "market" in subtype
        ):

            recommendations.extend([
                "Waste segregation",
                "Rainwater harvesting",
                "Water-efficient sanitation",
                "Covered pedestrian areas",
                "Landscaping and greenery",
            ])

        elif (
            "warehouse" in subtype
            or "godown" in subtype
        ):

            recommendations.extend([
                "Rooftop solar installation",
                "Energy-efficient lighting",
                "Rainwater harvesting",
                "Storm-water management",
                "Waste segregation",
                "Electric vehicle charging facilities",
            ])

        else:

            recommendations.extend([
                "Solar power system",
                "Rainwater harvesting",
                "Energy-efficient lighting",
                "Waste segregation",
                "Landscaping",
            ])

    else:

        recommendations.extend([
            "Solar power system",
            "Rainwater harvesting",
            "Energy-efficient lighting",
            "Waste segregation",
        ])

    # ---------------------------------------------------------
    # BUDGET-BASED FEATURES
    # ---------------------------------------------------------

    if budget >= 100000000:

        recommendations.extend([
            "Solar Power System",
            "Rainwater Harvesting Infrastructure",
            "Energy-efficient lighting system",
        ])

    if budget >= 300000000:

        recommendations.extend([
            "Smart Energy Monitoring",
            "IoT Water Monitoring",
            "Water Recycling System",
        ])

    if (
        budget >= 500000000
        and area >= 10000
    ):

        recommendations.append(
            "Green Roof or Rooftop Green Space"
        )

    # ---------------------------------------------------------
    # REMOVE DUPLICATES
    # ---------------------------------------------------------

    recommendations = list(
        dict.fromkeys(recommendations)
    )

    # ---------------------------------------------------------
    # SUSTAINABILITY SCORE
    # ---------------------------------------------------------

    score = 70

    # Regulation context successfully retrieved.
    if (
        rag_context
        and "No relevant regulations were found."
        not in rag_context
    ):
        score += 10

    # Specific commercial subtype.
    if (
        building == "commercial"
        and commercial_subtype
    ):
        score += 5

    # Larger projects have more opportunity
    # for sustainability infrastructure.
    if area >= 10000:
        score += 5

    if area >= 50000:
        score += 5

    # Budget enables additional systems.
    if budget >= 500000000:
        score += 5

    score = min(score, 100)

    # ---------------------------------------------------------
    # RETURN
    # ---------------------------------------------------------

    return {

        "agent": "Sustainability Agent",

        "score": score,

        "summary": (
            "Environmental Sustainability Analysis"
        ),

        "solar_capacity_kw": solar_capacity,

        "green_area_percentage": green_percentage,

        "rainwater_harvesting": rainwater_harvesting,

        "ev_charging_stations": ev_chargers,

        "commercial_subtype": (
            commercial_subtype
            if commercial_subtype
            else None
        ),

        "recommendations": recommendations,

        "regulation_context": rag_context,

        "regulation_rules": rules,

    }