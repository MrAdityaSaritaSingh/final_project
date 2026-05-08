import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from services.query_parser import parse_natural_language_query

def test_parser():
    context = {
        "categories": ["Round Numbers", "Weekend Entries", "Period End", "Weak Narration", "Duplicate Check", "Manual Journal"]
    }
    
    test_cases = [
        ("above 5 lakh", "min_amount", 500000.0),
        ("below 1,00,000", "max_amount", 100000.0),
        ("journal entries in Q4", "voucher_types", ["journal"]),
        ("journal entries in Q4", "quarter", "q4"),
        ("above 2 crore", "min_amount", 20000000.0),
        ("weekend entries", "scrutiny_category", "Weekend Entries"),
        ("round number transactions above 50k", "scrutiny_category", "Round Numbers"),
        ("round number transactions above 50k", "min_amount", 50000.0),
        ("top 10% expenses", "amount_preset", "top10expenses"),
        ("largest transactions", "sort_by", "amount"),
        ("largest transactions", "sort_order", "desc"),
        ("unknown query string", "search_text", "unknown query string"),
    ]
    
    passed = 0
    for query, key, expected in test_cases:
        result = parse_natural_language_query(query, context)
        actual = getattr(result.filters, key)
        if actual == expected:
            print(f"✅ PASS: '{query}' -> {key}={actual}")
            passed += 1
        else:
            print(f"❌ FAIL: '{query}' -> Expected {key}={expected}, got {actual}")
            
    print(f"\nSummary: {passed}/{len(test_cases)} passed")

if __name__ == "__main__":
    test_parser()
