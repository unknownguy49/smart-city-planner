from typing import Any, Dict


class ScoringEngine:
    """
    Combines individual planning-agent scores into
    a single weighted planning score.

    Current weights preserve the existing planner behavior:
        Architecture   20%
        Civil          20%
        Sustainability 20%
        Municipal      20%
        Citizen        20%

    Constraint compliance is kept separate for now and
    will be integrated after the scoring engine itself
    is validated.
    """

    DEFAULT_WEIGHTS = {
        "architecture": 0.20,
        "civil": 0.20,
        "sustainability": 0.20,
        "municipal": 0.20,
        "citizen": 0.20,
    }

    def __init__(
        self,
        weights: Dict[str, float] | None = None,
    ):
        self.weights = (
            weights
            if weights is not None
            else self.DEFAULT_WEIGHTS.copy()
        )

        self._validate_weights()

    # ---------------------------------------------------------
    # VALIDATE WEIGHTS
    # ---------------------------------------------------------

    def _validate_weights(self) -> None:
        """
        Ensure scoring weights are valid.
        """

        if not self.weights:
            raise ValueError(
                "Scoring weights cannot be empty."
            )

        for name, weight in self.weights.items():

            if not isinstance(weight, (int, float)):
                raise ValueError(
                    f"Weight for '{name}' must be numeric."
                )

            if weight < 0:
                raise ValueError(
                    f"Weight for '{name}' cannot be negative."
                )

        total_weight = sum(
            self.weights.values()
        )

        if abs(total_weight - 1.0) > 1e-9:
            raise ValueError(
                "Scoring weights must sum to 1.0."
            )

    # ---------------------------------------------------------
    # EXTRACT AGENT SCORE
    # ---------------------------------------------------------

    @staticmethod
    def _get_score(
        result: Dict[str, Any],
    ) -> float:
        """
        Extract and validate an agent score.
        """

        score = result.get("score", 0)

        if score is None:
            return 0.0

        try:
            score = float(score)
        except (TypeError, ValueError):
            return 0.0

        return max(
            0.0,
            min(100.0, score)
        )

    # ---------------------------------------------------------
    # CALCULATE AGENT SCORES
    # ---------------------------------------------------------

    def calculate_agent_scores(
        self,
        architecture: Dict[str, Any] | None = None,
        civil: Dict[str, Any] | None = None,
        sustainability: Dict[str, Any] | None = None,
        municipal: Dict[str, Any] | None = None,
        citizen: Dict[str, Any] | None = None,
    ) -> Dict[str, float]:

        architecture = architecture or {}
        civil = civil or {}
        sustainability = sustainability or {}
        municipal = municipal or {}
        citizen = citizen or {}

        return {
            "architecture": self._get_score(
                architecture
            ),
            "civil": self._get_score(
                civil
            ),
            "sustainability": self._get_score(
                sustainability
            ),
            "municipal": self._get_score(
                municipal
            ),
            "citizen": self._get_score(
                citizen
            ),
        }

    # ---------------------------------------------------------
    # CALCULATE WEIGHTED SCORE
    # ---------------------------------------------------------

    def calculate_overall_score(
        self,
        agent_scores: Dict[str, float],
    ) -> float:
        """
        Calculate the weighted overall planning score.
        """

        weighted_score = 0.0

        for name, weight in self.weights.items():

            score = agent_scores.get(
                name,
                0.0
            )

            weighted_score += (
                score * weight
            )

        return round(
            weighted_score,
            2
        )

    # ---------------------------------------------------------
    # RISK LEVEL
    # ---------------------------------------------------------

    @staticmethod
    def get_risk_level(
        score: float,
    ) -> str:

        if score >= 85:
            return "none"

        elif score >= 75:
            return "low"

        elif score >= 60:
            return "medium"

        elif score >= 40:
            return "high"

        return "critical"

    # ---------------------------------------------------------
    # RISK LEVELS FOR ALL AGENTS
    # ---------------------------------------------------------

    def calculate_risk_levels(
        self,
        agent_scores: Dict[str, float],
    ) -> Dict[str, str]:

        return {
            name: self.get_risk_level(
                score
            )
            for name, score in agent_scores.items()
        }

    # ---------------------------------------------------------
    # PLANNING STATUS
    # ---------------------------------------------------------

    @staticmethod
    def get_planning_status(
        overall_score: float,
    ) -> Dict[str, str]:

        if overall_score >= 85:

            return {
                "status": "Recommended",
                "decision": (
                    "The proposed development is recommended "
                    "based on the current multi-agent analysis, "
                    "subject to detailed design and regulatory "
                    "verification."
                ),
            }

        elif overall_score >= 70:

            return {
                "status": "Recommended with conditions",
                "decision": (
                    "The proposed development is conditionally "
                    "recommended. The identified risks and "
                    "priority actions should be addressed before "
                    "proceeding to detailed implementation."
                ),
            }

        elif overall_score >= 50:

            return {
                "status": "Requires major revision",
                "decision": (
                    "The proposed development requires major "
                    "revisions before it can be recommended "
                    "for implementation."
                ),
            }

        return {
            "status": "Not recommended",
            "decision": (
                "The proposed development is not recommended "
                "under the current planning assessment."
            ),
        }

    # ---------------------------------------------------------
    # COMPLETE SCORING
    # ---------------------------------------------------------

    def calculate(
        self,
        architecture: Dict[str, Any] | None = None,
        civil: Dict[str, Any] | None = None,
        sustainability: Dict[str, Any] | None = None,
        municipal: Dict[str, Any] | None = None,
        citizen: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        agent_scores = self.calculate_agent_scores(
            architecture=architecture,
            civil=civil,
            sustainability=sustainability,
            municipal=municipal,
            citizen=citizen,
        )

        overall_score = self.calculate_overall_score(
            agent_scores
        )

        risk_levels = self.calculate_risk_levels(
            agent_scores
        )

        planning_status = self.get_planning_status(
            overall_score
        )

        return {
            "overall_score": overall_score,
            "agent_scores": agent_scores,
            "risk_levels": risk_levels,
            "status": planning_status["status"],
            "decision": planning_status["decision"],
            "weights": self.weights.copy(),
        }


# Singleton instance
scoring_engine = ScoringEngine()
