from typing import Any, Dict, List
import re

from app.services.regulation_applicability import (
    RegulationApplicabilityEngine,
)


class ConstraintEngine:
    """
    Evaluates project constraints against applicable
    planning and regulatory requirements.

    Regulatory applicability is kept separate from
    the overall planning/scoring system.
    """

    def __init__(self):
        self.applicability_engine = RegulationApplicabilityEngine()

    # =========================================================
    # COMMON RESULT BUILDER
    # =========================================================

    def _result(
        self,
        constraint: str,
        status: str,
        actual: Any = None,
        required: Any = None,
        message: str = "",
        severity: str = "medium",
        source: str = "",
    ) -> Dict[str, Any]:

        return {
            "constraint": constraint,
            "status": status,
            "actual": actual,
            "required": required,
            "message": message,
            "severity": severity,
            "source": source,
        }

    # =========================================================
    # PLOT AREA
    # =========================================================

    def check_plot_area(
        self,
        project: Dict[str, Any],
    ) -> Dict[str, Any]:

        area = project.get("area")

        try:
            area = float(area)

        except (TypeError, ValueError):

            return self._result(
                constraint="Plot Area",
                status="WARNING",
                actual=area,
                required=None,
                message=(
                    "Plot area could not be converted into "
                    "a numeric value."
                ),
                severity="medium",
                source="Project",
            )

        if area <= 0:

            return self._result(
                constraint="Plot Area",
                status="FAIL",
                actual=area,
                required=0,
                message=(
                    "Plot area must be greater than zero."
                ),
                severity="high",
                source="Project",
            )

        return self._result(
            constraint="Plot Area",
            status="PASS",
            actual=area,
            required=0,
            message=(
                "A valid positive plot area was provided."
            ),
            severity="none",
            source="Project",
        )

    # =========================================================
    # FAR
    # =========================================================

    def check_far(
        self,
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = architecture.get(
            "proposed_far"
        )

        if actual is None:
            actual = architecture.get(
                "far"
            )

        required = architecture.get(
            "maximum_far"
        )

        if required is None:
            required = architecture.get(
                "max_far"
            )

        selected_control = architecture.get(
            "selected_commercial_control"
        )

        if (
            required is None
            and isinstance(selected_control, dict)
        ):
            required = selected_control.get(
                "far"
            )

        try:

            if actual is not None:
                actual = float(actual)

            if required is not None:
                required = float(required)

        except (TypeError, ValueError):

            return self._result(
                constraint="FAR",
                status="WARNING",
                actual=actual,
                required=required,
                message=(
                    "FAR values could not be converted "
                    "into numeric values."
                ),
                severity="medium",
                source="RAG",
            )

        if actual is None:

            return self._result(
                constraint="FAR",
                status="WARNING",
                actual=None,
                required=required,
                message=(
                    "No proposed FAR was available."
                ),
                severity="medium",
                source="RAG",
            )

        if required is None:

            return self._result(
                constraint="FAR",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "No directly applicable FAR limit "
                    "was available."
                ),
                severity="medium",
                source="RAG",
            )

        if actual <= required:

            return self._result(
                constraint="FAR",
                status="PASS",
                actual=actual,
                required=required,
                message=(
                    "Proposed FAR is within the applicable "
                    "development control."
                ),
                severity="none",
                source="RAG",
            )

        return self._result(
            constraint="FAR",
            status="FAIL",
            actual=actual,
            required=required,
            message=(
                f"Proposed FAR of {actual:g} exceeds the "
                f"applicable maximum FAR of {required:g}."
            ),
            severity="high",
            source="RAG",
        )

    # =========================================================
    # GROUND COVERAGE
    # =========================================================

    def check_ground_coverage(
        self,
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = architecture.get(
            "proposed_ground_coverage_percent"
        )

        if actual is None:
            actual = architecture.get(
                "proposed_ground_coverage"
            )

        if actual is None:
            actual = architecture.get(
                "ground_coverage"
            )

        if actual is None:
            actual = architecture.get(
                "ground_coverage_percentage"
            )

        required = architecture.get(
            "maximum_ground_coverage"
        )

        if required is None:
            required = architecture.get(
                "max_ground_coverage"
            )

        if required is None:
            required = architecture.get(
                "maximum_ground_coverage_percent"
            )

        selected_control = architecture.get(
            "selected_commercial_control"
        )

        if (
            required is None
            and isinstance(selected_control, dict)
        ):
            required = selected_control.get(
                "ground_coverage_percent"
            )

        try:

            if actual is not None:
                actual = float(actual)

            if required is not None:
                required = float(required)

        except (TypeError, ValueError):

            return self._result(
                constraint="Ground Coverage",
                status="WARNING",
                actual=actual,
                required=required,
                message=(
                    "Ground-coverage values could not be "
                    "converted into numeric values."
                ),
                severity="medium",
                source="RAG",
            )

        if actual is None:

            return self._result(
                constraint="Ground Coverage",
                status="WARNING",
                actual=None,
                required=required,
                message=(
                    "No proposed ground coverage was available."
                ),
                severity="medium",
                source="RAG",
            )

        if required is None:

            return self._result(
                constraint="Ground Coverage",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "No directly applicable ground-coverage "
                    "limit was available."
                ),
                severity="medium",
                source="RAG",
            )

        if actual <= required:

            return self._result(
                constraint="Ground Coverage",
                status="PASS",
                actual=actual,
                required=required,
                message=(
                    "Proposed ground coverage is within the "
                    "applicable development control."
                ),
                severity="none",
                source="RAG",
            )

        return self._result(
            constraint="Ground Coverage",
            status="FAIL",
            actual=actual,
            required=required,
            message=(
                f"Proposed ground coverage of {actual:g}% "
                f"exceeds the applicable maximum of "
                f"{required:g}%."
            ),
            severity="high",
            source="RAG",
        )

    # =========================================================
    # BUILDING HEIGHT
    # =========================================================

    def check_height(
        self,
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = architecture.get(
            "building_height_m"
        )

        if actual is None:
            actual = architecture.get(
                "proposed_height"
            )

        if actual is None:
            actual = architecture.get(
                "proposed_height_m"
            )

        if actual is None:
            actual = architecture.get(
                "height"
            )

        required = architecture.get(
            "maximum_height"
        )

        if required is None:
            required = architecture.get(
                "max_height"
            )

        if required is None:
            required = architecture.get(
                "maximum_height_m"
            )

        selected_control = architecture.get(
            "selected_commercial_control"
        )

        if (
            required is None
            and isinstance(selected_control, dict)
        ):
            required = selected_control.get(
                "height_m"
            )

        try:

            if actual is not None:
                actual = float(actual)

            if required is not None:
                required = float(required)

        except (TypeError, ValueError):

            return self._result(
                constraint="Building Height",
                status="WARNING",
                actual=actual,
                required=required,
                message=(
                    "Building-height values could not be "
                    "converted into numeric values."
                ),
                severity="medium",
                source="RAG",
            )

        if actual is None:

            return self._result(
                constraint="Building Height",
                status="WARNING",
                actual=None,
                required=required,
                message=(
                    "No proposed building height was available."
                ),
                severity="medium",
                source="RAG",
            )

        if required is None:

            return self._result(
                constraint="Building Height",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "No directly applicable building-height "
                    "limit was available."
                ),
                severity="medium",
                source="RAG",
            )

        if actual <= required:

            return self._result(
                constraint="Building Height",
                status="PASS",
                actual=actual,
                required=required,
                message=(
                    "Building height is within the applicable "
                    "development control."
                ),
                severity="none",
                source="RAG",
            )

        return self._result(
            constraint="Building Height",
            status="FAIL",
            actual=actual,
            required=required,
            message=(
                f"Building height of {actual:g} m exceeds the "
                f"applicable maximum of {required:g} m."
            ),
            severity="high",
            source="RAG",
        )

    # =========================================================
    # ROAD ACCESS
    # =========================================================

    def check_road_access(
        self,
        project: Dict[str, Any],
        civil: Dict[str, Any],
        municipal: Dict[str, Any],
    ) -> Dict[str, Any]:

        def extract_numeric(value):

            if value is None:
                return None

            if isinstance(value, (int, float)):
                return float(value)

            if isinstance(value, str):

                match = re.search(
                    r"[-+]?\d+(?:\.\d+)?",
                    value,
                )

                if match:

                    try:
                        return float(
                            match.group()
                        )

                    except (TypeError, ValueError):
                        return None

            return None

        actual_raw = civil.get(
            "road_width_m"
        )

        if actual_raw is None:
            actual_raw = civil.get(
                "road_width"
            )

        actual = extract_numeric(
            actual_raw
        )

        if actual_raw is not None and actual is None:

            return self._result(
                constraint="Road Access",
                status="WARNING",
                actual=actual_raw,
                required=None,
                message=(
                    "The current road-width value could not "
                    "be converted into a numeric value."
                ),
                severity="medium",
                source="Planning estimate",
            )

        regulation_rules = municipal.get(
            "regulation_rules",
            {},
        )

        road_width_rules = regulation_rules.get(
            "road_width",
            [],
        )

        if not road_width_rules:

            return self._result(
                constraint="Road Access",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "No directly applicable regulatory "
                    "road-width requirement was available."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        explicit_widths = []

        for rule in road_width_rules:

            if not isinstance(rule, dict):
                continue

            width = rule.get(
                "width_m"
            )

            numeric_width = extract_numeric(
                width
            )

            if numeric_width is not None:

                explicit_widths.append(
                    numeric_width
                )

                continue

            for field in (
                "required_width_m",
                "minimum_width_m",
                "min_width_m",
                "required",
                "value",
            ):

                numeric_width = extract_numeric(
                    rule.get(field)
                )

                if numeric_width is not None:

                    explicit_widths.append(
                        numeric_width
                    )

                    break

        if not explicit_widths:

            return self._result(
                constraint="Road Access",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "Road-width provisions were retrieved, "
                    "but no numeric directly applicable "
                    "requirement was available."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        required = min(
            explicit_widths
        )

        # Do not treat an estimated road width as a verified
        # measurement for regulatory compliance.
        road_width_source = str(
            civil.get("road_width_source", "")
        ).strip().lower()

        if road_width_source in {
            "planning_estimate",
            "estimate",
            "estimated",
            "assumed",
        }:
            return self._result(
                constraint="Road Access",
                status="WARNING",
                actual=actual,
                required=required,
                message=(
                    "The road width is a planning estimate, "
                    "not a verified site measurement. Confirm "
                    "the actual road width before determining "
                    "road-access compliance."
                ),
                severity="medium",
                source="Planning estimate",
            )

        if actual is None:

            return self._result(
                constraint="Road Access",
                status="WARNING",
                actual=None,
                required=required,
                message=(
                    "A regulatory road-width requirement was "
                    "found, but the project's road width was "
                    "not provided."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        if actual >= required:

            return self._result(
                constraint="Road Access",
                status="PASS",
                actual=actual,
                required=required,
                message=(
                    f"Road width of {actual:g} m satisfies the "
                    f"applicable minimum requirement of "
                    f"{required:g} m."
                ),
                severity="none",
                source="Regulation Applicability Engine",
            )

        return self._result(
            constraint="Road Access",
            status="FAIL",
            actual=actual,
            required=required,
            message=(
                f"Road width of {actual:g} m is below the "
                f"applicable minimum requirement of "
                f"{required:g} m."
            ),
            severity="high",
            source="Regulation Applicability Engine",
        )

    # =========================================================
    # PARKING
    # =========================================================

    def check_parking(
        self,
        project: Dict[str, Any],
        civil: Dict[str, Any],
        architecture: Dict[str, Any],
        municipal: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = civil.get(
            "parking_ecs"
        )

        if actual is None:
            actual = civil.get(
                "parking_capacity_ecs"
            )

        if actual is None:
            actual = civil.get(
                "parking_capacity"
            )

        if actual is None:
            actual = architecture.get(
                "parking_ecs"
            )

        if actual is None:
            actual = architecture.get(
                "parking_capacity"
            )

        regulation_rules = municipal.get(
            "regulation_rules",
            {},
        )

        parking_rules = regulation_rules.get(
            "parking",
            [],
        )

        if not parking_rules:

            return self._result(
                constraint="Parking",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "Parking capacity is available as a "
                    "planning estimate, but no structured "
                    "regulatory parking requirement was "
                    "available for direct comparison."
                ),
                severity="medium",
                source="Agent/RAG",
            )

        requirements = []

        for rule in parking_rules:

            if not isinstance(rule, dict):
                continue

            value = rule.get(
                "ecs_per_100sqm"
            )

            if value is None:
                value = rule.get(
                    "required_ecs"
                )

            if value is None:
                value = rule.get(
                    "value"
                )

            if value is None:
                value = rule.get(
                    "rate"
                )

            try:

                if value is not None:

                    requirements.append(
                        float(value)
                    )

            except (TypeError, ValueError):
                continue

        if not requirements:

            return self._result(
                constraint="Parking",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "Parking provisions were retrieved, "
                    "but no numeric directly applicable "
                    "requirement was available."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        required_rate = max(
            requirements
        )

        area = project.get(
            "area"
        )

        try:

            area = float(
                area
            )

        except (TypeError, ValueError):

            return self._result(
                constraint="Parking",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "Plot area could not be converted into "
                    "a numeric value for parking calculation."
                ),
                severity="medium",
                source="Project",
            )

        required = (
            area / 100.0
        ) * required_rate

        if actual is None:

            return self._result(
                constraint="Parking",
                status="WARNING",
                actual=None,
                required=round(
                    required,
                    2,
                ),
                message=(
                    "A regulatory parking requirement was "
                    "found, but the project's parking capacity "
                    "was not provided."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        try:

            actual = float(
                actual
            )

        except (TypeError, ValueError):

            return self._result(
                constraint="Parking",
                status="WARNING",
                actual=actual,
                required=round(
                    required,
                    2,
                ),
                message=(
                    "The project's parking capacity could "
                    "not be converted into a numeric value."
                ),
                severity="medium",
                source="Planning estimate",
            )

        if actual >= required:

            return self._result(
                constraint="Parking",
                status="PASS",
                actual=actual,
                required=round(
                    required,
                    2,
                ),
                message=(
                    f"Parking capacity of {actual:g} ECS "
                    f"satisfies the calculated requirement "
                    f"of {required:.2f} ECS."
                ),
                severity="none",
                source="Regulation Applicability Engine",
            )

        return self._result(
            constraint="Parking",
            status="FAIL",
            actual=actual,
            required=round(
                required,
                2,
            ),
            message=(
                f"Parking capacity of {actual:g} ECS is "
                f"below the calculated requirement of "
                f"{required:.2f} ECS."
            ),
            severity="high",
            source="Regulation Applicability Engine",
        )

    # =========================================================
    # GREEN AREA
    # =========================================================

    def check_green_area(
        self,
        sustainability: Dict[str, Any],
        municipal: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = sustainability.get(
            "proposed_green_area_percentage"
        )

        if actual is None:
            actual = sustainability.get(
                "green_area_percentage"
            )

        if actual is None:
            actual = sustainability.get(
                "green_area"
            )

        regulation_rules = municipal.get(
            "regulation_rules",
            {},
        )

        green_rules = regulation_rules.get(
            "green_area",
            [],
        )

        if not green_rules:

            return self._result(
                constraint="Green Area",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "No directly applicable regulation "
                    "green-area requirement was available."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        requirements = []

        for rule in green_rules:

            if not isinstance(rule, dict):
                continue

            value = rule.get(
                "minimum_percentage"
            )

            if value is None:
                value = rule.get(
                    "percentage"
                )

            if value is None:
                value = rule.get(
                    "minimum_green_area_percentage"
                )

            if value is None:
                value = rule.get(
                    "value"
                )

            try:

                if value is not None:

                    requirements.append(
                        float(value)
                    )

            except (TypeError, ValueError):
                continue

        if not requirements:

            return self._result(
                constraint="Green Area",
                status="WARNING",
                actual=actual,
                required=None,
                message=(
                    "Green-area provisions were retrieved, "
                    "but no numeric directly applicable "
                    "requirement was available."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        required = max(
            requirements
        )

        if actual is None:

            return self._result(
                constraint="Green Area",
                status="WARNING",
                actual=None,
                required=required,
                message=(
                    "A regulatory green-area requirement "
                    "was found, but the proposed green-area "
                    "percentage was not provided."
                ),
                severity="medium",
                source="Regulation Applicability Engine",
            )

        try:

            actual = float(
                actual
            )

        except (TypeError, ValueError):

            return self._result(
                constraint="Green Area",
                status="WARNING",
                actual=actual,
                required=required,
                message=(
                    "The proposed green-area percentage "
                    "could not be converted into a numeric value."
                ),
                severity="medium",
                source="Planning estimate",
            )

        if actual >= required:

            return self._result(
                constraint="Green Area",
                status="PASS",
                actual=actual,
                required=required,
                message=(
                    f"Proposed green area of {actual:g}% "
                    f"satisfies the applicable minimum "
                    f"requirement of {required:g}%."
                ),
                severity="none",
                source="Regulation Applicability Engine",
            )

        return self._result(
            constraint="Green Area",
            status="FAIL",
            actual=actual,
            required=required,
            message=(
                f"Proposed green area of {actual:g}% is "
                f"below the applicable minimum requirement "
                f"of {required:g}%."
            ),
            severity="high",
            source="Regulation Applicability Engine",
        )

    # =========================================================
    # RAINWATER HARVESTING
    # =========================================================

    def check_rainwater(
        self,
        sustainability: Dict[str, Any],
        municipal: Dict[str, Any],
    ) -> Dict[str, Any]:

        actual = sustainability.get(
            "rainwater_harvesting"
        )

        if actual is None:
            actual = sustainability.get(
                "proposed_rainwater_harvesting"
            )

        regulation_rules = municipal.get(
            "regulation_rules",
            {},
        )

        rainwater_rules = regulation_rules.get(
            "rainwater",
            [],
        )

        mandatory = False

        for rule in rainwater_rules:

            if not isinstance(rule, dict):
                continue

            text = " ".join(
                str(value)
                for value in rule.values()
                if value is not None
            ).lower()

            if (
                "shall" in text
                or "mandatory" in text
                or "compulsory" in text
                or "required" in text
            ):

                mandatory = True
                break

        if mandatory:

            if actual in (
                True,
                "true",
                "True",
                1,
                "1",
                "yes",
                "Yes",
            ):

                return self._result(
                    constraint="Rainwater Harvesting",
                    status="PASS",
                    actual=True,
                    required=True,
                    message=(
                        "Rainwater harvesting is provided "
                        "and the retrieved regulations contain "
                        "a direct requirement."
                    ),
                    severity="none",
                    source="Regulation Applicability Engine",
                )

            return self._result(
                constraint="Rainwater Harvesting",
                status="FAIL",
                actual=actual,
                required=True,
                message=(
                    "The applicable regulations indicate that "
                    "rainwater harvesting is required."
                ),
                severity="high",
                source="Regulation Applicability Engine",
            )

        if actual in (
            True,
            "true",
            "True",
            1,
            "1",
            "yes",
            "Yes",
        ):

            return self._result(
                constraint="Rainwater Harvesting",
                status="PASS",
                actual=True,
                required=None,
                message=(
                    "Rainwater harvesting is included in "
                    "the project proposal."
                ),
                severity="none",
                source="Planning proposal",
            )

        return self._result(
            constraint="Rainwater Harvesting",
            status="WARNING",
            actual=actual,
            required=None,
            message=(
                "No directly applicable mandatory rainwater "
                "harvesting requirement was available."
            ),
            severity="medium",
            source="Regulation Applicability Engine",
        )

    # =========================================================
    # MAIN EVALUATION
    # =========================================================

    def evaluate(
        self,
        project: Dict[str, Any],
        architecture: Dict[str, Any] | None = None,
        civil: Dict[str, Any] | None = None,
        sustainability: Dict[str, Any] | None = None,
        municipal: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:

        architecture = dict(
            architecture or {}
        )

        civil = dict(
            civil or {}
        )

        sustainability = dict(
            sustainability or {}
        )

        municipal = dict(
            municipal or {}
        )

        constraints: List[
            Dict[str, Any]
        ] = []

        # =========================================================
        # DETERMINE APPLICABLE REGULATIONS
        # =========================================================

        applicability = (
            self.applicability_engine.analyze(
                project,
                architecture,
                municipal,
            )
        )

        applicable_rules = applicability.get(
            "applicable_rules",
            {},
        )

        if not isinstance(
            applicable_rules,
            dict,
        ):
            applicable_rules = {}

        # =========================================================
        # COPY APPLICABLE RULES INTO MUNICIPAL CONTEXT
        # =========================================================

        municipal_for_constraints = dict(
            municipal
        )

        municipal_for_constraints[
            "regulation_rules"
        ] = applicable_rules

        # =========================================================
        # MAP APPLICABLE COMMERCIAL CONTROLS
        #
        # The Regulation Applicability Engine already knows the
        # applicable FAR, ground coverage and height limits.
        #
        # The individual constraint checks currently read those
        # values from the Architecture result, so synchronize the
        # regulatory values here before running the checks.
        # =========================================================

        # ---------------------------------------------------------
        # FAR
        # ---------------------------------------------------------

        far_rule = applicable_rules.get(
            "far"
        )

        if isinstance(
            far_rule,
            dict,
        ):

            far_limit = far_rule.get(
                "maximum"
            )

            if far_limit is None:
                far_limit = far_rule.get(
                    "max"
                )

            if far_limit is None:
                far_limit = far_rule.get(
                    "maximum_far"
                )

            if far_limit is not None:

                architecture[
                    "maximum_far"
                ] = far_limit

        # ---------------------------------------------------------
        # GROUND COVERAGE
        # ---------------------------------------------------------

        ground_coverage_rule = (
            applicable_rules.get(
                "ground_coverage"
            )
        )

        if isinstance(
            ground_coverage_rule,
            dict,
        ):

            coverage_limit = (
                ground_coverage_rule.get(
                    "maximum_percentage"
                )
            )

            if coverage_limit is None:
                coverage_limit = (
                    ground_coverage_rule.get(
                        "maximum"
                    )
                )

            if coverage_limit is None:
                coverage_limit = (
                    ground_coverage_rule.get(
                        "max_percentage"
                    )
                )

            if coverage_limit is not None:

                architecture[
                    "maximum_ground_coverage_percent"
                ] = coverage_limit

        # ---------------------------------------------------------
        # HEIGHT
        # ---------------------------------------------------------

        height_rule = applicable_rules.get(
            "height"
        )

        if isinstance(
            height_rule,
            dict,
        ):

            height_limit = height_rule.get(
                "maximum_m"
            )

            if height_limit is None:
                height_limit = height_rule.get(
                    "maximum"
                )

            if height_limit is None:
                height_limit = height_rule.get(
                    "max_height_m"
                )

            if height_limit is not None:

                architecture[
                    "maximum_height_m"
                ] = height_limit

        # =========================================================
        # EVALUATE CONSTRAINTS
        # =========================================================

        constraints.append(
            self.check_plot_area(
                project
            )
        )

        constraints.append(
            self.check_far(
                architecture
            )
        )

        constraints.append(
            self.check_ground_coverage(
                architecture
            )
        )

        constraints.append(
            self.check_height(
                architecture
            )
        )

        constraints.append(
            self.check_road_access(
                project,
                civil,
                municipal_for_constraints,
            )
        )

        constraints.append(
            self.check_parking(
                project,
                civil,
                architecture,
                municipal_for_constraints,
            )
        )

        constraints.append(
            self.check_green_area(
                sustainability,
                municipal_for_constraints,
            )
        )

        constraints.append(
            self.check_rainwater(
                sustainability,
                municipal_for_constraints,
            )
        )

        # =========================================================
        # COUNT RESULTS
        # =========================================================

        passed = sum(
            1
            for item in constraints
            if item["status"] == "PASS"
        )

        warnings = sum(
            1
            for item in constraints
            if item["status"] == "WARNING"
        )

        failed = sum(
            1
            for item in constraints
            if item["status"] == "FAIL"
        )

        total = len(
            constraints
        )

        # =========================================================
        # OVERALL CONSTRAINT STATUS
        # =========================================================

        if failed > 0:

            status = "FAIL"

        elif warnings > 0:

            status = "WARNING"

        else:

            status = "PASS"

        # =========================================================
        # COMPLIANCE SCORE
        # =========================================================

        compliance_score = (
            round(
                (passed / total) * 100,
                2,
            )
            if total
            else 0
        )

        # =========================================================
        # RETURN
        # =========================================================

        return {
            "status": status,

            "compliance_score":
                compliance_score,

            "applicability":
                applicability,

            "summary": {
                "total_constraints":
                    total,

                "passed":
                    passed,

                "warnings":
                    warnings,

                "failed":
                    failed,
            },

            "constraints":
                constraints,
        }

# =============================================================
# SHARED INSTANCE
# =============================================================

constraint_engine = ConstraintEngine()