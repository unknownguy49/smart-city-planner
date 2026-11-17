from __future__ import annotations

from typing import Any, Dict, List, Optional


class RegulationApplicabilityEngine:
    """
    Determines which structured regulatory controls are directly
    applicable to a project.

    Important:
    - Regulatory values are only added when they are supported by
      the current regulation mapping.
    - Unknown requirements are left empty rather than invented.
    - Jurisdiction is always respected.
    """

    # ---------------------------------------------------------
    # NORMALIZATION HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _normalize(value: Any) -> str:
        if value is None:
            return ""

        return (
            str(value)
            .strip()
            .lower()
            .replace("-", " ")
            .replace("_", " ")
        )

    @classmethod
    def _normalize_jurisdiction(cls, value: Any) -> str:
        value = cls._normalize(value)

        aliases = {
            "ap": "andhra pradesh",
            "andhra pradesh": "andhra pradesh",
            "telangana": "telangana",
            "ts": "telangana",
        }

        return aliases.get(value, value)

    @classmethod
    def _normalize_subtype(cls, value: Any) -> str:
        value = cls._normalize(value)

        aliases = {
            "sector shopping": "sector shopping",
            "sector shopping centre": "sector shopping",
            "sector shopping center": "sector shopping",
            "sector shopping commercial development":
                "sector shopping",
            "shopping": "sector shopping",
        }

        return aliases.get(value, value)

    @classmethod
    def _normalize_building_type(cls, value: Any) -> str:
        value = cls._normalize(value)

        aliases = {
            "commercial building": "commercial",
            "commercial development": "commercial",
            "shopping": "commercial",
            "shop": "commercial",
            "retail": "commercial",
        }

        return aliases.get(value, value)

    # ---------------------------------------------------------
    # DISPLAY NAME HELPERS
    # ---------------------------------------------------------

    @staticmethod
    def _display_selected_use(
        commercial_subtype: str,
    ) -> str:
        """
        Convert the normalized subtype into the canonical display
        name used by the regulation mappings.
        """

        display_names = {
            "sector shopping": "Sector Shopping",
        }

        return display_names.get(
            commercial_subtype,
            commercial_subtype,
        )

    # ---------------------------------------------------------
    # PROJECT CONTEXT
    # ---------------------------------------------------------

    def _get_jurisdiction(
        self,
        project: Dict[str, Any],
    ) -> str:

        jurisdiction = (
            project.get("jurisdiction")
            or project.get("state")
            or ""
        )

        return self._normalize_jurisdiction(
            jurisdiction
        )

    def _get_building_type(
        self,
        project: Dict[str, Any],
    ) -> str:

        return self._normalize_building_type(
            project.get("building_type")
        )

    def _get_commercial_subtype(
        self,
        project: Dict[str, Any],
        architecture: Optional[Dict[str, Any]] = None,
    ) -> str:

        architecture = architecture or {}

        subtype = (
            project.get("commercial_subtype")
            or architecture.get("commercial_subtype")
            or ""
        )

        return self._normalize_subtype(
            subtype
        )

    # ---------------------------------------------------------
    # ANDHRA PRADESH CONTROLS
    # ---------------------------------------------------------

    def _andhra_pradesh_controls(
        self,
        project: Dict[str, Any],
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        building_type = self._get_building_type(
            project
        )

        subtype = self._get_commercial_subtype(
            project,
            architecture,
        )

        applicable_rules: Dict[str, Any] = {}

        # -----------------------------------------------------
        # COMMERCIAL DEVELOPMENT
        # -----------------------------------------------------

        if building_type == "commercial":

            # ---------------------------------------------
            # SECTOR SHOPPING
            # ---------------------------------------------

            if subtype == "sector shopping":

                applicable_rules["far"] = {
                    "maximum": 2.0,
                    "value": 2.0,
                    "unit": "FAR",
                    "source": "AP 2024 Table 24",
                    "use": "Sector Shopping",
                }

                applicable_rules["ground_coverage"] = {
                    "maximum_percentage": 30.0,
                    "percentage": 30.0,
                    "unit": "%",
                    "source": "AP 2024 Table 24",
                    "use": "Sector Shopping",
                }

                applicable_rules["height"] = {
                    "maximum_m": 24.0,
                    "height_m": 24.0,
                    "unit": "m",
                    "source": "AP 2024 Table 24",
                    "use": "Sector Shopping",
                }

                # -------------------------------------------------
                # GREEN AREA
                # -------------------------------------------------

                applicable_rules["green_area"] = [
                    {
                        "minimum_percentage": 20.0,
                        "percentage": 20.0,
                        "unit": "%",
                        "source": "AP applicable green-area provision",
                        "use": "Sector Shopping",
                    }
                ]

                # -------------------------------------------------
                # ROAD ACCESS
                # -------------------------------------------------

                applicable_rules["road_width"] = [
                    {
                        "minimum_width_m": 12.0,
                        "required_width_m": 12.0,
                        "width_m": 12.0,
                        "unit": "m",
                        "source": "AP 2024 site/access provision",
                        "use": "Sector Shopping",
                    }
                ]

                # -------------------------------------------------
                # PARKING
                #
                # Deliberately left empty because the currently
                # extracted structured parking table does not
                # provide a directly mapped Sector Shopping rate.
                # -------------------------------------------------

                applicable_rules["parking"] = []

                # -------------------------------------------------
                # RAINWATER
                # -------------------------------------------------

                applicable_rules["rainwater"] = [
                    {
                        "requirement": (
                            "Rainwater harvesting provisions "
                            "should be incorporated where applicable."
                        ),
                        "source": "AP regulations",
                    }
                ]

        return applicable_rules

    # ---------------------------------------------------------
    # TELANGANA
    # ---------------------------------------------------------

    def _telangana_controls(
        self,
        project: Dict[str, Any],
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        """
        Telangana currently has no structured controls added here.

        This is intentional.

        The system must not reuse Andhra Pradesh values for a
        Telangana project merely because the same commercial subtype
        exists there.
        """

        return {}

    # ---------------------------------------------------------
    # GENERIC / UNKNOWN JURISDICTION
    # ---------------------------------------------------------

    def _empty_controls(
        self,
    ) -> Dict[str, Any]:

        return {}

    # ---------------------------------------------------------
    # MAIN CONTROL SELECTION
    # ---------------------------------------------------------

    def _get_applicable_rules(
        self,
        project: Dict[str, Any],
        architecture: Dict[str, Any],
    ) -> Dict[str, Any]:

        jurisdiction = self._get_jurisdiction(
            project
        )

        if jurisdiction == "andhra pradesh":

            return self._andhra_pradesh_controls(
                project,
                architecture,
            )

        if jurisdiction == "telangana":

            return self._telangana_controls(
                project,
                architecture,
            )

        return self._empty_controls()

    # ---------------------------------------------------------
    # FLATTEN RULE INFORMATION
    # ---------------------------------------------------------

    @staticmethod
    def _rule_summary(
        applicable_rules: Dict[str, Any],
    ) -> List[Dict[str, Any]]:

        summary: List[Dict[str, Any]] = []

        for category, rules in applicable_rules.items():

            if isinstance(rules, list):

                for rule in rules:

                    if isinstance(rule, dict):

                        summary.append(
                            {
                                "category": category,
                                **rule,
                            }
                        )

            elif isinstance(rules, dict):

                summary.append(
                    {
                        "category": category,
                        **rules,
                    }
                )

        return summary

    # ---------------------------------------------------------
    # MAIN API
    # ---------------------------------------------------------

    def analyze(
        self,
        project: Dict[str, Any],
        architecture: Optional[Dict[str, Any]] = None,
        municipal: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        architecture = architecture or {}
        municipal = municipal or {}

        jurisdiction = self._get_jurisdiction(
            project
        )

        building_type = self._get_building_type(
            project
        )

        commercial_subtype = (
            self._get_commercial_subtype(
                project,
                architecture,
            )
        )

        # -----------------------------------------------------
        # CANONICAL SELECTED USE
        #
        # This is intentionally separate from the normalized
        # commercial_subtype because existing tests and consumers
        # expect the selected regulation use name.
        # -----------------------------------------------------

        selected_use = self._display_selected_use(
            commercial_subtype
        )

        applicable_rules = (
            self._get_applicable_rules(
                project,
                architecture,
            )
        )

        rules_summary = self._rule_summary(
            applicable_rules
        )

        # -----------------------------------------------------
        # APPLICABILITY STATUS
        # -----------------------------------------------------

        if applicable_rules:

            applicability_status = (
                "Applicable regulatory controls identified."
            )

        else:

            applicability_status = (
                "No structured regulatory controls were "
                "identified for the supplied jurisdiction "
                "and development type."
            )

        # -----------------------------------------------------
        # RETURN
        # -----------------------------------------------------

        return {
            "jurisdiction": jurisdiction,

            "building_type": building_type,

            "commercial_subtype": commercial_subtype,

            "selected_use": selected_use,

            "applicability_status": applicability_status,

            "applicable_rules": applicable_rules,

            "rules_summary": rules_summary,

            "source_context": {
                "jurisdiction": jurisdiction,
                "building_type": building_type,
                "commercial_subtype": commercial_subtype,
                "selected_use": selected_use,
            },

            "municipal_context": municipal,
        }


# -------------------------------------------------------------
# SHARED INSTANCE
# -------------------------------------------------------------

regulation_applicability_engine = (
    RegulationApplicabilityEngine()
)