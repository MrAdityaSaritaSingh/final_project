# agents/orchestrator.py
# Orchestrator — chains ValidatorAgent → DetectorAgent → ReporterAgent.
# Responsibilities:
#   - Instantiate and wire the three agents in the correct order
#   - Pass the result payload from one agent to the next
#   - Catch and surface errors between agents (so failures don't silently pass)
#   - Collect and return all agent logs for UI display

from .validator_agent import ValidatorAgent
from .detector_agent import DetectorAgent
from .reporter_agent import ReporterAgent


class Orchestrator:
    """
    Master pipeline runner.

    Usage:
        orch   = Orchestrator(use_ml=True)
        result = orch.run("data/gl.csv")

        # result keys:
        #   df            (pd.DataFrame) : fully flagged GL
        #   excel_bytes   (bytes)        : .xlsx report
        #   summary       (dict)         : run statistics
        #   logs          (list[str])    : timestamped log from all agents
    """

    def __init__(
        self,
        use_ml: bool = True,
        contamination: float = 0.05,
        output_path: str = None,
    ):
        """
        Args:
            use_ml        : whether DetectorAgent runs Isolation Forest
            contamination : Isolation Forest contamination parameter
            output_path   : if provided, ReporterAgent saves Excel here
        """
        self.validator = ValidatorAgent()
        self.detector  = DetectorAgent(use_ml=use_ml, contamination=contamination)
        self.reporter  = ReporterAgent(output_path=output_path)

    def run(self, filepath: str) -> dict:
        """
        Execute the full pipeline: Validate → Detect → Report.

        Args:
            filepath : path to the GL .csv or .xlsx file

        Returns:
            dict with keys: df, excel_bytes, summary, logs

        Raises:
            SchemaError   : if the file fails validation (from ValidatorAgent)
            Exception     : any unexpected error propagates with an annotated message
        """
        payload = {"filepath": filepath}

        # ── Stage 1: Validate ─────────────────────────────────────────────────
        try:
            payload = self.validator.run(payload)
        except Exception as exc:
            raise RuntimeError(f"[ValidatorAgent] {exc}") from exc

        # ── Stage 2: Detect ────────────────────────────────────────────────────
        try:
            payload = self.detector.run(payload)
        except Exception as exc:
            raise RuntimeError(f"[DetectorAgent] {exc}") from exc

        # ── Stage 3: Report ────────────────────────────────────────────────────
        try:
            payload = self.reporter.run(payload)
        except Exception as exc:
            raise RuntimeError(f"[ReporterAgent] {exc}") from exc

        # ── Collect all logs ───────────────────────────────────────────────────
        payload["logs"] = (
            self.validator.get_logs()
            + self.detector.get_logs()
            + self.reporter.get_logs()
        )

        return payload
