from pydantic import BaseModel, Field
from typing import Literal, Optional


class WorkbookCreateRequest(BaseModel):
    client_name: str = Field(min_length=2, max_length=200)
    financial_year: str = Field(min_length=4, max_length=20)
    functional_currency: str = Field(min_length=2, max_length=80)
    engagement_type: Optional[str] = Field(default=None, max_length=120)
    assessment_year: Optional[str] = Field(default=None, max_length=40)
    industry_type: Optional[str] = Field(default=None, max_length=120)
    reporting_framework: Optional[str] = Field(default=None, max_length=120)
    tax_id: Optional[str] = Field(default=None, max_length=80)
    materiality_threshold: Optional[float] = None


class WorkbookEntityConfigRequest(BaseModel):
    entity_name: str = Field(min_length=2, max_length=200)
    financial_year: str = Field(min_length=4, max_length=40)
    ledger_type: str = Field(min_length=2, max_length=80)
    functional_currency: str = Field(min_length=2, max_length=80)
    reporting_currency: Optional[str] = Field(default=None, max_length=80)
    company_code: Optional[str] = Field(default=None, max_length=80)
    header_row: Optional[int] = None
    column_mappings: Optional[dict[str, str]] = Field(default_factory=dict)


class WorkbookEntityConfigOut(BaseModel):
    entity_name: str
    financial_year: str
    ledger_type: str
    functional_currency: str
    reporting_currency: Optional[str] = None
    company_code: Optional[str] = None
    header_row: Optional[int] = None
    column_mappings: Optional[dict[str, str]] = None


class WorkbookAnalysisSummaryOut(BaseModel):
    total_entries: int = 0
    rule_flagged: int = 0
    ml_flagged: int = 0
    total_flagged: int = 0
    pct_flagged: float = 0


class WorkbookOut(BaseModel):
    id: str
    client_name: str
    financial_year: str
    functional_currency: str
    engagement_type: Optional[str] = None
    assessment_year: Optional[str] = None
    industry_type: Optional[str] = None
    reporting_framework: Optional[str] = None
    tax_id: Optional[str] = None
    materiality_threshold: Optional[float] = None
    status: Literal['Draft', 'In Progress', 'Completed']
    last_modified: str
    risk_score: int
    has_entity_config: bool = False
    entity_config: Optional[WorkbookEntityConfigOut] = None
    column_mappings: Optional[dict[str, str]] = None
    review_rows: Optional[list[dict]] = None
    analysis_summary: Optional[WorkbookAnalysisSummaryOut] = None
    category_counts: Optional[list] = None
