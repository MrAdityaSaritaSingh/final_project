# agents/reporter_agent.py
# ReporterAgent — calls scrutiny/exporter.py to produce Excel + JSON summary.
# Responsibilities:
#   - Export the flagged DataFrame to a styled Excel Scrutiny Register
#   - Return the Excel bytes for download (Streamlit) or disk write
#   - Build a JSON-serialisable summary dict for logging/display

import json
from .base_agent import BaseAgent
from scrutiny.exporter import export


class ReporterAgent(BaseAgent):
    """
    Stage 3 (final) of the audit pipeline.

    Accepted payload keys:
        df            (pd.DataFrame) : flagged GL from DetectorAgent
        rule_flagged  (int)          : rows flagged by rules
        ml_flagged    (int)          : rows flagged by ML
        total_flagged (int)          : total flagged rows
        row_count     (int)          : total rows in the GL

    Returned payload keys (merged with incoming payload):
        excel_bytes (bytes) : .xlsx file content for download
        summary     (dict)  : JSON-serialisable run summary
    """

    def __init__(self, output_path: str = None):
        """
        Args:
            output_path : if provided, save the Excel report to this path.
        """
        super().__init__("ReporterAgent")
        self.output_path = output_path

    def _execute(self, payload: dict) -> dict:
        df            = payload["df"]
        total_flagged = payload.get("total_flagged", int(df["scrutiny_flag"].sum()))
        row_count     = payload.get("row_count", len(df))

        self.log("Generating Excel Scrutiny Register ...")
        excel_bytes = export(df, output_path=self.output_path)
        self.log(
            f"Excel report ready — {len(excel_bytes):,} bytes, "
            f"{total_flagged:,} flagged rows exported."
        )

        pct = round(total_flagged / row_count * 100, 1) if row_count else 0
        summary = {
            "total_rows":    row_count,
            "rule_flagged":  payload.get("rule_flagged", 0),
            "ml_flagged":    payload.get("ml_flagged", 0),
            "total_flagged": total_flagged,
            "pct_flagged":   pct,
        }

        self.log(f"Summary: {json.dumps(summary)}")

        return {
            **payload,
            "excel_bytes": excel_bytes,
            "summary":     summary,
        }
