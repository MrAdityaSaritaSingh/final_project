# agents/base_agent.py
# BaseAgent — abstract base class for all pipeline agents.
# Every agent must inherit this and implement _execute().
#
# Responsibilities:
#   - Uniform run() entry point
#   - Structured timestamped logging via log()
#   - Abstract _execute() enforces consistent agent contract

from abc import ABC, abstractmethod
from datetime import datetime


class BaseAgent(ABC):
    """
    Abstract base class for all audit pipeline agents.

    Subclasses must implement _execute(payload) -> dict.
    Call run(payload) to execute the agent; it wraps _execute()
    with start/end log entries and returns the result dict.
    """

    def __init__(self, name: str):
        """
        Args:
            name : human-readable agent name used in log messages.
        """
        self.name = name
        self._logs: list[str] = []

    # ── Public API ─────────────────────────────────────────────────────────────

    def run(self, payload: dict) -> dict:
        """
        Execute the agent.

        Args:
            payload : dict passed from the previous agent (or initial input).

        Returns:
            dict — result payload forwarded to the next agent.
        """
        self.log("Starting.")
        result = self._execute(payload)
        self.log("Done.")
        return result

    def log(self, message: str) -> None:
        """Append a timestamped log entry."""
        ts = datetime.now().strftime("%H:%M:%S")
        entry = f"{ts} | {self.name} | {message}"
        self._logs.append(entry)

    def get_logs(self) -> list[str]:
        """Return a copy of this agent's log entries."""
        return self._logs.copy()

    # ── Abstract ───────────────────────────────────────────────────────────────

    @abstractmethod
    def _execute(self, payload: dict) -> dict:
        """
        Core agent logic. Must be implemented by every subclass.

        Args:
            payload : dict from the previous agent or initial caller.

        Returns:
            dict — updated payload forwarded downstream.
        """
        ...
