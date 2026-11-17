from typing import Any, Dict, List


class RecommendationService:
    """
    Converts planner and scoring results into structured,
    actionable recommendations.

    This service does not replace the existing agent
    recommendations. It organizes them and adds
    planning-level recommendations based on:

        - Agent scores
        - Risk levels
        - Planning decision
        - Priority actions
        - Agent recommendations
        - Project characteristics

    The output is intentionally structured so it can later
    be consumed by:

        - Frontend recommendation cards
        - AI chatbot
        - Scenario generation
        - Architecture report
        - PDF generation
    """

    AGENT_LABELS = {
        "architecture": "Architecture",
        "civil": "Civil Infrastructure",
        "sustainability": "Sustainability",
        "municipal": "Municipal Compliance",
        "citizen": "Citizen Accessibility",
    }

    # ---------------------------------------------------------
    # PRIORITY
    # ---------------------------------------------------------

    @staticmethod
    def _priority_from_score(score: float) -> str:
        """
        Convert an agent score into a recommendation priority.
        """

        if score < 60:
            return "high"

        if score < 80:
            return "medium"

        return "low"

    # ---------------------------------------------------------
    # NORMALIZE TEXT
    # ---------------------------------------------------------

    @staticmethod
    def _normalize_text(value: Any) -> str:
        if value is None:
            return ""

        return " ".join(
            str(value).strip().split()
        )

    # ---------------------------------------------------------
    # ADD RECOMMENDATION
    # ---------------------------------------------------------

    @classmethod
    def _add_recommendation(
        cls,
        recommendations: List[Dict[str, Any]],
        *,
        category: str,
        priority: str,
        title: str,
        issue: str,
        recommendation: str,
        source: str,
        suggested_intervention: str | None = None,
        suggested_parameters: Dict[str, Any] | None = None,
    ) -> None:
        """
        Add a recommendation while preventing duplicates.
        """

        title = cls._normalize_text(title)
        issue = cls._normalize_text(issue)
        recommendation = cls._normalize_text(
            recommendation
        )

        if not recommendation:
            return

        duplicate_key = recommendation.lower()

        for existing in recommendations:
            existing_key = cls._normalize_text(
                existing.get("recommendation")
            ).lower()

            if existing_key == duplicate_key:
                return

        recommendations.append(
            {
                "category": category,
                "priority": priority,
                "title": title,
                "issue": issue,
                "recommendation": recommendation,
                "source": source,
                "suggested_intervention":
                    suggested_intervention,
                "suggested_parameters":
                    suggested_parameters or {},
            }
        )

    # ---------------------------------------------------------
    # AGENT RECOMMENDATIONS
    # ---------------------------------------------------------

    @classmethod
    def _collect_agent_recommendations(
        cls,
        recommendations: List[Dict[str, Any]],
        agent_results: Dict[str, Dict[str, Any]],
    ) -> None:
        """
        Convert recommendations already produced by the
        individual agents into structured recommendations.
        """

        for agent_name, result in agent_results.items():

            if not isinstance(result, dict):
                continue

            label = cls.AGENT_LABELS.get(
                agent_name,
                agent_name.replace("_", " ").title(),
            )

            raw_score = result.get(
                "score",
                0,
            )

            try:
                score = float(raw_score)
            except (TypeError, ValueError):
                score = 0.0

            priority = cls._priority_from_score(
                score
            )

            raw_recommendations = result.get(
                "recommendations",
                [],
            )

            if not isinstance(
                raw_recommendations,
                list,
            ):
                continue

            for item in raw_recommendations:

                if not item:
                    continue

                text = cls._normalize_text(item)

                if not text:
                    continue

                cls._add_recommendation(
                    recommendations,
                    category=agent_name,
                    priority=priority,
                    title=f"{label} recommendation",
                    issue=(
                        f"The {label.lower()} assessment "
                        f"identified an area requiring "
                        f"attention."
                    ),
                    recommendation=text,
                    source=f"{label} Agent",
                )

    # ---------------------------------------------------------
    # AGENT SCORE RECOMMENDATIONS
    # ---------------------------------------------------------

    @classmethod
    def _collect_score_recommendations(
        cls,
        recommendations: List[Dict[str, Any]],
        agent_scores: Dict[str, Any],
        risk_levels: Dict[str, Any],
    ) -> None:
        """
        Generate planning-level recommendations from
        agent scores and risk levels.
        """

        for agent_name, raw_score in agent_scores.items():

            try:
                score = float(raw_score)
            except (TypeError, ValueError):
                score = 0.0

            risk = risk_levels.get(
                agent_name,
                "unknown",
            )

            label = cls.AGENT_LABELS.get(
                agent_name,
                agent_name.replace("_", " ").title(),
            )

            if score < 60:

                cls._add_recommendation(
                    recommendations,
                    category=agent_name,
                    priority="high",
                    title=f"Review {label} assessment",
                    issue=(
                        f"The {label.lower()} score is "
                        f"{score:.1f}, indicating a significant "
                        f"planning concern."
                    ),
                    recommendation=(
                        f"Review the {label.lower()} requirements "
                        f"and address the identified issues before "
                        f"proceeding with detailed planning."
                    ),
                    source="Scoring Engine",
                )

            elif score < 80:

                cls._add_recommendation(
                    recommendations,
                    category=agent_name,
                    priority="medium",
                    title=f"Improve {label} performance",
                    issue=(
                        f"The {label.lower()} score is "
                        f"{score:.1f} with a {risk} risk level."
                    ),
                    recommendation=(
                        f"Review the {label.lower()} findings and "
                        f"address the priority items identified "
                        f"by the planning analysis."
                    ),
                    source="Scoring Engine",
                )

    # ---------------------------------------------------------
    # PRIORITY ACTIONS
    # ---------------------------------------------------------

    @classmethod
    def _collect_priority_actions(
        cls,
        recommendations: List[Dict[str, Any]],
        priority_actions: Any,
    ) -> None:
        """
        Convert planner priority actions into structured
        recommendations.
        """

        if not isinstance(
            priority_actions,
            list,
        ):
            return

        for action in priority_actions:

            text = cls._normalize_text(action)

            if not text:
                continue

            cls._add_recommendation(
                recommendations,
                category="planning",
                priority="high",
                title="Priority planning action",
                issue=(
                    "The planning synthesis identified "
                    "an action that should be reviewed."
                ),
                recommendation=text,
                source="Planner",
            )

    # ---------------------------------------------------------
    # RISKS
    # ---------------------------------------------------------

    @classmethod
    def _collect_risks(
        cls,
        recommendations: List[Dict[str, Any]],
        risks: Any,
    ) -> None:
        """
        Convert planner risks into recommendations.
        """

        if not isinstance(
            risks,
            list,
        ):
            return

        for risk in risks:

            text = cls._normalize_text(risk)

            if not text:
                continue

            cls._add_recommendation(
                recommendations,
                category="risk",
                priority="high",
                title="Planning risk identified",
                issue=text,
                recommendation=(
                    "Review and resolve this planning risk "
                    "before proceeding to implementation."
                ),
                source="Planner",
            )

    # ---------------------------------------------------------
    # PROJECT-SPECIFIC RECOMMENDATIONS
    # ---------------------------------------------------------

    @classmethod
    def _collect_project_recommendations(
        cls,
        recommendations: List[Dict[str, Any]],
        project: Dict[str, Any],
    ) -> None:
        """
        Add recommendations based only on information
        explicitly available in the project.
        """

        building_type = project.get(
            "building_type"
        )

        commercial_subtype = project.get(
            "commercial_subtype"
        )

        if commercial_subtype:

            cls._add_recommendation(
                recommendations,
                category="design",
                priority="low",
                title="Review commercial site planning",
                issue=(
                    f"The project is classified as "
                    f"{commercial_subtype} commercial development."
                ),
                recommendation=(
                    "Review pedestrian circulation, parking, "
                    "service access, fire access and applicable "
                    "commercial development controls during "
                    "detailed design."
                ),
                source="Planning Context",
            )

        elif building_type:

            cls._add_recommendation(
                recommendations,
                category="design",
                priority="low",
                title="Review site planning",
                issue=(
                    f"The project is classified as "
                    f"{building_type} development."
                ),
                recommendation=(
                    "Review site access, circulation, parking, "
                    "fire access and applicable development "
                    "controls during detailed design."
                ),
                source="Planning Context",
            )

    # ---------------------------------------------------------
    # MAIN GENERATOR
    # ---------------------------------------------------------

    def generate(
        self,
        *,
        project: Dict[str, Any] | None = None,
        architecture: Dict[str, Any] | None = None,
        civil: Dict[str, Any] | None = None,
        sustainability: Dict[str, Any] | None = None,
        municipal: Dict[str, Any] | None = None,
        citizen: Dict[str, Any] | None = None,
        scoring: Dict[str, Any] | None = None,
        planning_decision: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        project = project or {}
        architecture = architecture or {}
        civil = civil or {}
        sustainability = sustainability or {}
        municipal = municipal or {}
        citizen = citizen or {}
        scoring = scoring or {}
        planning_decision = planning_decision or {}

        recommendations: List[
            Dict[str, Any]
        ] = []

        agent_results = {
            "architecture": architecture,
            "civil": civil,
            "sustainability": sustainability,
            "municipal": municipal,
            "citizen": citizen,
        }

        # -----------------------------------------------------
        # 1. Agent recommendations
        # -----------------------------------------------------

        self._collect_agent_recommendations(
            recommendations,
            agent_results,
        )

        # -----------------------------------------------------
        # 2. Score-based recommendations
        # -----------------------------------------------------

        agent_scores = scoring.get(
            "agent_scores",
            {},
        )

        risk_levels = scoring.get(
            "risk_levels",
            {},
        )

        if isinstance(
            agent_scores,
            dict,
        ):
            self._collect_score_recommendations(
                recommendations,
                agent_scores,
                risk_levels
                if isinstance(
                    risk_levels,
                    dict,
                )
                else {},
            )

        # -----------------------------------------------------
        # 3. Planner priority actions
        # -----------------------------------------------------

        self._collect_priority_actions(
            recommendations,
            planning_decision.get(
                "priority_actions",
                [],
            ),
        )

        # -----------------------------------------------------
        # 4. Planner risks
        # -----------------------------------------------------

        self._collect_risks(
            recommendations,
            planning_decision.get(
                "risks",
                [],
            ),
        )

        # -----------------------------------------------------
        # 5. Project context
        # -----------------------------------------------------

        self._collect_project_recommendations(
            recommendations,
            project,
        )

        # -----------------------------------------------------
        # 6. Summary
        # -----------------------------------------------------

        priority_counts = {
            "high": 0,
            "medium": 0,
            "low": 0,
        }

        for item in recommendations:

            priority = item.get(
                "priority"
            )

            if priority in priority_counts:
                priority_counts[
                    priority
                ] += 1

        overall_score = scoring.get(
            "overall_score"
        )

        return {
            "status": "success",
            "overall_score": overall_score,
            "planning_status": scoring.get(
                "status"
            ),
            "recommendation_count":
                len(recommendations),
            "priority_summary":
                priority_counts,
            "recommendations":
                recommendations,
        }


# Singleton instance
recommendation_service = RecommendationService()