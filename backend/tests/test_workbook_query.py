import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"
WORKBOOK_ID = "69fe31449d266ce3ed07ce08"

def make_request(url, params=None):
    if params:
        query_string = urllib.parse.urlencode(params)
        url = f"{url}?{query_string}"
    try:
        with urllib.request.urlopen(url) as response:
            return response.getcode(), json.loads(response.read().decode())
    except Exception as e:
        print(f"Error requesting {url}: {e}")
        return 500, None

def test_transactions_pagination():
    print("Testing Transactions Pagination...")
    url = f"{BASE_URL}/api/workbooks/{WORKBOOK_ID}/transactions"
    params = {"page": 1, "limit": 10, "transaction_type": "flagged"}
    status, data = make_request(url, params)
    assert status == 200
    assert "transactions" in data
    assert len(data["transactions"]) <= 10
    assert "total" in data
    print(f"Success: Found {data['total']} total transactions, returned {len(data['transactions'])}")

def test_transactions_filtering():
    print("Testing Transactions Filtering (Search)...")
    url = f"{BASE_URL}/api/workbooks/{WORKBOOK_ID}/transactions"
    params = {"search_text": "payment", "limit": 10}
    status, data = make_request(url, params)
    assert status == 200
    print(f"Success: Found {data['total']} transactions matching 'payment'")

def test_aggregations():
    print("Testing Aggregations Endpoint...")
    url = f"{BASE_URL}/api/workbooks/{WORKBOOK_ID}/aggregations"
    status, data = make_request(url)
    assert status == 200
    assert "total_exposure" in data
    assert "risk_buckets" in data
    assert "controls" in data
    print(f"Success: Total Exposure: {data['total_exposure']}")
    print(f"Risk Buckets: {json.dumps(data['risk_buckets'], indent=2)}")

if __name__ == "__main__":
    try:
        test_transactions_pagination()
        test_transactions_filtering()
        test_aggregations()
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nTest failed: {e}")
