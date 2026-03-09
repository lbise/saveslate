import { useState, useMemo, type FormEvent } from "react";
import { X } from "lucide-react";
import { Modal } from "../ui";
import {
  CATEGORIES,
  getAccounts,
  getActiveGoals,
  getGoals,
} from "../../lib/data-service";
import {
  AUTOMATION_OPERATOR_OPTIONS,
  AUTOMATION_TRIGGER_OPTIONS,
  automationOperatorNeedsValue,
} from "../../lib/automation-rules";
import { loadImportBatches, loadTransactions } from "../../lib/transaction-storage";
import { cn } from "../../lib/utils";
import {
  BASE_RULE_FIELD_OPTIONS,
  LOOKUP_CONDITION_FIELDS,
  LOOKUP_FIELD_OPERATOR_OPTIONS,
  createEmptyCondition,
  createDefaultCategoryAction,
  getOperatorLabel,
} from "../../lib/rule-utils";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionOperator,
  AutomationMatchMode,
  AutomationTrigger,
} from "../../types";
import type {
  RuleFieldOption,
  RuleFormAction,
  RuleFormState,
} from "../../lib/rule-utils";

export interface RuleFormModalProps {
  editingRuleId: string | null;
  initialForm: RuleFormState;
  defaultCategoryId: string;
  onClose: () => void;
  onSave: (ruleData: {
    name: string;
    isEnabled: boolean;
    triggers: AutomationTrigger[];
    matchMode: AutomationMatchMode;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
  }) => void;
}

