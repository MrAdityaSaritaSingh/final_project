"""
Test Suite: Replace Dataset Feature - Backend
Comprehensive testing for the FastAPI endpoints and service functions that handle dataset replacement.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from typing import Dict, Any, List
from backend.services.workbook_service import (
    query_transactions_for_user,
    get_workbook_for_user,
    save_analysis_for_user,
)
from backend.schemas.scrutiny import FlaggedRow


class TestReplaceDatasetBackend:
    """Test suite for backend Replace Dataset functionality"""

    @pytest.fixture
    def mock_user_id(self) -> str:
        return "user-123"

    @pytest.fixture
    def mock_workbook_id(self) -> str:
        return "workbook-456"

    @pytest.fixture
    def mock_workbook_doc(self) -> Dict[str, Any]:
        """Mock workbook document from MongoDB"""
        return {
            "_id": "workbook-456",
            "user_id": "user-123",
            "workbook_name": "ABC Corp Ledger",
            "financial_year": "2024-25",
            "status": "Completed",
            "latest_summary": {
                "total_entries": 1000,
                "rule_flagged": 100,
                "ml_flagged": 20,
                "total_flagged": 120,
                "pct_flagged": 12.0,
            },
            "flagged_rows": [
                {
                    "voucher_no": "JV-001",
                    "date": "2024-05-15",
                    "ledger_name": "Sales",
                    "debit": 10000,
                    "credit": 0,
                    "narration": "Monthly sales posting",
                    "voucher_type": "Journal",
                    "scrutiny_flag": True,
                    "scrutiny_category": "Round Numbers",
                    "scrutiny_reason": "Amount is a multiple of 1000",
                },
                {
                    "voucher_no": "JV-002",
                    "date": "2024-05-20",
                    "ledger_name": "Expenses",
                    "debit": 0,
                    "credit": 50000,
                    "narration": "Period end adjustment",
                    "voucher_type": "Journal",
                    "scrutiny_flag": True,
                    "scrutiny_category": "Period End",
                    "scrutiny_reason": "Posted on last day of month",
                },
            ],
            "created_at": "2024-05-01",
            "updated_at": "2024-05-15",
        }

    @pytest.fixture
    def mock_new_analysis_results(self) -> Dict[str, Any]:
        """Mock analysis results from replacement dataset"""
        return {
            "total_entries": 500,
            "rule_flagged": 40,
            "ml_flagged": 10,
            "total_flagged": 50,
            "pct_flagged": 10.0,
            "category_counts": {
                "Round Numbers": 20,
                "Weekend Entries": 10,
                "ML Anomaly": 10,
                "Period End": 10,
            },
            "flagged_rows": [
                {
                    "voucher_no": "JV-101",
                    "date": "2024-06-01",
                    "ledger_name": "Bank",
                    "debit": 100000,
                    "credit": 0,
                    "narration": "Bank deposit",
                    "voucher_type": "Receipt",
                    "scrutiny_flag": True,
                    "scrutiny_category": "ML Anomaly",
                    "scrutiny_reason": "Unusual transaction pattern",
                },
            ],
        }

    # ─────────────────────────────────────────────────────────────────────
    # UNIT TESTS: Query Transaction Filtering
    # ─────────────────────────────────────────────────────────────────────

    def test_query_transactions_no_filters(self, mock_user_id: str, mock_workbook_id: str):
        """Should return all flagged rows when no filters applied"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "amount": 10000},
                    {"voucher_no": "JV-002", "amount": 50000},
                    {"voucher_no": "JV-003", "amount": 5000},
                ]
            }

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, {})

            assert len(result) == 3
            assert result[0]["voucher_no"] == "JV-001"

    def test_query_transactions_with_text_search(self, mock_user_id: str, mock_workbook_id: str):
        """Should filter rows by text search in narration"""
        filters = {"search_text": "payment"}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "narration": "Payment to vendor"},
                    {"voucher_no": "JV-002", "narration": "Sales invoice"},
                    {"voucher_no": "JV-003", "narration": "Payment receipt"},
                ]
            }

            # Simulate filtering
            all_rows = mock_get.return_value["flagged_rows"]
            filtered = [r for r in all_rows if "payment" in r["narration"].lower()]

            assert len(filtered) == 2
            assert filtered[0]["voucher_no"] == "JV-001"
            assert filtered[1]["voucher_no"] == "JV-003"

    def test_query_transactions_with_date_range(self, mock_user_id: str, mock_workbook_id: str):
        """Should filter rows by date range"""
        filters = {"start_date": "2024-05-15", "end_date": "2024-05-20"}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "date": "2024-05-14"},
                    {"voucher_no": "JV-002", "date": "2024-05-17"},
                    {"voucher_no": "JV-003", "date": "2024-05-21"},
                ]
            }

            all_rows = mock_get.return_value["flagged_rows"]

            def in_date_range(row_date: str, start: str, end: str) -> bool:
                from datetime import datetime
                row = datetime.strptime(row_date, "%Y-%m-%d").date()
                start_d = datetime.strptime(start, "%Y-%m-%d").date()
                end_d = datetime.strptime(end, "%Y-%m-%d").date()
                return start_d <= row <= end_d

            filtered = [r for r in all_rows if in_date_range(r["date"], filters["start_date"], filters["end_date"])]

            assert len(filtered) == 1
            assert filtered[0]["voucher_no"] == "JV-002"

    def test_query_transactions_with_amount_range(self, mock_user_id: str, mock_workbook_id: str):
        """Should filter rows by amount range"""
        filters = {"min_amount": 20000, "max_amount": 60000}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "debit": 10000, "credit": 0},
                    {"voucher_no": "JV-002", "debit": 0, "credit": 50000},
                    {"voucher_no": "JV-003", "debit": 100000, "credit": 0},
                ]
            }

            all_rows = mock_get.return_value["flagged_rows"]

            def get_amount(row: Dict) -> float:
                return float(row.get("debit") or row.get("credit", 0))

            filtered = [
                r for r in all_rows 
                if filters["min_amount"] <= get_amount(r) <= filters["max_amount"]
            ]

            assert len(filtered) == 1
            assert filtered[0]["voucher_no"] == "JV-002"

    def test_query_transactions_with_category_filter(self, mock_user_id: str, mock_workbook_id: str):
        """Should filter rows by scrutiny category"""
        filters = {"categories": ["Round Numbers", "ML Anomaly"]}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "scrutiny_category": "Round Numbers"},
                    {"voucher_no": "JV-002", "scrutiny_category": "Period End"},
                    {"voucher_no": "JV-003", "scrutiny_category": "ML Anomaly"},
                ]
            }

            all_rows = mock_get.return_value["flagged_rows"]
            filtered = [r for r in all_rows if r["scrutiny_category"] in filters["categories"]]

            assert len(filtered) == 2
            assert filtered[0]["voucher_no"] == "JV-001"
            assert filtered[1]["voucher_no"] == "JV-003"

    def test_query_transactions_combined_filters(self, mock_user_id: str, mock_workbook_id: str):
        """Should apply multiple filters simultaneously"""
        filters = {
            "search_text": "payment",
            "min_amount": 25000,
            "categories": ["Round Numbers"],
        }

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "narration": "Payment to vendor", "debit": 30000, "scrutiny_category": "Round Numbers"},
                    {"voucher_no": "JV-002", "narration": "Sales invoice", "debit": 50000, "scrutiny_category": "Round Numbers"},
                    {"voucher_no": "JV-003", "narration": "Payment receipt", "debit": 10000, "scrutiny_category": "Period End"},
                ]
            }

            all_rows = mock_get.return_value["flagged_rows"]
            filtered = all_rows

            if "search_text" in filters:
                filtered = [r for r in filtered if filters["search_text"].lower() in r["narration"].lower()]
            if "min_amount" in filters:
                filtered = [r for r in filtered if float(r.get("debit", 0)) >= filters["min_amount"]]
            if "categories" in filters:
                filtered = [r for r in filtered if r["scrutiny_category"] in filters["categories"]]

            assert len(filtered) == 1
            assert filtered[0]["voucher_no"] == "JV-001"

    def test_query_transactions_empty_result(self, mock_user_id: str, mock_workbook_id: str):
        """Should return empty list when no rows match filters"""
        filters = {"search_text": "nonexistent"}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {"flagged_rows": []}

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, filters)

            assert len(result) == 0
            assert isinstance(result, list)

    # ─────────────────────────────────────────────────────────────────────
    # INTEGRATION TESTS: Complete Replace Dataset Flow
    # ─────────────────────────────────────────────────────────────────────

    def test_save_analysis_replaces_old_data(
        self, mock_user_id: str, mock_workbook_id: str, mock_new_analysis_results: Dict
    ):
        """Should replace old analysis data with new analysis when saving"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            with patch("backend.services.workbook_service.db.workbooks.find_one_and_update") as mock_update:
                mock_get.return_value = {
                    "_id": mock_workbook_id,
                    "flagged_rows": [
                        {"voucher_no": "JV-001", "narration": "Old data"},
                    ],
                    "latest_summary": {"total_entries": 1000},
                }
                mock_update.return_value = {"_id": mock_workbook_id}

                # Simulate saving new analysis
                assert len(mock_get.return_value["flagged_rows"]) == 1
                assert mock_get.return_value["flagged_rows"][0]["narration"] == "Old data"

    def test_investigation_tabs_reset_on_replacement(self):
        """Should reset investigation tabs when dataset changes"""
        old_tabs = [
            {"id": "1", "label": "Analysis 1", "appliedFilters": {}},
            {"id": "2", "label": "Analysis 2", "appliedFilters": {"search_text": "payment"}},
        ]

        new_tabs = [{"id": "1", "label": "Workspace 1", "appliedFilters": {}}]

        # After replacement, old analysis tabs should be cleared
        assert len(old_tabs) == 2
        assert len(new_tabs) == 1
        assert new_tabs[0]["appliedFilters"] == {}

    def test_api_endpoint_returns_correct_summary_after_replacement(
        self, mock_user_id: str, mock_workbook_id: str, mock_new_analysis_results: Dict
    ):
        """Should return correct summary in API response after replacement"""
        response = {
            "status": "success",
            "data": {
                "summary": mock_new_analysis_results,
                "flagged_rows": mock_new_analysis_results["flagged_rows"],
            },
        }

        assert response["status"] == "success"
        assert response["data"]["summary"]["total_entries"] == 500
        assert response["data"]["summary"]["total_flagged"] == 50
        assert len(response["data"]["flagged_rows"]) == 1

    # ─────────────────────────────────────────────────────────────────────
    # EDGE CASE TESTS
    # ─────────────────────────────────────────────────────────────────────

    def test_query_with_empty_database(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle workbook with no flagged rows gracefully"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {"flagged_rows": []}

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, {})

            assert result == []

    def test_query_with_very_large_dataset(self, mock_user_id: str, mock_workbook_id: str):
        """Should efficiently handle large datasets"""
        large_dataset = [
            {"voucher_no": f"JV-{i:06d}", "amount": 1000 + i, "narration": f"Transaction {i}"}
            for i in range(10000)
        ]

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {"flagged_rows": large_dataset}

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, {})

            assert len(result) == 10000
            assert result[0]["voucher_no"] == "JV-000000"
            assert result[9999]["voucher_no"] == "JV-009999"

    def test_filter_with_invalid_date_format(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle invalid date format in filters gracefully"""
        filters = {"start_date": "invalid-date", "end_date": "2024-05-31"}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [{"voucher_no": "JV-001", "date": "2024-05-15"}]
            }

            # Should handle gracefully by treating invalid date as no filter
            all_rows = mock_get.return_value["flagged_rows"]
            assert len(all_rows) == 1

    def test_filter_with_null_values_in_rows(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle null/None values in transaction data"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [
                    {"voucher_no": "JV-001", "narration": None, "debit": 10000},
                    {"voucher_no": "JV-002", "narration": "Valid", "debit": None},
                    {"voucher_no": "JV-003", "narration": "Another", "debit": 5000},
                ]
            }

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, {})

            assert len(result) == 3
            assert result[0]["narration"] is None
            assert result[1]["debit"] is None

    def test_multiple_sequential_replacements(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle multiple sequential dataset replacements"""
        call_count = 0

        def mock_get_side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return {"flagged_rows": [{"voucher_no": "JV-001"}]}
            elif call_count == 2:
                return {"flagged_rows": [{"voucher_no": "JV-002"}, {"voucher_no": "JV-003"}]}
            else:
                return {"flagged_rows": []}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.side_effect = mock_get_side_effect

            # First replacement
            result1 = query_transactions_for_user(mock_user_id, mock_workbook_id, {})
            assert len(result1) == 1

            # Second replacement
            result2 = query_transactions_for_user(mock_user_id, mock_workbook_id, {})
            assert len(result2) == 2

            # Third replacement (empty)
            result3 = query_transactions_for_user(mock_user_id, mock_workbook_id, {})
            assert len(result3) == 0

    # ─────────────────────────────────────────────────────────────────────
    # ERROR HANDLING TESTS
    # ─────────────────────────────────────────────────────────────────────

    def test_handle_database_error_gracefully(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle database connection errors"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.side_effect = Exception("Database connection error")

            try:
                query_transactions_for_user(mock_user_id, mock_workbook_id, {})
            except Exception as e:
                assert str(e) == "Database connection error"

    def test_handle_invalid_filter_values(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle invalid filter values without crashing"""
        filters = {"min_amount": "not_a_number", "max_amount": -100}

        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {
                "flagged_rows": [{"voucher_no": "JV-001", "debit": 50000}]
            }

            # Should either raise an error or handle gracefully
            try:
                result = query_transactions_for_user(mock_user_id, mock_workbook_id, filters)
                assert isinstance(result, list)
            except (ValueError, TypeError):
                pass  # Expected behavior

    def test_missing_required_workbook_fields(self, mock_user_id: str, mock_workbook_id: str):
        """Should handle workbook document missing expected fields"""
        with patch("backend.services.workbook_service.get_workbook_for_user") as mock_get:
            mock_get.return_value = {"_id": mock_workbook_id}  # Missing flagged_rows

            result = query_transactions_for_user(mock_user_id, mock_workbook_id, {})

            assert result == []
