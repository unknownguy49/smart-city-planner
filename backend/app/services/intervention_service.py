from typing import Any, Dict

from app.agents.planner import run_agents

from app.services.scenario_generator import scenario_generator
from app.services.constraint_engine import ConstraintEngine
from app.services.scoring_engine import ScoringEngine


class InterventionService:
    """
    Handles map-based smart-city interventions.

    Flow:

        Map Intervention
              ↓
        Scenario Generator
              ↓
        5 AI Agents
              ↓
        Constraint Engine
              ↓
        Scoring Engine
              ↓
        Intervention Result
    """

    def __init__(self):
        self.constraint_engine = ConstraintEngine()
        self.scoring_engine = ScoringEngine()

    # =========================================================
    # ANALYZE INTERVENTION
    # =========================================================

    def analyze(
        self,
        project: Dict[str, Any],
        intervention: str,
        parameters: Dict[str, Any],
    ) -> Dict[str, Any]:

        # =====================================================
        # 1. Generate intervention scenario
        # =====================================================

        scenario_project = (
            scenario_generator.apply_intervention(
                project=project,
                intervention=intervention,
                parameters=parameters,
            )
        )

        # =====================================================
        # 2. Run the existing 5-agent planner
        # =====================================================

        agent_analysis = run_agents(
            scenario_project
        )

        # =====================================================
        # 3. Extract agent results
        # =====================================================

        architecture_result = (
            agent_analysis.get(
                "architecture",
                {},
            )
        )

        civil_result = (
            agent_analysis.get(
                "civil",
                {},
            )
        )

        sustainability_result = (
            agent_analysis.get(
                "sustainability",
                {},
            )
        )

        municipal_result = (
            agent_analysis.get(
                "municipal",
                {},
            )
        )

        citizen_result = (
            agent_analysis.get(
                "citizen",
                {},
            )
        )

        # =====================================================
        # 4. Evaluate constraints
        #
        # IMPORTANT:
        # Pass the agent results into ConstraintEngine.
        # Without these, most constraints cannot be evaluated
        # correctly and the compliance score becomes artificially
        # low.
        # =====================================================

        constraint_result = (
            self.constraint_engine.evaluate(
                project=scenario_project,

                architecture=architecture_result,

                civil=civil_result,

                sustainability=sustainability_result,

                municipal=municipal_result,
            )
        )

        # =====================================================
        # 5. Calculate planning score
        # =====================================================

        scoring_result = (
            self.scoring_engine.calculate(
                architecture=architecture_result,

                civil=civil_result,

                sustainability=sustainability_result,

                municipal=municipal_result,

                citizen=citizen_result,
            )
        )

        # =====================================================
        # 6. Determine intervention status
        # =====================================================

        constraint_status = (
            constraint_result.get(
                "status",
                "UNKNOWN",
            )
        )

        if constraint_status == "PASS":

            intervention_status = (
                "Feasible"
            )

        elif constraint_status == "WARNING":

            intervention_status = (
                "Feasible with conditions"
            )

        elif constraint_status == "FAIL":

            intervention_status = (
                "Not feasible"
            )

        else:

            intervention_status = (
                "Requires review"
            )

        # =====================================================
        # 7. Return complete intervention result
        # =====================================================

        return {

            # -------------------------------------------------
            # Intervention
            # -------------------------------------------------

            "intervention": {

                "type":
                    intervention,

                "parameters":
                    parameters,

            },

            # -------------------------------------------------
            # Scenario
            # -------------------------------------------------

            "scenario_project":
                scenario_project,

            # -------------------------------------------------
            # Overall status
            # -------------------------------------------------

            "status":
                intervention_status,

            # -------------------------------------------------
            # Constraint evaluation
            # -------------------------------------------------

            "constraints":
                constraint_result,

            # -------------------------------------------------
            # Planning score
            # -------------------------------------------------

            "scoring":
                scoring_result,

            # -------------------------------------------------
            # Individual agents
            # -------------------------------------------------

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

            # -------------------------------------------------
            # Overall planning decision
            # -------------------------------------------------

            "planning_decision":
                agent_analysis.get(
                    "planning_decision",
                    {},
                ),

            # -------------------------------------------------
            # Site / OSM information
            # -------------------------------------------------

            "osm":
                agent_analysis.get(
                    "osm",
                    {},
                ),

            # -------------------------------------------------
            # Project summary
            # -------------------------------------------------

            "project_summary":
                agent_analysis.get(
                    "project_summary",
                    {},
                ),
        }


# ============================================================
# SINGLETON
# ============================================================

intervention_service = InterventionService()