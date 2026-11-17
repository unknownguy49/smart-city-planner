
from math import ceil

from app.rag.retriever import retrieve_context
from app.rag.rule_extractor import extract_rules


def civil_agent(project: dict, area: float):
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

    # BASIC CIVIL PARAMETERS
    # These road widths are planning assumptions based on plot
    # area, not measurements of the actual public road.
    road_width = 12
    parking = 0
    drainage = "Standard"
    foundation = "RCC Footing"

    recommendations = []

    # REGULATION / RAG QUERY
    question = f"""
    {jurisdiction} building regulations for civil
    infrastructure requirements.

    Building Type:
    {building}

    Commercial Subtype:
    {commercial_subtype if commercial_subtype else "Not specified"}

    Plot Area:
    {area} square meters

    Find requirements specifically relevant to:

    1. Minimum road width / access road
    2. Fire engine access
    3. Site access requirements
    4. Front, side and rear setbacks
    5. Footpath requirements
    6. Parking requirements
    7. Ground coverage
    8. Drainage / storm water provisions
    9. Any civil infrastructure requirements
       relevant to this development.

    Prioritize explicit numerical regulatory
    requirements and applicable tables.
    """

    rag_context = retrieve_context(
        question,
        k=8,
        jurisdiction=jurisdiction,
    )

    rules = extract_rules(rag_context)

    # SITE SIZE-BASED INFRASTRUCTURE
    if area > 50000:
        road_width = 24
        drainage = "Storm Water Drainage"
        foundation = (
            "Foundation design requires "
            "geotechnical investigation"
        )

        recommendations.extend([
            "Dedicated internal circulation road",
            "Storm water drainage network",
            "Fire engine access route",
            "Service vehicle circulation",
            "Emergency access corridor",
        ])

    elif area > 10000:
        road_width = 18
        drainage = "Covered Drainage"
        foundation = (
            "Foundation design requires "
            "soil investigation"
        )

        recommendations.extend([
            "Internal circulation road",
            "Covered drainage system",
            "Fire engine access",
            "Service vehicle access",
        ])

    else:
        recommendations.extend([
            "Proper site drainage",
            "Fire engine access",
            "Service vehicle access",
        ])

    # BUILDING-SPECIFIC CIVIL REQUIREMENTS
    if building == "hospital":
        parking = ceil(area / 250)

        recommendations.extend([
            "Emergency Vehicle Lane",
            "Ambulance Parking",
            "Medical Waste Drainage",
            "Separate Service Road",
        ])

    elif building == "school":
        parking = ceil(area / 300)

        recommendations.extend([
            "Bus Parking",
            "Dedicated Drop-off Zone",
            "Pedestrian Safety Zone",
            "Playground Drainage",
        ])

    elif building == "mall":
        parking = ceil(area / 120)

        recommendations.extend([
            "Multi-Level Parking",
            "Loading Dock",
            "Delivery Access Road",
            "Fire Engine Access",
            "Pedestrian Circulation",
        ])

    elif building == "residential":
        parking = ceil(area / 180)

        recommendations.extend([
            "Resident Parking",
            "Visitor Parking",
            "Pedestrian Circulation",
            "Internal Drainage",
        ])

    elif building == "commercial":
        # COMMERCIAL SUBTYPE
        if "sector shopping" in commercial_subtype.lower():
            recommendations.extend([
                "Dedicated Customer Parking",
                "Service and Loading Area",
                "Central Pedestrian Circulation",
                "Fire Engine Access",
                "Accessible Pedestrian Entrance",
                "Waste Management Area",
            ])

        elif "sub-district" in commercial_subtype.lower():
            recommendations.extend([
                "Dedicated Customer Parking",
                "Service and Loading Dock",
                "Pedestrian Plaza",
                "Fire and Emergency Access",
                "Public Transport Integration",
                "Waste Management Facility",
            ])

        elif (
            "central business district"
            in commercial_subtype.lower()
            or commercial_subtype.lower() == "cbd"
        ):
            recommendations.extend([
                "High-Capacity Parking",
                "Pedestrian Plaza",
                "Public Transport Integration",
                "Dedicated Service Access",
                "Fire and Emergency Access",
                "Universal Accessibility",
            ])

        elif "hotel" in commercial_subtype.lower():
            recommendations.extend([
                "Dedicated Hotel Entrance",
                "Guest Parking",
                "Service Entrance",
                "Fire and Emergency Access",
                "Service Vehicle Circulation",
            ])

        elif "bank" in commercial_subtype.lower():
            recommendations.extend([
                "Customer Parking",
                "Secure Service Access",
                "Emergency Access",
                "Accessible Entrance",
            ])

        elif (
            "cinema" in commercial_subtype.lower()
            or "multiplex" in commercial_subtype.lower()
        ):
            recommendations.extend([
                "Multiple Emergency Exits",
                "Fire-Safe Evacuation Routes",
                "Customer Parking",
                "Dedicated Entrance and Exit",
                "Service and Loading Area",
            ])

        elif (
            "informal" in commercial_subtype.lower()
            or "bazaar" in commercial_subtype.lower()
            or "market" in commercial_subtype.lower()
        ):
            recommendations.extend([
                "Pedestrian-First Circulation",
                "Vendor Service Areas",
                "Sanitation Facilities",
                "Waste Collection Points",
                "Emergency Access Corridor",
            ])

        elif (
            "warehouse" in commercial_subtype.lower()
            or "godown" in commercial_subtype.lower()
        ):
            recommendations.extend([
                "Dedicated Loading and Unloading Area",
                "Truck Circulation Route",
                "Service Entrance",
                "Fire Engine Access",
                "Goods Storage Zone",
                "Emergency Access",
            ])

        else:
            recommendations.extend([
                "Customer Parking",
                "Service and Loading Area",
                "Fire and Emergency Access",
                "Pedestrian Circulation",
                "Waste Management Area",
            ])

        # Generic commercial parking fallback.
        parking = ceil(area / 200)

    else:
        parking = ceil(area / 200)

        recommendations.append(
            "Provide adequate site circulation "
            "and emergency access"
        )

    # REGULATION-SUPPORTED SITE ACCESS
    recommendations.append(
        "Verify that the site has compliant "
        "public-road access before construction"
    )

    recommendations.append(
        "Provide pedestrian circulation and "
        "footpath access where required"
    )

    # BUDGET-BASED CIVIL IMPROVEMENTS
    if budget >= 100000000:
        recommendations.extend([
            "Rainwater Harvesting Infrastructure",
            "Improved Storm Water Management",
        ])

    if budget >= 300000000:
        recommendations.extend([
            "Smart Water Management",
            "Advanced Drainage Monitoring",
        ])

    # REMOVE DUPLICATE RECOMMENDATIONS
    recommendations = list(dict.fromkeys(recommendations))

    # SCORE
    score = 70

    if (
        rag_context
        and "No relevant regulations were found."
        not in rag_context
    ):
        score += 10

    if building == "commercial" and commercial_subtype:
        score += 5

    if area > 10000:
        score += 5

    if area > 50000:
        score += 5

    if budget >= 500000000:
        score += 5

    score = min(score, 100)

    # RETURN
    return {
        "agent": "Civil Agent",
        "score": score,
        "summary": "Civil Infrastructure Analysis",

        # This is an area-based planning assumption, not a
        # measured width of the road adjoining the site.
        "road_width": f"{road_width} m",
        "road_width_source": "planning_estimate",

        "parking_capacity": parking,
        "foundation": foundation,
        "drainage": drainage,
        "recommendations": recommendations,
        "commercial_subtype": (
            commercial_subtype if commercial_subtype else None
        ),
        "regulation_context": rag_context,
        "regulation_rules": rules,
    }
