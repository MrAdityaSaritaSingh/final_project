import re
from typing import List, Dict, Any, Optional
from schemas.nlp import ParsedFilters, MatchedRule, NLPQueryResponse

# ── Module Level Constants (Pre-compiled Regex) ───────────────────────────────

# Pattern for "above 5 lakh", "greater than 1,00,000", "> 50k"
# Removed standalone 'l' to avoid collision with words like 'ledger'
AMOUNT_ABOVE_PAT = re.compile(r"(?:above|greater than|more than|>|over)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|cr|crore|k)?", re.IGNORECASE)

# Pattern for "below 1 lakh", "under 50k", "< 10000"
AMOUNT_BELOW_PAT = re.compile(r"(?:below|less than|under|<)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|cr|crore|k)?", re.IGNORECASE)

# Pattern for Q1, Q2, Q3, Q4, Quarter 1, Quarter End
QUARTER_PAT = re.compile(r"q([1-4])\b|quarter\s*([1-4])\b|quarter\s*end", re.IGNORECASE)

# Pattern for Top 10% preset
AMOUNT_PRESET_PAT = re.compile(r"top\s*10\s*%?\s*(expense|entry)", re.IGNORECASE)

# Voucher type mapping
VCH_MAP = {
    "journal": "journal",
    "jv": "journal",
    "payment": "payment",
    "receipt": "receipt",
    "contra": "contra",
    "manual": "journal" # Manual usually implies JV in this context
}

