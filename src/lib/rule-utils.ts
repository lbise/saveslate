import {
  AUTOMATION_OPERATOR_OPTIONS,
  AUTOMATION_TRIGGER_OPTIONS,
  automationOperatorNeedsValue,
  createAutomationConditionId,
} from "./automation-rules";
import { getCategoryById, getGoalById } from "./data-service";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationMatchMode,
  AutomationRule,
  AutomationRulePrefillDraft,
  AutomationTrigger,
} from "../types";

// ─── Shared Types ────────────────────────────────────────────

export interface RuleFieldOption {
  value: string;
  label: string;
}

export interface RuleFormCondition {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

export interface RuleFormAction {
  id: string;
  type: "set-category" | "set-goal";
  categoryId: string;
  goalId: string;
  overwriteExisting: boolean;
}

export interface RuleFormState {
  name: string;
  isEnabled: boolean;
  triggers: AutomationTrigger[];
  matchMode: AutomationMatchMode;
  actions: RuleFormAction[];
  conditions: RuleFormCondition[];
}

export interface ManualRunSummary {
  evaluatedCount: number;
  matchedCount: number;
  changedCount: number;
  ranAt: string;
}

export interface ExportedRulesFile {
  schemaVersion: number;
  exportedAt: string;
  ruleCount: number;
  rules: AutomationRule[];
}

// ─── Constants ───────────────────────────────────────────────

export const BASE_RULE_FIELD_OPTIONS: RuleFieldOption[] = [
  { value: "description", label: "Description" },
  { value: "amount", label: "Amount" },
  { value: "currency", label: "Currency" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "accountId", label: "Account" },
  { value: "categoryId", label: "Category" },
  { value: "goalId", label: "Goal" },
  { value: "importBatchId", label: "Import Source" },
  { value: "type", label: "Inferred Type" },
];

export const LOOKUP_CONDITION_FIELDS = new Set([
  "accountId",
  "goalId",
  "categoryId",
  "importBatchId",
]);

export const LOOKUP_FIELD_OPERATOR_OPTIONS = AUTOMATION_OPERATOR_OPTIONS.filter(
  (option) => option.value === "equals" || option.value === "not-equals",
);

// ─── Factory Functions ───────────────────────────────────────

export function createEmptyCondition(): RuleFormCondition {
  return {
    id: createAutomationConditionId(),
    field: "description",
    operator: "contains",
    value: "",
  };
}

export function createRuleFormActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultCategoryAction(defaultCategoryId: string): RuleFormAction {
  return {
    id: createRuleFormActionId(),
    type: "set-category",
    categoryId: defaultCategoryId,
    goalId: "",
    overwriteExisting: false,
  };
}

export function createDefaultRuleFormState(defaultCategoryId: string): RuleFormState {
  return {
    name: "",
    isEnabled: true,
    triggers: ["on-import"],
    matchMode: "all",
    actions: [createDefaultCategoryAction(defaultCategoryId)],
    conditions: [createEmptyCondition()],
  };
}

// ─── Formatting Helpers ──────────────────────────────────────

export function getTriggerLabel(trigger: AutomationTrigger): string {
  return (
    AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === trigger)
      ?.label ?? trigger
  );
}

export function getOperatorLabel(operator: AutomationConditionOperator): string {
  return (
    AUTOMATION_OPERATOR_OPTIONS.find((option) => option.value === operator)
      ?.label ?? operator
  );
}

export function formatCondition(
  condition: AutomationCondition,
  resolvedValue?: string,
): string {
  const fieldLabel =
    BASE_RULE_FIELD_OPTIONS.find((option) => option.value === condition.field)
      ?.label ?? condition.field;
  const operatorLabel = getOperatorLabel(condition.operator).toLowerCase();
  if (automationOperatorNeedsValue(condition.operator)) {
    return `${fieldLabel} ${operatorLabel} "${resolvedValue ?? condition.value ?? ""}"`;
  }

  return `${fieldLabel} ${operatorLabel}`;
}

export function formatRuleAction(action: AutomationAction): string {
  if (action.type === "set-category") {
    const category = getCategoryById(action.categoryId);
    return `Set category to ${category?.name ?? action.categoryId}${action.overwriteExisting ? " (allow recategorize)" : ""}`;
  }

  const goal = getGoalById(action.goalId);
  return `Set goal to ${goal?.name ?? action.goalId}${action.overwriteExisting ? " (allow change)" : ""}`;
}

export function formatRuleActionSummary(actions: AutomationAction[]): string {
  if (actions.length === 0) {
    return "No actions";
  }

  const firstAction = formatRuleAction(actions[0]);
  if (actions.length === 1) {
    return firstAction;
  }

  return `${firstAction} +${actions.length - 1} more`;
}

// ─── Conversion Helpers ──────────────────────────────────────

export function toFormCondition(condition: AutomationCondition): RuleFormCondition {
  return {
    id: condition.id,
    field: condition.field,
    operator: condition.operator,
    value: condition.value ?? "",
  };
}

export function toRuleFormStateFromRule(rule: AutomationRule): RuleFormState {
  return {
    name: rule.name,
    isEnabled: rule.isEnabled,
    triggers: rule.triggers,
    matchMode: rule.matchMode,
    actions: rule.actions.map((action) => {
      if (action.type === "set-category") {
        return {
          id: createRuleFormActionId(),
          type: "set-category" as const,
          categoryId: action.categoryId,
          goalId: "",
          overwriteExisting: action.overwriteExisting === true,
        };
      }

      return {
        id: createRuleFormActionId(),
        type: "set-goal" as const,
        categoryId: "",
        goalId: action.goalId,
        overwriteExisting: action.overwriteExisting === true,
      };
    }),
    conditions: rule.conditions.map((condition) => toFormCondition(condition)),
  };
}

export function toRuleFormStateFromPrefill(
  prefill: AutomationRulePrefillDraft,
  defaultCategoryId: string,
): RuleFormState {
  const hasPrefillConditions =
    Array.isArray(prefill.conditions) && prefill.conditions.length > 0;
  const prefillConditions = hasPrefillConditions
    ? prefill.conditions!.map((condition) => ({
        id: createAutomationConditionId(),
        field: condition.field,
        operator: condition.operator,
        value: condition.value ?? "",
      }))
    : [createEmptyCondition()];

  return {
    name: prefill.name ?? "",
    isEnabled: prefill.isEnabled ?? true,
    triggers:
      prefill.triggers && prefill.triggers.length > 0
        ? prefill.triggers
        : ["on-import"],
    matchMode: prefill.matchMode ?? "all",
    actions: [
      {
        id: createRuleFormActionId(),
        type: "set-category",
        categoryId: prefill.categoryId?.trim() || defaultCategoryId,
        goalId: "",
        overwriteExisting: prefill.applyToUncategorizedOnly === false,
      },
      ...(prefill.goalId
        ? [
            {
              id: createRuleFormActionId(),
              type: "set-goal" as const,
              categoryId: "",
              goalId: prefill.goalId,
              overwriteExisting: false,
            },
          ]
        : []),
    ],
    conditions: prefillConditions,
  };
}
