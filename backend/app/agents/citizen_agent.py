class CitizenAgent:
    """
    Citizen Agent.

    Evaluates nearby public/community infrastructure
    using OSM/Geoapify data and produces a citizen-oriented
    accessibility analysis.
    """

    def analyze(self, places):

        # -----------------------------------------------------
        # READ OSM DATA
        # -----------------------------------------------------

        parks = places.get("parks", [])
        hospitals = places.get("hospitals", [])
        schools = places.get("schools", [])
        colleges = places.get("colleges", [])
        bus_stops = places.get("bus_stops", [])
        police = places.get("police", [])
        fire_stations = places.get("fire_stations", [])

        # -----------------------------------------------------
        # COUNTS
        # -----------------------------------------------------

        counts = {
            "parks": len(parks),
            "hospitals": len(hospitals),
            "schools": len(schools),
            "colleges": len(colleges),
            "bus_stops": len(bus_stops),
            "police": len(police),
            "fire_stations": len(fire_stations),
        }

        # -----------------------------------------------------
        # HELPER
        # -----------------------------------------------------

        def nearest_distance(items):

            distances = []

            for item in items:

                distance = item.get("distance")

                if isinstance(distance, (int, float)):
                    distances.append(distance)

            if not distances:
                return None

            return min(distances)

        # -----------------------------------------------------
        # NEAREST FACILITIES
        # -----------------------------------------------------

        nearest = {
            "nearest_park_m": nearest_distance(parks),
            "nearest_hospital_m": nearest_distance(hospitals),
            "nearest_school_m": nearest_distance(schools),
            "nearest_college_m": nearest_distance(colleges),
            "nearest_bus_stop_m": nearest_distance(bus_stops),
            "nearest_police_m": nearest_distance(police),
            "nearest_fire_station_m": nearest_distance(
                fire_stations
            ),
        }

        # -----------------------------------------------------
        # SCORE
        # -----------------------------------------------------

        # Start from a neutral citizen suitability score.
        score = 50

        # -----------------------------------------------------
        # GREEN / RECREATIONAL ACCESS
        # -----------------------------------------------------

        if parks:

            score += 8

            if (
                nearest["nearest_park_m"] is not None
                and nearest["nearest_park_m"] <= 1000
            ):
                score += 4

        else:

            score -= 8

        # -----------------------------------------------------
        # HEALTHCARE ACCESS
        # -----------------------------------------------------

        if hospitals:

            score += 8

            if (
                nearest["nearest_hospital_m"] is not None
                and nearest["nearest_hospital_m"] <= 2000
            ):
                score += 4

        else:

            score -= 8

        # -----------------------------------------------------
        # EDUCATION ACCESS
        # -----------------------------------------------------

        if schools:

            score += 6

            if (
                nearest["nearest_school_m"] is not None
                and nearest["nearest_school_m"] <= 1500
            ):
                score += 3

        else:

            score -= 6

        if colleges:
            score += 3

        # -----------------------------------------------------
        # PUBLIC TRANSPORT
        # -----------------------------------------------------

        if bus_stops:

            score += 8

            if (
                nearest["nearest_bus_stop_m"] is not None
                and nearest["nearest_bus_stop_m"] <= 800
            ):
                score += 4

        else:

            score -= 10

        # -----------------------------------------------------
        # EMERGENCY SERVICES
        # -----------------------------------------------------

        if fire_stations:

            score += 5

            if (
                nearest["nearest_fire_station_m"] is not None
                and nearest["nearest_fire_station_m"] <= 3000
            ):
                score += 2

        else:

            score -= 5

        if police:
            score += 4
        else:
            score -= 4

        # -----------------------------------------------------
        # KEEP SCORE IN RANGE
        # -----------------------------------------------------

        score = max(
            0,
            min(score, 100)
        )

        # -----------------------------------------------------
        # RECOMMENDATIONS
        # -----------------------------------------------------

        recommendations = []

        # Parks
        if parks:

            recommendations.append(
                f"{len(parks)} nearby park(s) provide "
                "recreational access."
            )

        else:

            recommendations.append(
                "No nearby parks detected; consider "
                "providing accessible green/public space."
            )

        # Hospitals
        if hospitals:

            recommendations.append(
                f"{len(hospitals)} nearby hospital(s) "
                "provide healthcare access."
            )

        else:

            recommendations.append(
                "No nearby hospitals detected; evaluate "
                "emergency healthcare accessibility."
            )

        # Schools
        if schools:

            recommendations.append(
                f"{len(schools)} nearby school(s) "
                "provide educational access."
            )

        else:

            recommendations.append(
                "No nearby schools detected."
            )

        # Colleges
        if colleges:

            recommendations.append(
                f"{len(colleges)} nearby college(s) "
                "provide higher-education access."
            )

        else:

            recommendations.append(
                "No nearby colleges detected."
            )

        # Bus stops
        if bus_stops:

            recommendations.append(
                f"{len(bus_stops)} nearby bus stop(s) "
                "provide public transport access."
            )

        else:

            recommendations.append(
                "No nearby bus stops detected; "
                "public transport connectivity should "
                "be evaluated."
            )

        # Police
        if police:

            recommendations.append(
                f"{len(police)} nearby police station(s) "
                "support emergency and public safety access."
            )

        else:

            recommendations.append(
                "No nearby police stations detected."
            )

        # Fire
        if fire_stations:

            recommendations.append(
                f"{len(fire_stations)} nearby fire station(s) "
                "support emergency response."
            )

        else:

            recommendations.append(
                "No nearby fire stations detected; "
                "emergency response accessibility should "
                "be evaluated."
            )

        # -----------------------------------------------------
        # ACCESSIBILITY RECOMMENDATIONS
        # -----------------------------------------------------

        if (
            nearest["nearest_bus_stop_m"] is not None
            and nearest["nearest_bus_stop_m"] > 800
        ):

            recommendations.append(
                "Nearest detected bus stop is relatively "
                "far away; improve public transport "
                "connectivity where feasible."
            )

        if (
            nearest["nearest_park_m"] is not None
            and nearest["nearest_park_m"] > 1000
        ):

            recommendations.append(
                "Nearby recreational space is relatively "
                "far away; consider pedestrian-friendly "
                "access or additional green space."
            )

        if (
            nearest["nearest_hospital_m"] is not None
            and nearest["nearest_hospital_m"] > 2000
        ):

            recommendations.append(
                "Healthcare facilities are relatively "
                "far away; emergency access planning "
                "should be considered."
            )

        # -----------------------------------------------------
        # REMOVE DUPLICATES
        # -----------------------------------------------------

        recommendations = list(
            dict.fromkeys(recommendations)
        )

        # -----------------------------------------------------
        # RETURN
        # -----------------------------------------------------

        return {

            "agent": "Citizen Agent",

            "score": score,

            "summary": (
                "Citizen Infrastructure "
                "and Accessibility Analysis"
            ),

            "facility_counts": counts,

            "nearest_facilities": nearest,

            "recommendations": recommendations,

            "nearby": places,
        }


_agent = CitizenAgent()


def analyze_places(places):

    return _agent.analyze(places)