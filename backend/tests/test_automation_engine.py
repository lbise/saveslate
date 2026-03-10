"""Unit tests for the automation rule engine service."""

import pytest

from app.services.automation_engine import (
    apply_automation_rules,
    apply_rule_action,
    does_rule_match,
    evaluate_condition,
)


# ---------------------------------------------------------------------------
# evaluate_condition
# ---------------------------------------------------------------------------


class TestEvaluateCondition:
    """Test individual condition operators."""

    def _txn(self, **kwargs) -> dict:
        return {"description": "Grocery Store", "amount": -42.50, **kwargs}

    def test_contains(self):
        cond = {"field": "description", "operator": "contains", "value": "grocery"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_contains_no_match(self):
        cond = {"field": "description", "operator": "contains", "value": "pharmacy"}
        assert evaluate_condition(self._txn(), cond) is False

    def test_not_contains(self):
        cond = {"field": "description", "operator": "not-contains", "value": "pharmacy"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_equals_text(self):
        cond = {"field": "description", "operator": "equals", "value": "grocery store"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_equals_numeric(self):
        cond = {"field": "amount", "operator": "equals", "value": "-42.5"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_not_equals(self):
        cond = {"field": "description", "operator": "not-equals", "value": "pharmacy"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_starts_with(self):
        cond = {"field": "description", "operator": "starts-with", "value": "Grocery"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_ends_with(self):
        cond = {"field": "description", "operator": "ends-with", "value": "Store"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_regex(self):
        cond = {"field": "description", "operator": "regex", "value": r"groc.*store"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_not_regex(self):
        cond = {"field": "description", "operator": "not-regex", "value": r"^Pharmacy"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_gt(self):
        cond = {"field": "amount", "operator": "gt", "value": "-50"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_gte(self):
        cond = {"field": "amount", "operator": "gte", "value": "-42.5"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_lt(self):
        cond = {"field": "amount", "operator": "lt", "value": "0"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_lte(self):
        cond = {"field": "amount", "operator": "lte", "value": "-42.5"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_exists(self):
        cond = {"field": "description", "operator": "exists"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_not_exists_on_present_field(self):
        cond = {"field": "description", "operator": "not-exists"}
        assert evaluate_condition(self._txn(), cond) is False

    def test_not_exists_on_missing_field(self):
        cond = {"field": "category_id", "operator": "not-exists"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_type_field_expense(self):
        cond = {"field": "type", "operator": "equals", "value": "expense"}
        assert evaluate_condition(self._txn(), cond) is True

    def test_type_field_income(self):
        cond = {"field": "type", "operator": "equals", "value": "income"}
        assert evaluate_condition(self._txn(amount=100), cond) is True

    def test_type_field_transfer(self):
        cond = {"field": "type", "operator": "equals", "value": "transfer"}
        assert evaluate_condition(self._txn(transfer_pair_id="p1"), cond) is True

    def test_metadata_dot_path(self):
        txn = self._txn(metadata=[{"key": "merchant", "value": "Migros"}])
        cond = {"field": "metadata.merchant", "operator": "equals", "value": "Migros"}
        assert evaluate_condition(txn, cond) is True

    def test_raw_data_dot_path(self):
        txn = self._txn(raw_data={"Description": "Original Text"})
        cond = {"field": "raw.Description", "operator": "contains", "value": "Original"}
        assert evaluate_condition(txn, cond) is True

    def test_invalid_regex(self):
        cond = {"field": "description", "operator": "regex", "value": "[invalid"}
        assert evaluate_condition(self._txn(), cond) is False

    def test_numeric_comparison_with_non_numeric(self):
        cond = {"field": "description", "operator": "gt", "value": "100"}
        assert evaluate_condition(self._txn(), cond) is False

    def test_camel_to_snake_field(self):
        """Frontend sends camelCase field names; engine should handle them."""
        txn = self._txn(account_id="acc-1")
        cond = {"field": "accountId", "operator": "equals", "value": "acc-1"}
        assert evaluate_condition(txn, cond) is True


# ---------------------------------------------------------------------------
# does_rule_match
# ---------------------------------------------------------------------------


class TestDoesRuleMatch:
    """Test rule matching logic (all/any mode)."""

    def _txn(self):
        return {"description": "Grocery Store", "amount": -42.50, "currency": "CHF"}

    def test_all_mode_all_match(self):
        rule = {
            "match_mode": "all",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "grocery"},
                {"field": "amount", "operator": "lt", "value": "0"},
            ],
        }
        assert does_rule_match(rule, self._txn()) is True

    def test_all_mode_partial_match(self):
        rule = {
            "match_mode": "all",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "grocery"},
                {"field": "amount", "operator": "gt", "value": "0"},
            ],
        }
        assert does_rule_match(rule, self._txn()) is False

    def test_any_mode_one_match(self):
        rule = {
            "match_mode": "any",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "pharmacy"},
                {"field": "amount", "operator": "lt", "value": "0"},
            ],
        }
        assert does_rule_match(rule, self._txn()) is True

    def test_any_mode_no_match(self):
        rule = {
            "match_mode": "any",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "pharmacy"},
                {"field": "amount", "operator": "gt", "value": "0"},
            ],
        }
        assert does_rule_match(rule, self._txn()) is False

    def test_empty_conditions(self):
        rule = {"match_mode": "all", "conditions": []}
        assert does_rule_match(rule, self._txn()) is False


# ---------------------------------------------------------------------------
# apply_rule_action
# ---------------------------------------------------------------------------


class TestApplyRuleAction:
    """Test action application logic."""

    def test_set_category(self):
        txn = {"description": "Test", "category_id": None}
        action = {"type": "set-category", "category_id": "cat-1"}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["category_id"] == "cat-1"

    def test_set_category_no_overwrite(self):
        txn = {"description": "Test", "category_id": "existing-cat"}
        action = {"type": "set-category", "category_id": "new-cat"}
        result, changed = apply_rule_action(txn, action)
        assert changed is False
        assert result["category_id"] == "existing-cat"

    def test_set_category_with_overwrite(self):
        txn = {"description": "Test", "category_id": "existing-cat"}
        action = {"type": "set-category", "category_id": "new-cat", "overwrite_existing": True}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["category_id"] == "new-cat"

    def test_set_category_uncategorized_allowed(self):
        txn = {"description": "Test", "category_id": "uncategorized"}
        action = {"type": "set-category", "category_id": "cat-1"}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["category_id"] == "cat-1"

    def test_set_category_same_id_no_change(self):
        txn = {"description": "Test", "category_id": "cat-1"}
        action = {"type": "set-category", "category_id": "cat-1", "overwrite_existing": True}
        result, changed = apply_rule_action(txn, action)
        assert changed is False

    def test_set_goal(self):
        txn = {"description": "Test", "goal_id": None}
        action = {"type": "set-goal", "goal_id": "goal-1"}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["goal_id"] == "goal-1"

    def test_set_goal_no_overwrite(self):
        txn = {"description": "Test", "goal_id": "existing-goal"}
        action = {"type": "set-goal", "goal_id": "new-goal"}
        result, changed = apply_rule_action(txn, action)
        assert changed is False

    def test_set_goal_with_overwrite(self):
        txn = {"description": "Test", "goal_id": "existing-goal"}
        action = {"type": "set-goal", "goal_id": "new-goal", "overwrite_existing": True}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["goal_id"] == "new-goal"

    def test_unknown_action_type(self):
        txn = {"description": "Test"}
        action = {"type": "unknown-action"}
        result, changed = apply_rule_action(txn, action)
        assert changed is False

    def test_camelcase_action_keys(self):
        """Frontend sends camelCase keys; engine should accept both."""
        txn = {"description": "Test", "category_id": None}
        action = {"type": "set-category", "categoryId": "cat-1", "overwriteExisting": True}
        result, changed = apply_rule_action(txn, action)
        assert changed is True
        assert result["category_id"] == "cat-1"


# ---------------------------------------------------------------------------
# apply_automation_rules (full pipeline)
# ---------------------------------------------------------------------------


class TestApplyAutomationRules:
    """Test the full rule engine pipeline."""

    def _rule(self, **kwargs) -> dict:
        return {
            "id": "rule-1",
            "name": "Test Rule",
            "is_enabled": True,
            "triggers": ["on-import"],
            "match_mode": "all",
            "conditions": [
                {"field": "description", "operator": "contains", "value": "grocery"},
            ],
            "actions": [
                {"type": "set-category", "category_id": "cat-groceries"},
            ],
            "created_at": "2026-01-01T00:00:00",
            **kwargs,
        }

    def test_basic_run(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None},
            {"description": "Coffee Shop", "amount": -5, "category_id": None},
        ]
        rules = [self._rule()]
        result = apply_automation_rules(transactions, rules, "on-import")

        assert result.evaluated_count == 2
        assert result.matched_count == 1
        assert result.changed_count == 1
        assert 0 in result.transaction_updates
        assert result.transaction_updates[0]["category_id"] == "cat-groceries"
        assert 1 not in result.transaction_updates

    def test_trigger_filtering(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None},
        ]
        rules = [self._rule(triggers=["manual-run"])]
        result = apply_automation_rules(transactions, rules, "on-import")
        # Rule has manual-run trigger, but we're running on-import → no match
        assert result.matched_count == 0

    def test_disabled_rule(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None},
        ]
        rules = [self._rule(is_enabled=False)]
        result = apply_automation_rules(transactions, rules, "on-import")
        assert result.matched_count == 0

    def test_first_matching_rule_wins(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None},
        ]
        rules = [
            self._rule(
                id="rule-1", name="Rule 1",
                actions=[{"type": "set-category", "category_id": "cat-1"}],
                created_at="2026-01-01T00:00:00",
            ),
            self._rule(
                id="rule-2", name="Rule 2",
                actions=[{"type": "set-category", "category_id": "cat-2"}],
                created_at="2026-01-02T00:00:00",
            ),
        ]
        result = apply_automation_rules(transactions, rules, "on-import")
        assert result.changed_count == 1
        assert result.transaction_updates[0]["category_id"] == "cat-1"

    def test_empty_transactions(self):
        result = apply_automation_rules([], [self._rule()], "on-import")
        assert result.evaluated_count == 0
        assert result.matched_count == 0

    def test_empty_rules(self):
        transactions = [{"description": "Test", "amount": -10, "category_id": None}]
        result = apply_automation_rules(transactions, [], "on-import")
        assert result.matched_count == 0

    def test_rule_stats(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None},
            {"description": "Grocery Market", "amount": -30, "category_id": None},
            {"description": "Coffee Shop", "amount": -5, "category_id": None},
        ]
        rules = [self._rule()]
        result = apply_automation_rules(transactions, rules, "on-import")
        assert len(result.rule_stats) == 1
        assert result.rule_stats[0].matched_count == 2
        assert result.rule_stats[0].changed_count == 2

    def test_multiple_actions_per_rule(self):
        transactions = [
            {"description": "Grocery Store", "amount": -50, "category_id": None, "goal_id": None},
        ]
        rules = [
            self._rule(
                actions=[
                    {"type": "set-category", "category_id": "cat-1"},
                    {"type": "set-goal", "goal_id": "goal-1"},
                ],
            ),
        ]
        result = apply_automation_rules(transactions, rules, "on-import")
        assert result.changed_count == 2
        assert result.transaction_updates[0]["category_id"] == "cat-1"
        assert result.transaction_updates[0]["goal_id"] == "goal-1"
