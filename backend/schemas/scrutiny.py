from pydantic import BaseModel, Field


class SummaryResponse(BaseModel):
    total_entries: int
    rule_flagged: int
    ml_flagged: int
    total_flagged: int
    pct_flagged: float


class CategoryCount(BaseModel):
    category: str
    count: int


class ScrutinyResponse(BaseModel):
    summary: SummaryResponse
    category_counts: list[CategoryCount]
    flagged_rows: list[dict]
