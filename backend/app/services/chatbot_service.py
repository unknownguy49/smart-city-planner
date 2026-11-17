from typing import Any, Dict, List


class ChatbotService:
    """
    Deterministic planning chatbot foundation.

    Converts user messages into:
        - explanations
        - recommendations
        - structured design/scenario changes

    The service does not directly modify project data.
    Modification requests return proposed changes that
    require explicit confirmation.
    """

    # ---------------------------------------------------------
    # HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _text(value: Any) -> str:
        if value is None:
            return ""

        return " ".join(
            str(value).strip().split()
        )

    @staticmethod
    def _number(
        value: Any,
        default: float = 0.0,
    ) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    # ---------------------------------------------------------
    # INTENT DETECTION
    # ---------------------------------------------------------

    def detect_intent(
        self,
        message: str,
    ) -> str:

        text = message.lower().strip()

        modification_terms = [
            "increase",
            "decrease",
            "reduce",
            "add",
            "remove",
            "make",
            "change",
            "set",
            "widen",
            "expand",
            "modify",
        ]

        scenario_terms = [
            "what happens if",
            "what if",
            "scenario",
            "compare",
            "impact of",
        ]

        recommendation_terms = [
            "recommend",
            "recommendation",
            "suggest",
            "improve",
            "improvement",
            "what should",
            "how can i improve",
            "how do i improve",
        ]

        explanation_terms = [
            "why",
            "explain",
            "what does",
            "what is",
            "how did",
            "score",
            "regulation",
            "constraint",
        ]

        if any(
            term in text
            for term in scenario_terms
        ):
            return "scenario"

        if any(
            term in text
            for term in modification_terms
        ):
            return "modify"

        if any(
            term in text
            for term in recommendation_terms
        ):
            return "recommend"

        if any(
            term in text
            for term in explanation_terms
        ):
            return "explain"

        return "general"

    # ---------------------------------------------------------
    # EXTRACT NUMBER
    # ---------------------------------------------------------

    @staticmethod
    def _extract_number(
        text: str,
    ) -> float | None:

        import re

        match = re.search(
            r"(\d+(?:\.\d+)?)",
            text,
        )

        if not match:
            return None

        try:
            return float(
                match.group(1)
            )
        except ValueError:
            return None

    # ---------------------------------------------------------
    # DETECT MODIFICATION
    # ---------------------------------------------------------

    def detect_modification(
        self,
        message: str,
        project: Dict[str, Any],
        design: Dict[str, Any] | None = None,
    ) -> Dict[str, Any] | None:

        text = message.lower()

        value = self._extract_number(
            text
        )

        if value is None:
            return None

        # -----------------------------------------------------
        # PARKING
        # -----------------------------------------------------

        if (
            "parking" in text
            or "parking spaces" in text
        ):

            current = None

            if design:
                current = (
                    design
                    .get("site_elements", {})
                    .get("parking_capacity")
                )

            return {
                "type": "parking",
                "parameters": {
                    "parking_spaces": int(value),
                },
                "current_value": current,
                "new_value": int(value),
            }

        # -----------------------------------------------------
        # ROAD WIDTH
        # -----------------------------------------------------

        if (
            "road" in text
            and (
                "width" in text
                or "wide" in text
                or "widen" in text
            )
        ):

            current = project.get(
                "road_width_m"
            )

            return {
                "type": "road_widening",
                "parameters": {
                    "proposed_width_m": value,
                },
                "current_value": current,
                "new_value": value,
            }

        # -----------------------------------------------------
        # FOOTPATH
        # -----------------------------------------------------

        if (
            "footpath" in text
            or "footpath width" in text
        ):

            current = None

            if design:
                current = (
                    design
                    .get("site_elements", {})
                    .get("footpath_width_m")
                )

            return {
                "type": "footpath",
                "parameters": {
                    "footpath_width_m": value,
                },
                "current_value": current,
                "new_value": value,
            }

        # -----------------------------------------------------
        # GREEN AREA
        # -----------------------------------------------------

        if (
            "green area" in text
            or "green space" in text
            or "green percentage" in text
        ):

            current = None

            if design:
                current = (
                    design
                    .get("site_elements", {})
                    .get("green_area_percentage")
                )

            return {
                "type": "green_space",
                "parameters": {
                    "green_area_percentage": value,
                },
                "current_value": current,
                "new_value": value,
            }

        # -----------------------------------------------------
        # BUILDING HEIGHT
        # -----------------------------------------------------

        if (
            "building height" in text
            or "height" in text
        ):

            current = None

            if design:
                current = (
                    design
                    .get("building", {})
                    .get("height_m")
                )

            return {
                "type": "building_height",
                "parameters": {
                    "height_m": value,
                },
                "current_value": current,
                "new_value": value,
            }

        # -----------------------------------------------------
        # FLOORS
        # -----------------------------------------------------

        if (
            "floor" in text
            or "floors" in text
        ):

            current = None

            if design:
                current = (
                    design
                    .get("building", {})
                    .get("floors")
                )

            return {
                "type": "building_floors",
                "parameters": {
                    "floors": int(value),
                },
                "current_value": current,
                "new_value": int(value),
            }

        return None

    # ---------------------------------------------------------
    # EXPLANATION
    # ---------------------------------------------------------

    def explain(
        self,
        message: str,
        analysis: Dict[str, Any],
    ) -> str:

        text = message.lower()

        scoring = analysis.get(
            "scoring",
            {},
        )

        agent_scores = scoring.get(
            "agent_scores",
            analysis.get(
                "agent_scores",
                {},
            ),
        )

        overall_score = scoring.get(
            "overall_score",
            analysis.get(
                "overall_score"
            ),
        )

        if "score" in text:

            if overall_score is not None:

                return (
                    f"The current overall planning score "
                    f"is {overall_score}. "
                    f"It is calculated from the five "
                    f"planning-agent assessments."
                )

        for agent_name, score in agent_scores.items():

            if agent_name.replace(
                "_",
                " ",
            ) in text:

                return (
                    f"The {agent_name.replace('_', ' ').title()} "
                    f"agent currently has a score of {score}."
                )

        if (
            "constraint" in text
            or "regulation" in text
        ):

            return (
                "The project is evaluated against the "
                "regulatory information retrieved for "
                "the selected jurisdiction and the "
                "constraints identified by the planning system."
            )

        return (
            "The planner combines site context, regulatory "
            "information and the five planning-agent assessments "
            "to produce the current planning result."
        )

    # ---------------------------------------------------------
    # RECOMMENDATIONS
    # ---------------------------------------------------------

    def recommend(
        self,
        analysis: Dict[str, Any],
    ) -> Dict[str, Any]:

        recommendations = analysis.get(
            "recommendations",
            {},
        )

        if isinstance(
            recommendations,
            dict,
        ):
            items = recommendations.get(
                "recommendations",
                [],
            )

            return {
                "message": (
                    "Here are the recommendations "
                    "generated from the current planning "
                    "assessment."
                ),
                "recommendations": items,
            }

        return {
            "message": (
                "No structured recommendations are "
                "currently available."
            ),
            "recommendations": [],
        }

    # ---------------------------------------------------------
    # SCENARIO
    # ---------------------------------------------------------

    def scenario(
        self,
        message: str,
    ) -> Dict[str, Any]:

        text = message.lower()

        if (
            "road" in text
            and (
                "widen" in text
                or "width" in text
            )
        ):

            value = self._extract_number(
                text
            )

            if value is not None:

                return {
                    "message": (
                        f"A road-widening scenario can "
                        f"be evaluated using a proposed "
                        f"road width of {value} m."
                    ),
                    "intervention":
                        "road_widening",
                    "parameters": {
                        "proposed_width_m":
                            value,
                    },
                }

        if "parking" in text:

            value = self._extract_number(
                text
            )

            if value is not None:

                return {
                    "message": (
                        f"A parking scenario can be "
                        f"evaluated using {int(value)} "
                        f"parking spaces."
                    ),
                    "intervention":
                        "parking",
                    "parameters": {
                        "parking_spaces":
                            int(value),
                    },
                }

        return {
            "message": (
                "The requested scenario can be evaluated "
                "through the planning scenario system."
            ),
            "intervention": None,
            "parameters": {},
        }

    # ---------------------------------------------------------
    # GENERAL
    # ---------------------------------------------------------

    @staticmethod
    def general_response() -> str:

        return (
            "I can help you understand the planning "
            "analysis, review recommendations, evaluate "
            "scenarios, or propose changes to the current design."
        )

    # ---------------------------------------------------------
    # MAIN MESSAGE HANDLER
    # ---------------------------------------------------------

    def process_message(
        self,
        *,
        message: str,
        project: Dict[str, Any] | None = None,
        analysis: Dict[str, Any] | None = None,
        design: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        project = project or {}
        analysis = analysis or {}

        message = self._text(
            message
        )

        if not message:

            raise ValueError(
                "Message is required."
            )

        intent = self.detect_intent(
            message
        )

        # -----------------------------------------------------
        # MODIFY
        # -----------------------------------------------------

        if intent == "modify":

            change = self.detect_modification(
                message,
                project,
                design,
            )

            if change:

                current_value = change.get(
                    "current_value"
                )

                new_value = change.get(
                    "new_value"
                )

                if current_value is None:

                    response = (
                        f"I propose changing the "
                        f"{change['type'].replace('_', ' ')} "
                        f"to {new_value}."
                    )

                else:

                    response = (
                        f"I propose changing the "
                        f"{change['type'].replace('_', ' ')} "
                        f"from {current_value} "
                        f"to {new_value}."
                    )

                return {
                    "status": "success",
                    "intent": "modify",
                    "message": response,
                    "proposed_changes": [
                        change
                    ],
                    "requires_confirmation": True,
                }

        # -----------------------------------------------------
        # RECOMMEND
        # -----------------------------------------------------

        if intent == "recommend":

            result = self.recommend(
                analysis
            )

            return {
                "status": "success",
                "intent": "recommend",
                **result,
                "requires_confirmation": False,
            }

        # -----------------------------------------------------
        # SCENARIO
        # -----------------------------------------------------

        if intent == "scenario":

            result = self.scenario(
                message
            )

            return {
                "status": "success",
                "intent": "scenario",
                **result,
                "requires_confirmation": False,
            }

        # -----------------------------------------------------
        # EXPLAIN
        # -----------------------------------------------------

        if intent == "explain":

            return {
                "status": "success",
                "intent": "explain",
                "message": self.explain(
                    message,
                    analysis,
                ),
                "proposed_changes": [],
                "requires_confirmation": False,
            }

        # -----------------------------------------------------
        # GENERAL
        # -----------------------------------------------------

        return {
            "status": "success",
            "intent": "general",
            "message":
                self.general_response(),
            "proposed_changes": [],
            "requires_confirmation": False,
        }


# Singleton instance
chatbot_service = ChatbotService()