export function RuleFormModal({
  editingRuleId,
  initialForm,
  defaultCategoryId,
  onClose,
  onSave,
}: RuleFormModalProps) {
  const [form, setForm] = useState<RuleFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Memoized Options ──────────────────────────────────────

  const conditionFieldOptions = useMemo<RuleFieldOption[]>(() => {
    const metadataFieldOptions = new Set<string>();

    for (const transaction of loadTransactions()) {
      for (const metadataEntry of transaction.metadata ?? []) {
        const normalizedKey = metadataEntry.key.trim();
        if (normalizedKey) {
          metadataFieldOptions.add(`metadata.${normalizedKey}`);
        }
      }
    }

    const baseFieldValues = new Set(
      BASE_RULE_FIELD_OPTIONS.map((option) => option.value),
    );
    for (const condition of form.conditions) {
      const normalizedField = condition.field.trim();
      if (normalizedField) {
        baseFieldValues.add(normalizedField);
      }
    }

    const baseOptions = Array.from(baseFieldValues).map((field) => {
      const existingOption = BASE_RULE_FIELD_OPTIONS.find(
        (option) => option.value === field,
      );
      return (
        existingOption ?? {
          value: field,
          label: field,
        }
      );
    });

    const metadataOptions = Array.from(metadataFieldOptions)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        label: `Metadata: ${value.slice("metadata.".length)}`,
      }));

    return [...baseOptions, ...metadataOptions];
  }, [form.conditions]);

  const availableGoals = useMemo(() => getActiveGoals(), []);
  const availableAccounts = useMemo(() => getAccounts(), []);
  const allGoals = useMemo(() => getGoals(), []);
  const importBatches = useMemo(() => loadImportBatches(), []);

  const categoryOptions = useMemo(
    () =>
      [...CATEGORIES]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((category) => ({
          value: category.id,
          label: category.name,
        })),
    [],
  );

  const importSourceOptions = useMemo(
    () =>
      [...importBatches]
        .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
        .map((batch) => {
          const displayName = batch.name?.trim() || batch.fileName;
          const dateLabel = new Date(batch.importedAt).toLocaleDateString();
          return {
            value: batch.id,
            label: `${displayName} (${dateLabel})`,
          };
        }),
    [importBatches],
  );

  const conditionValueOptionsByField = useMemo<Record<string, RuleFieldOption[]>>(
    () => ({
      accountId: availableAccounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
      goalId: allGoals.map((goal) => ({
        value: goal.id,
        label: goal.isArchived ? `${goal.name} (archived)` : goal.name,
      })),
      categoryId: categoryOptions,
      importBatchId: importSourceOptions,
    }),
    [allGoals, availableAccounts, categoryOptions, importSourceOptions],
  );

  const availableTriggerOptions = useMemo(
    () =>
      AUTOMATION_TRIGGER_OPTIONS.filter(
        (option) => option.value !== "on-create",
      ),
    [],
  );

  // ─── Event Handlers ────────────────────────────────────────

  const handleActionChange = (
    actionId: string,
    updates: Partial<RuleFormAction>,
  ) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }

        return {
          ...action,
          ...updates,
        };
      }),
    }));
  };

  const handleAddAction = () => {
    setForm((current) => ({
      ...current,
      actions: [...current.actions, createDefaultCategoryAction(defaultCategoryId)],
    }));
  };

  const handleRemoveAction = (actionId: string) => {
    setForm((current) => {
      if (current.actions.length === 1) {
        return current;
      }

      return {
        ...current,
        actions: current.actions.filter((action) => action.id !== actionId),
      };
    });
  };

  const handleConditionChange = (
    conditionId: string,
    updates: Partial<RuleFormState["conditions"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      conditions: current.conditions.map((condition) => {
        if (condition.id !== conditionId) {
          return condition;
        }

        return {
          ...condition,
          ...updates,
        };
      }),
    }));
  };

  const handleAddCondition = () => {
    setForm((current) => ({
      ...current,
      conditions: [...current.conditions, createEmptyCondition()],
    }));
  };

  const handleRemoveCondition = (conditionId: string) => {
    setForm((current) => {
      if (current.conditions.length === 1) {
        return current;
      }

      return {
        ...current,
        conditions: current.conditions.filter(
          (condition) => condition.id !== conditionId,
        ),
      };
    });
  };

  const toggleTrigger = (trigger: AutomationTrigger) => {
    setForm((current) => {
      if (current.triggers.includes(trigger)) {
        return {
          ...current,
          triggers: current.triggers.filter((item) => item !== trigger),
        };
      }

      return {
        ...current,
        triggers: [...current.triggers, trigger],
      };
    });
  };

  const handleSaveRule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = form.name.trim();
    if (!normalizedName) {
      setFormError("Rule name is required.");
      return;
    }

    if (form.triggers.length === 0) {
      setFormError("Choose at least one trigger.");
      return;
    }

    const normalizedConditions: AutomationCondition[] = form.conditions
      .map((condition) => ({
        id: condition.id,
        field: condition.field.trim(),
        operator: condition.operator,
        value: condition.value.trim(),
      }))
      .filter((condition) => {
        if (!condition.field) {
          return false;
        }

        if (!automationOperatorNeedsValue(condition.operator)) {
          return true;
        }

        return condition.value.length > 0;
      });

    if (normalizedConditions.length === 0) {
      setFormError("Add at least one valid condition.");
      return;
    }

    const normalizedActions: AutomationAction[] = [];
    for (const action of form.actions) {
      if (action.type === "set-category") {
        const categoryId = action.categoryId.trim();
        if (!categoryId) {
          continue;
        }

        normalizedActions.push({
          type: "set-category",
          categoryId,
          overwriteExisting: action.overwriteExisting,
        });
        continue;
      }

      if (action.type === "set-goal") {
        const goalId = action.goalId.trim();
        if (!goalId) {
          continue;
        }

        normalizedActions.push({
          type: "set-goal",
          goalId,
          overwriteExisting: action.overwriteExisting,
        });
      }
    }

    if (normalizedActions.length === 0) {
      setFormError("Add at least one valid action.");
      return;
    }

    onSave({
      name: normalizedName,
      isEnabled: form.isEnabled,
      triggers: form.triggers,
      matchMode: form.matchMode,
      conditions: normalizedConditions,
      actions: normalizedActions,
    });
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <Modal onClose={onClose} panelClassName="max-w-3xl p-5">
      <section>
          <div className="section-header mb-4">
            <h2 id="modal-title" className="heading-3 text-foreground">
              {editingRuleId ? "Edit Rule" : "Create Rule"}
            </h2>
            <button aria-label="Close modal"
              type="button"
              className="btn-icon"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSaveRule}>
            <div>
              <div>
                <label className="label mb-1.5 block" htmlFor="rule-name">
                  Rule name
                </label>
                <input
                  id="rule-name"
                  className="input"
                  placeholder="Categorize grocery merchants"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="label">Actions</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleAddAction}
                >
                  Add action
                </button>
              </div>

              <div className="space-y-2">
                {form.actions.map((action) => {
                  return (
                    <div
                      key={action.id}
                      className="rounded-(--radius-md) border border-border bg-card p-3 space-y-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <select
                          className="select"
                          value={action.type}
                          onChange={(event) => {
                            const nextType = event.target.value as RuleFormAction["type"];
                            handleActionChange(action.id, {
                              type: nextType,
                              overwriteExisting: false,
                            });
                          }}
                        >
                          <option value="set-category">Set category</option>
                          <option value="set-goal">Set goal</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveAction(action.id)}
                          className="btn-icon justify-self-start md:justify-self-end"
                          disabled={form.actions.length === 1}
                          aria-label="Remove action" title="Remove action"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {action.type === "set-category" ? (
                        <>
                          <select
                            className="select"
                            value={action.categoryId}
                            onChange={(event) =>
                              handleActionChange(action.id, {
                                categoryId: event.target.value,
                              })
                            }
                          >
                            {CATEGORIES.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={action.overwriteExisting}
                              onChange={(event) =>
                                handleActionChange(action.id, {
                                  overwriteExisting: event.target.checked,
                                })
                              }
                            />
                            <span className="text-ui">
                              Allow recategorizing already categorized transactions
                            </span>
                          </label>
                        </>
                      ) : (
                        <>
                          <select
                            className="select"
                            value={action.goalId}
                            onChange={(event) =>
                              handleActionChange(action.id, {
                                goalId: event.target.value,
                              })
                            }
                          >
                            <option value="">Select goal</option>
                            {availableGoals.map((goal) => (
                              <option key={goal.id} value={goal.id}>
                                {goal.name}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={action.overwriteExisting}
                              onChange={(event) =>
                                handleActionChange(action.id, {
                                  overwriteExisting: event.target.checked,
                                })
                              }
                            />
                            <span className="text-ui">
                              Allow changing goal when transaction already has one
                            </span>
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="label mb-1.5 block"
                  htmlFor="rule-match-mode"
                >
                  Match conditions
                </label>
                <select
                  id="rule-match-mode"
                  className="select"
                  value={form.matchMode}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      matchMode: event.target.value as AutomationMatchMode,
                    }));
                  }}
                >
                  <option value="all">All conditions must match</option>
                  <option value="any">Any condition can match</option>
                </select>
              </div>

              <div className="flex items-center gap-3 rounded-(--radius-md) border border-border px-3 py-2.5 mt-7">
                <input
                  id="rule-enabled"
                  type="checkbox"
                  checked={form.isEnabled}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      isEnabled: event.target.checked,
                    }));
                  }}
                />
                <label className="text-ui" htmlFor="rule-enabled">
                  Rule enabled
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <p className="label">Triggers</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableTriggerOptions.map((option) => {
                  const isActive = form.triggers.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex items-start gap-2 p-3 rounded-(--radius-md) border cursor-pointer transition-colors",
                        isActive
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card hover:border-dimmed",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleTrigger(option.value)}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-body text-foreground">
                          {option.label}
                        </span>
                        <span className="text-ui text-dimmed">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="label">Conditions</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleAddCondition}
                >
                  Add condition
                </button>
              </div>

              <div className="space-y-2">
                {form.conditions.map((condition) => {
                  const requiresValue = automationOperatorNeedsValue(
                    condition.operator,
                  );
                  const valueOptions = conditionValueOptionsByField[condition.field];
                  const isLookupField = LOOKUP_CONDITION_FIELDS.has(
                    condition.field,
                  );
                  const operatorOptions = isLookupField
                    ? LOOKUP_FIELD_OPERATOR_OPTIONS
                    : AUTOMATION_OPERATOR_OPTIONS;
                  const hasExistingOperatorOption = operatorOptions.some(
                    (operator) => operator.value === condition.operator,
                  );
                  const hasExistingValueOption =
                    !isLookupField ||
                    !condition.value ||
                    valueOptions.some((option) => option.value === condition.value);

                  return (
                    <div
                      key={condition.id}
                      className="rounded-(--radius-md) border border-border bg-card p-3 space-y-2"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                        <select
                          className="select"
                          value={condition.field}
                          onChange={(event) => {
                            const nextField = event.target.value;
                            const nextIsLookupField =
                              LOOKUP_CONDITION_FIELDS.has(nextField);
                            const currentOperator = condition.operator;
                            const nextOperator = nextIsLookupField
                              && currentOperator !== "equals"
                              && currentOperator !== "not-equals"
                              ? "equals"
                              : currentOperator;

                            handleConditionChange(condition.id, {
                              field: nextField,
                              operator: nextOperator,
                            });
                          }}
                        >
                          {conditionFieldOptions.map((fieldOption) => (
                            <option
                              key={fieldOption.value}
                              value={fieldOption.value}
                            >
                              {fieldOption.label}
                            </option>
                          ))}
                        </select>

                        <select
                          className="select"
                          value={condition.operator}
                          onChange={(event) => {
                            handleConditionChange(condition.id, {
                              operator: event.target
                                .value as AutomationConditionOperator,
                            });
                          }}
                        >
                          {!hasExistingOperatorOption && (
                            <option value={condition.operator}>
                              {getOperatorLabel(condition.operator)} (legacy)
                            </option>
                          )}
                          {operatorOptions.map((operator) => (
                            <option
                              key={operator.value}
                              value={operator.value}
                            >
                              {operator.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveCondition(condition.id)
                          }
                          className="btn-icon justify-self-start md:justify-self-end"
                          disabled={form.conditions.length === 1}
                          aria-label="Remove condition" title="Remove condition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {requiresValue ? isLookupField ? (
                        <select
                          className="select"
                          value={condition.value}
                          onChange={(event) => {
                            handleConditionChange(condition.id, {
                              value: event.target.value,
                            });
                          }}
                        >
                          <option value="">Select value</option>
                          {!hasExistingValueOption && condition.value && (
                            <option value={condition.value}>
                              Unknown ({condition.value})
                            </option>
                          )}
                          {valueOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          className="input h-10 min-h-10 py-2 resize-y"
                          placeholder="Value"
                          value={condition.value}
                          onChange={(event) => {
                            handleConditionChange(condition.id, {
                              value: event.target.value,
                            });
                          }}
                          rows={1}
                        />
                      ) : (
                        <div className="input h-auto min-h-10 py-2 flex items-center text-ui text-dimmed">
                          No value needed for this operator
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {formError && (
              <p className="text-ui text-expense">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingRuleId ? "Save Changes" : "Create Rule"}
              </button>
            </div>
          </form>
      </section>
    </Modal>
  );
}
