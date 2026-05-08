# agents/validator_agent.py
# ValidatorAgent — wraps scrutiny/ingestor.py.
# Responsibilities:
#   - Load the GL file (.csv or .xlsx)
#   - Validate mandatory columns and data types via ingestor.ingest()
#   - Produce a missing-field report on SchemaError
#   - Pass the clean DataFrame downstream

from .base_agent import BaseAgent
from scrutiny.ingestor import ingest, SchemaError


class ValidatorAgent(BaseAgent):
    """
    Stage 1 of the audit pipeline.

    Accepted payload keys:
        filepath (str) : path to the GL file (.csv or .xlsx)

    Returned payload keys:
        df         (pd.DataFrame) : clean, normalised GL data
        filepath   (str)          : echoed back for reference
        row_count  (int)          : number of rows loaded
    """

    def __init__(self):
        super().__init__("ValidatorAgent")

    def _execute(self, payload: dict) -> dict:
        filepath = payload["filepath"]
        self.log(f"Ingesting file: {filepath}")

        try:
            df = ingest(filepath)
        except SchemaError as exc:
            self.log(f"Schema validation FAILED: {exc}")
            raise  # re-raise so Orchestrator can handle

        row_count = len(df)
        self.log(f"Validation passed — {row_count:,} rows loaded.")
        self.log(
            f"Columns: {', '.join(df.columns.tolist())}"
        )

        return {
            **payload,
            "df":        df,
            "row_count": row_count,
        }
