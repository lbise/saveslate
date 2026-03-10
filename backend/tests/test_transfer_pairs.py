"""Unit tests for transfer pair validation and normalization logic."""

from datetime import date
from decimal import Decimal

from app.services.transfer_pairs import normalize_transfer_pairs, validate_transfer_pair


# ============================================================================
# normalize_transfer_pairs
# ============================================================================


class TestNormalizeTransferPairs:
    """Test transfer pair normalization rules."""

    def test_no_pairs(self):
        txns = [
            {"amount": -50, "description": "Test"},
            {"amount": 100, "description": "Test 2"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_id"] is None
        assert result[0]["transfer_pair_role"] is None
        assert result[1]["transfer_pair_id"] is None

    def test_valid_pair_opposite_signs(self):
        txns = [
            {"amount": -100, "transfer_pair_id": "pair-1", "description": "Out"},
            {"amount": 100, "transfer_pair_id": "pair-1", "description": "In"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_id"] == "pair-1"
        assert result[0]["transfer_pair_role"] == "source"
        assert result[1]["transfer_pair_id"] == "pair-1"
        assert result[1]["transfer_pair_role"] == "destination"

    def test_valid_pair_reversed_signs(self):
        txns = [
            {"amount": 100, "transfer_pair_id": "pair-1", "description": "In"},
            {"amount": -100, "transfer_pair_id": "pair-1", "description": "Out"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_role"] == "destination"
        assert result[1]["transfer_pair_role"] == "source"

    def test_same_sign_fallback_to_position(self):
        txns = [
            {"amount": 100, "transfer_pair_id": "pair-1", "description": "A"},
            {"amount": 100, "transfer_pair_id": "pair-1", "description": "B"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_role"] == "source"
        assert result[1]["transfer_pair_role"] == "destination"

    def test_invalid_pair_three_transactions(self):
        txns = [
            {"amount": -100, "transfer_pair_id": "pair-1"},
            {"amount": 100, "transfer_pair_id": "pair-1"},
            {"amount": 50, "transfer_pair_id": "pair-1"},
        ]
        result = normalize_transfer_pairs(txns)
        # All should have pair cleared
        for t in result:
            assert t["transfer_pair_id"] is None
            assert t["transfer_pair_role"] is None

    def test_invalid_pair_single_transaction(self):
        txns = [
            {"amount": -100, "transfer_pair_id": "pair-1", "transfer_pair_role": "source"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_id"] is None
        assert result[0]["transfer_pair_role"] is None

    def test_clears_orphaned_role(self):
        txns = [
            {"amount": -100, "transfer_pair_id": None, "transfer_pair_role": "source"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_role"] is None

    def test_trims_pair_id(self):
        txns = [
            {"amount": -100, "transfer_pair_id": "  pair-1  "},
            {"amount": 100, "transfer_pair_id": "pair-1"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_id"] == "pair-1"
        assert result[1]["transfer_pair_id"] == "pair-1"

    def test_multiple_pairs(self):
        txns = [
            {"amount": -50, "transfer_pair_id": "pair-A"},
            {"amount": 50, "transfer_pair_id": "pair-A"},
            {"amount": -200, "transfer_pair_id": "pair-B"},
            {"amount": 200, "transfer_pair_id": "pair-B"},
        ]
        result = normalize_transfer_pairs(txns)
        assert result[0]["transfer_pair_role"] == "source"
        assert result[1]["transfer_pair_role"] == "destination"
        assert result[2]["transfer_pair_role"] == "source"
        assert result[3]["transfer_pair_role"] == "destination"


# ============================================================================
# validate_transfer_pair
# ============================================================================


class TestValidateTransferPair:
    """Test transfer pair validation checks."""

    def _txn(self, **kwargs) -> dict:
        return {
            "account_id": "acc-1",
            "amount": -100,
            "currency": "CHF",
            "date": date(2026, 1, 15),
            **kwargs,
        }

    def test_valid_pair(self):
        a = self._txn(account_id="acc-1", amount=-100)
        b = self._txn(account_id="acc-2", amount=100)
        errors = validate_transfer_pair(a, b)
        assert errors == []

    def test_same_account(self):
        a = self._txn(account_id="acc-1", amount=-100)
        b = self._txn(account_id="acc-1", amount=100)
        errors = validate_transfer_pair(a, b)
        assert any("different accounts" in e for e in errors)

    def test_different_currency(self):
        a = self._txn(amount=-100, currency="CHF")
        b = self._txn(account_id="acc-2", amount=100, currency="EUR")
        errors = validate_transfer_pair(a, b)
        assert any("Currency mismatch" in e for e in errors)

    def test_same_sign(self):
        a = self._txn(amount=-100)
        b = self._txn(account_id="acc-2", amount=-100)
        errors = validate_transfer_pair(a, b)
        assert any("opposite signs" in e for e in errors)

    def test_different_absolute_amount(self):
        a = self._txn(amount=-100)
        b = self._txn(account_id="acc-2", amount=50)
        errors = validate_transfer_pair(a, b)
        assert any("Absolute amounts differ" in e for e in errors)

    def test_dates_too_far_apart(self):
        a = self._txn(date=date(2026, 1, 10))
        b = self._txn(account_id="acc-2", amount=100, date=date(2026, 1, 20))
        errors = validate_transfer_pair(a, b)
        assert any("more than 2 days" in e for e in errors)

    def test_dates_within_range(self):
        a = self._txn(date=date(2026, 1, 15))
        b = self._txn(account_id="acc-2", amount=100, date=date(2026, 1, 17))
        errors = validate_transfer_pair(a, b)
        assert errors == []

    def test_string_dates(self):
        """Should handle ISO date strings too."""
        a = self._txn(date="2026-01-15")
        b = self._txn(account_id="acc-2", amount=100, date="2026-01-15")
        errors = validate_transfer_pair(a, b)
        assert errors == []

    def test_multiple_errors(self):
        """Same account + same sign + different amounts."""
        a = self._txn(account_id="acc-1", amount=-100)
        b = self._txn(account_id="acc-1", amount=-50)
        errors = validate_transfer_pair(a, b)
        assert len(errors) >= 3  # same account, same sign, different amount