def parse_natural_language_query(query: str, context: Dict[str, Any]) -> NLPQueryResponse:
    """
    Tier 1 Deterministic Parser.
    Converts natural language queries into structured filters using regex rules.
    """
    query_clean = query.lower().strip()
    filters = ParsedFilters()
    matched_rules = []
    assumptions = []

    # 0. Explicit keyword search: "search fooding expense" → search_text="fooding expense"
    search_prefix = re.match(r"^(?:search|find|show|list|get)\s+(?:for\s+)?(.+)$", query_clean)
    explicit_search_term = None
    if search_prefix:
        candidate = search_prefix.group(1).strip()
        # Only treat as keyword search if the remainder doesn't contain filter-like patterns
        has_filter_hints = any(kw in candidate for kw in [
            "above", "below", "greater", "less", "lakh", "crore", "journal",
            "payment", "receipt", "contra", "weekend", "quarter", "flagged",
            "top 10", "largest", "newest", "round number"
        ])
        if not has_filter_hints:
            explicit_search_term = candidate
    
    # 1. Amount Thresholds (Min)
    match = AMOUNT_ABOVE_PAT.search(query_clean)
    if match:
        val_str = match.group(1).replace(",", "")
        multiplier_str = (match.group(2) or "").lower()
        val = float(val_str)
        
        if multiplier_str in ["lakh", "lac"]:
            val *= 100000
            assumptions.append(f"Interpreted '{match.group(1)} {multiplier_str}' as ₹{val:,.0f}")
        elif multiplier_str in ["cr", "crore"]:
            val *= 10000000
            assumptions.append(f"Interpreted '{match.group(1)} {multiplier_str}' as ₹{val:,.0f}")
        elif multiplier_str == "k":
            val *= 1000
            assumptions.append(f"Interpreted '{match.group(1)}k' as ₹{val:,.0f}")
            
        filters.min_amount = val
        matched_rules.append(MatchedRule(name="amount_above", pattern=match.group(0), extracted=str(val)))

    # 2. Amount Below (Max)
    match = AMOUNT_BELOW_PAT.search(query_clean)
    if match:
        val_str = match.group(1).replace(",", "")
        multiplier_str = (match.group(2) or "").lower()
        val = float(val_str)
        if multiplier_str in ["lakh", "lac"]: 
            val *= 100000
            assumptions.append(f"Interpreted '{match.group(1)} {multiplier_str}' as ₹{val:,.0f}")
        elif multiplier_str in ["cr", "crore"]: 
            val *= 10000000
            assumptions.append(f"Interpreted '{match.group(1)} {multiplier_str}' as ₹{val:,.0f}")
        elif multiplier_str == "k":
            val *= 1000
            assumptions.append(f"Interpreted '{match.group(1)}k' as ₹{val:,.0f}")
        filters.max_amount = val
        matched_rules.append(MatchedRule(name="amount_below", pattern=match.group(0), extracted=str(val)))

    # 3. Voucher Types
    found_vchs = []
    for keyword, canonical in VCH_MAP.items():
        if re.search(rf"\b{keyword}\b", query_clean):
            if canonical not in found_vchs:
                found_vchs.append(canonical)
                matched_rules.append(MatchedRule(name="voucher_type", pattern=keyword, extracted=canonical))
    if found_vchs:
        filters.voucher_types = found_vchs
        assumptions.append(f"Mapped keywords to voucher types: {', '.join(found_vchs)}")

    # 4. Quarters
    q_match = QUARTER_PAT.search(query_clean)
    if q_match:
        q_val = q_match.group(1) or q_match.group(2) or "4" # default to q4 for "quarter end"
        filters.quarter = f"q{q_val}"
        matched_rules.append(MatchedRule(name="quarter", pattern=q_match.group(0), extracted=f"q{q_val}"))

    # 5. Scrutiny Categories (from metadata context)
    available_cats = context.get("categories", [
        "Round Numbers", "Weekend Entries", "Period End", 
        "Weak Narration", "Duplicate Check", "Manual Journal", "ML Anomaly"
    ])
    for cat in available_cats:
        cat_key = cat.lower().replace(" ", r"\s*")
        if re.search(rf"\b{cat_key}\b", query_clean):
            filters.scrutiny_category = cat
            matched_rules.append(MatchedRule(name="category", pattern=cat, extracted=cat))
            break # Take first match
    
    # Special aliases for categories
    if not filters.scrutiny_category:
        if "weekend" in query_clean:
            filters.scrutiny_category = "Weekend Entries"
            matched_rules.append(MatchedRule(name="category_alias", pattern="weekend", extracted="Weekend Entries"))
        elif "round" in query_clean:
            filters.scrutiny_category = "Round Numbers"
            matched_rules.append(MatchedRule(name="category_alias", pattern="round", extracted="Round Numbers"))
        elif "anomaly" in query_clean or "suspicious" in query_clean:
            filters.scrutiny_category = "ML Anomaly"
            matched_rules.append(MatchedRule(name="category_alias", pattern="anomaly", extracted="ML Anomaly"))

    # 6. Flagged Only
    if any(k in query_clean for k in ["flagged", "suspicious", "risky", "high risk"]):
        filters.transaction_type = "flagged"
        matched_rules.append(MatchedRule(name="flagged_only", pattern="flagged", extracted="flagged"))

    # 7. Presets
    if AMOUNT_PRESET_PAT.search(query_clean):
        filters.amount_preset = "top10expenses"
        matched_rules.append(MatchedRule(name="amount_preset", pattern="top 10%", extracted="top10expenses"))

    # 8. Sort
    if "largest" in query_clean or "highest" in query_clean:
        filters.sort_by = "amount"
        filters.sort_order = "desc"
        matched_rules.append(MatchedRule(name="sort", pattern="largest", extracted="amount desc"))
    elif "newest" in query_clean or "latest" in query_clean:
        filters.sort_by = "date"
        filters.sort_order = "desc"
        matched_rules.append(MatchedRule(name="sort", pattern="newest", extracted="date desc"))

    # Build Intent String
    intent_parts = []
    if filters.voucher_types: intent_parts.append(f"{', '.join(filters.voucher_types).title()} entries")
    else: intent_parts.append("Transactions")
    
    if filters.min_amount and filters.max_amount:
        intent_parts.append(f"between ₹{filters.min_amount:,.0f} and ₹{filters.max_amount:,.0f}")
    elif filters.min_amount:
        intent_parts.append(f"above ₹{filters.min_amount:,.0f}")
    elif filters.max_amount:
        intent_parts.append(f"below ₹{filters.max_amount:,.0f}")
        
    if filters.quarter:
        intent_parts.append(f"in {filters.quarter.upper()}")
        
    if filters.scrutiny_category:
        intent_parts.append(f"flagged as '{filters.scrutiny_category}'")
    
    intent = " ".join(intent_parts)
    
    # If no rules matched, fall back to text search
    tier = "deterministic"
    confidence = 1.0
    if explicit_search_term and not matched_rules:
        # Explicit search: "search fooding expense" → keyword search across all transactions
        filters.search_text = explicit_search_term
        filters.transaction_type = "review"  # Search across ALL transactions
        intent = f"Search for '{explicit_search_term}'"
        tier = "deterministic"
        confidence = 1.0
        matched_rules.append(MatchedRule(name="keyword_search", pattern="search", extracted=explicit_search_term))
        assumptions.append("Searching across all transactions (not just flagged)")
    elif not matched_rules:
        # Pure fallback: strip common prefixes before passing as search text
        fallback_text = re.sub(r"^(?:search|find|show|list|get)\s+(?:for\s+)?", "", query, flags=re.IGNORECASE).strip()
        filters.search_text = fallback_text or query
        filters.transaction_type = "review"  # Search across ALL transactions
        intent = f"Search for '{fallback_text or query}'"
        tier = "fallback"
        confidence = 0.5

    return NLPQueryResponse(
        intent=intent,
        assumptions=assumptions,
        filters=filters,
        matched_rules=matched_rules,
        confidence=confidence,
        tier=tier
    )
