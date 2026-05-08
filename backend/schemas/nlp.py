from pydantic import BaseModel, Field
from typing import List, Optional, Any

class ParsedFilters(BaseModel):
    """Maps 1:1 to the GET /transactions query params."""
    transaction_type: Optional[str] = None
    search_text: Optional[str] = None
    scrutiny_category: Optional[str] = None
    quarter: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    ledger_type: Optional[str] = None
    financial_year: Optional[str] = None
    voucher_types: Optional[List[str]] = None
    account_series: Optional[str] = None
    amount_preset: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None

class MatchedRule(BaseModel):
    name: str
    pattern: str
    extracted: str

class NLPQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)

class NLPQueryResponse(BaseModel):
    intent: str
    assumptions: List[str]
    filters: ParsedFilters
    matched_rules: List[MatchedRule]
    confidence: float
    tier: str
