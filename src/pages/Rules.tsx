import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ChevronDown, Pencil, Play, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, PageHeaderActions } from '../components/layout';
import { CategoryPicker, Icon } from '../components/ui';
import { CATEGORIES, getCategoryById } from '../data/mock';
import {
  addAutomationRule,
  applyAutomationRules,
  AUTOMATION_OPERATOR_OPTIONS,
  AUTOMATION_RULES_EXPORT_SCHEMA_VERSION,
  AUTOMATION_TRIGGER_OPTIONS,
  automationOperatorNeedsValue,
  createAutomationConditionId,
  deleteAutomationRule,
  loadAutomationRules,
  mergeAutomationRules,
  parseAutomationRulesFile,
  updateAutomationRule,
} from '../lib/automation-rules';
import { loadTransactions, saveTransactions } from '../lib/transaction-storage';
import { UNCATEGORIZED_CATEGORY_ID } from '../lib/transaction-type';
import { cn } from '../lib/utils';
import type {
  AutomationCondition,
  AutomationConditionOperator,
  AutomationRulePrefillDraft,
  AutomationMatchMode,
  AutomationRule,
  AutomationTrigger,
  RulesRouteState,
} from '../types';

interface RuleFieldOption {
  value: string;
  label: string;
}

const BASE_RULE_FIELD_OPTIONS: RuleFieldOption[] = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'currency', label: 'Currency' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'accountId', label: 'Account ID' },
  { value: 'categoryId', label: 'Category ID' },
  { value: 'goalId', label: 'Goal ID' },
  { value: 'importBatchId', label: 'Import Batch ID' },
  { value: 'type', label: 'Inferred Type' },
];

interface RuleFormCondition {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

interface RuleFormState {
  name: string;
  isEnabled: boolean;
  triggers: AutomationTrigger[];
  matchMode: AutomationMatchMode;
  applyToUncategorizedOnly: boolean;
  categoryId: string;
  conditions: RuleFormCondition[];
}

interface ExportedRulesFile {
  schemaVersion: number;
  exportedAt: string;
  ruleCount: number;
  rules: AutomationRule[];
}

interface ManualRunSummary {
  evaluatedCount: number;
  matchedCount: number;
  changedCount: number;
  ranAt: string;
}

function createEmptyCondition(): RuleFormCondition {
  return {
    id: createAutomationConditionId(),
    field: 'description',
    operator: 'contains',
    value: '',
  };
}

function createDefaultRuleFormState(defaultCategoryId: string): RuleFormState {
  return {
    name: '',
    isEnabled: true,
    triggers: ['on-import'],
    matchMode: 'all',
    applyToUncategorizedOnly: true,
    categoryId: defaultCategoryId,
    conditions: [createEmptyCondition()],
  };
}

function getTriggerLabel(trigger: AutomationTrigger): string {
  return AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === trigger)?.label ?? trigger;
}

function getOperatorLabel(operator: AutomationConditionOperator): string {
  return AUTOMATION_OPERATOR_OPTIONS.find((option) => option.value === operator)?.label ?? operator;
}

function formatCondition(condition: AutomationCondition): string {
  const operatorLabel = getOperatorLabel(condition.operator).toLowerCase();
  if (automationOperatorNeedsValue(condition.operator)) {
    return `${condition.field} ${operatorLabel} "${condition.value ?? ''}"`;
  }

  return `${condition.field} ${operatorLabel}`;
}

function toFormCondition(condition: AutomationCondition): RuleFormCondition {
  return {
    id: condition.id,
    field: condition.field,
    operator: condition.operator,
    value: condition.value ?? '',
  };
}

function toRuleFormStateFromRule(rule: AutomationRule): RuleFormState {
  return {
    name: rule.name,
    isEnabled: rule.isEnabled,
    triggers: rule.triggers,
    matchMode: rule.matchMode,
    applyToUncategorizedOnly: rule.applyToUncategorizedOnly !== false,
    categoryId: rule.action.categoryId,
    conditions: rule.conditions.map((condition) => toFormCondition(condition)),
  };
}

function toRuleFormStateFromPrefill(
  prefill: AutomationRulePrefillDraft,
  defaultCategoryId: string,
): RuleFormState {
  const hasPrefillConditions = Array.isArray(prefill.conditions) && prefill.conditions.length > 0;
  const prefillConditions = hasPrefillConditions
    ? prefill.conditions!.map((condition) => ({
      id: createAutomationConditionId(),
      field: condition.field,
      operator: condition.operator,
      value: condition.value ?? '',
    }))
    : [createEmptyCondition()];

  return {
    name: prefill.name ?? '',
    isEnabled: prefill.isEnabled ?? true,
    triggers: prefill.triggers && prefill.triggers.length > 0
      ? prefill.triggers
      : ['on-import'],
    matchMode: prefill.matchMode ?? 'all',
    applyToUncategorizedOnly: prefill.applyToUncategorizedOnly !== false,
    categoryId: prefill.categoryId?.trim() || defaultCategoryId,
    conditions: prefillConditions,
  };
}

export function Rules() {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultCategoryId = CATEGORIES[0]?.id ?? UNCATEGORIZED_CATEGORY_ID;

  const [rules, setRules] = useState<AutomationRule[]>(() => loadAutomationRules());
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(() => createDefaultRuleFormState(defaultCategoryId));
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [manualRunSummary, setManualRunSummary] = useState<ManualRunSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

    const baseFieldValues = new Set(BASE_RULE_FIELD_OPTIONS.map((option) => option.value));
    for (const condition of form.conditions) {
      const normalizedField = condition.field.trim();
      if (normalizedField) {
        baseFieldValues.add(normalizedField);
      }
    }

    const baseOptions = Array.from(baseFieldValues).map((field) => {
      const existingOption = BASE_RULE_FIELD_OPTIONS.find((option) => option.value === field);
      return existingOption ?? {
        value: field,
        label: field,
      };
    });

    const metadataOptions = Array.from(metadataFieldOptions)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        label: `Metadata: ${value.slice('metadata.'.length)}`,
      }));

    return [...baseOptions, ...metadataOptions];
  }, [form.conditions]);

  useEffect(() => {
    const routeState = (location.state as RulesRouteState | null) ?? null;
    const prefill = routeState?.prefillRuleDraft;
    if (!prefill) {
      return;
    }

    const prefillCondition = prefill.conditions?.[0];
    const shouldMergeIntoExistingRule = Boolean(
      prefill.mergeIntoExistingCategoryRule
      && prefill.categoryId
      && prefillCondition
      && prefillCondition.field === 'description'
      && prefillCondition.operator === 'contains'
      && prefillCondition.value?.trim(),
    );

    if (shouldMergeIntoExistingRule) {
      const targetRule = rules.find((rule) => {
        return rule.action.type === 'set-category'
          && rule.action.categoryId === prefill.categoryId
          && rule.applyToUncategorizedOnly !== false;
      });

      if (targetRule) {
        const keyword = prefillCondition!.value!.trim();
        const hasKeyword = targetRule.conditions.some((condition) => {
          return condition.field === 'description'
            && condition.operator === 'contains'
            && (condition.value ?? '').trim().toLowerCase() === keyword.toLowerCase();
        });

        const targetForm = toRuleFormStateFromRule(targetRule);
        if (!hasKeyword) {
          targetForm.conditions.push({
            id: createAutomationConditionId(),
            field: 'description',
            operator: 'contains',
            value: keyword,
          });
          targetForm.matchMode = 'any';
        }

        setForm(targetForm);
        setEditingRuleId(targetRule.id);
        setFormError(null);
        setIsCategoryPickerOpen(false);
        setIsRuleModalOpen(true);

        navigate(location.pathname, { replace: true, state: null });
        return;
      }
    }

    setForm(toRuleFormStateFromPrefill(prefill, defaultCategoryId));
    setEditingRuleId(null);
    setFormError(null);
    setIsCategoryPickerOpen(false);
    setIsRuleModalOpen(true);

    navigate(location.pathname, { replace: true, state: null });
  }, [defaultCategoryId, location.pathname, location.state, navigate, rules]);

  const availableTriggerOptions = useMemo(
    () => AUTOMATION_TRIGGER_OPTIONS.filter((option) => option.value !== 'on-create'),
    [],
  );

  const selectedActionCategory = useMemo(() => getCategoryById(form.categoryId), [form.categoryId]);

  const manualRunnableRuleCount = useMemo(
    () => rules.filter((rule) => rule.isEnabled && rule.triggers.includes('manual-run')).length,
    [rules],
  );

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    setIsCategoryPickerOpen(false);
    setEditingRuleId(null);
    setFormError(null);
  };

  const openCreateModal = () => {
    setForm(createDefaultRuleFormState(defaultCategoryId));
    setIsCategoryPickerOpen(false);
    setEditingRuleId(null);
    setFormError(null);
    setIsRuleModalOpen(true);
  };

  const openEditModal = (rule: AutomationRule) => {
    setForm(toRuleFormStateFromRule(rule));
    setIsCategoryPickerOpen(false);
    setEditingRuleId(rule.id);
    setFormError(null);
    setIsRuleModalOpen(true);
  };

  const handleOpenImportPicker = () => {
    setImportError(null);
    importInputRef.current?.click();
  };

  const handleExportRules = () => {
    if (rules.length === 0) {
      return;
    }

    const exportPayload: ExportedRulesFile = {
      schemaVersion: AUTOMATION_RULES_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      ruleCount: rules.length,
      rules,
    };

    const fileDate = new Date().toISOString().split('T')[0];
    const fileName = `rules-${fileDate}.json`;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportRulesFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const fileContent = await file.text();
      const parsedRules = parseAutomationRulesFile(fileContent);
      const mergedRules = mergeAutomationRules(parsedRules);
      setRules(mergedRules);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import rules file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConditionChange = (conditionId: string, updates: Partial<RuleFormCondition>) => {
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
        conditions: current.conditions.filter((condition) => condition.id !== conditionId),
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
      setFormError('Rule name is required.');
      return;
    }

    if (form.triggers.length === 0) {
      setFormError('Choose at least one trigger.');
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
      setFormError('Add at least one valid condition.');
      return;
    }

    const ruleData = {
      name: normalizedName,
      isEnabled: form.isEnabled,
      triggers: form.triggers,
      matchMode: form.matchMode,
      conditions: normalizedConditions,
      action: {
        type: 'set-category',
        categoryId: form.categoryId,
      } as const,
      applyToUncategorizedOnly: form.applyToUncategorizedOnly,
    };

    if (editingRuleId) {
      updateAutomationRule(editingRuleId, ruleData);
    } else {
      addAutomationRule(ruleData);
    }

    setRules(loadAutomationRules());
    closeRuleModal();
  };

  const handleToggleRuleEnabled = (rule: AutomationRule) => {
    updateAutomationRule(rule.id, {
      isEnabled: !rule.isEnabled,
    });
    setRules(loadAutomationRules());
  };

  const handleConfirmDeleteRule = () => {
    if (!ruleToDelete) {
      return;
    }

    deleteAutomationRule(ruleToDelete.id);
    setRules(loadAutomationRules());
    if (editingRuleId === ruleToDelete.id) {
      closeRuleModal();
    }
    setRuleToDelete(null);
  };

  const handleRunManualRules = () => {
    const transactions = loadTransactions();
    const runResult = applyAutomationRules(transactions, rules, 'manual-run');

    if (runResult.changedCount > 0) {
      saveTransactions(runResult.transactions);
    }

    setManualRunSummary({
      evaluatedCount: runResult.evaluatedCount,
      matchedCount: runResult.matchedCount,
      changedCount: runResult.changedCount,
      ranAt: new Date().toISOString(),
    });
  };

  return (
    <div className="page-container">
      <PageHeader title="Rules">
        <PageHeaderActions
          onImport={handleOpenImportPicker}
          onExport={handleExportRules}
          onCreate={openCreateModal}
          importDisabled={isImporting}
          exportDisabled={rules.length === 0}
          importLabel={isImporting ? 'Importing...' : 'Import'}
          createLabel="New Rule"
        />
      </PageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleImportRulesFile(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {ruleToDelete && (
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70"
            onClick={() => setRuleToDelete(null)}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-5 space-y-4">
              <h2 className="heading-2">Delete rule?</h2>
              <p className="text-body">
                This will permanently delete <span className="text-text">{ruleToDelete.name}</span>.
              </p>
              <p className="text-ui text-text-muted">This action cannot be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRuleToDelete(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteRule}
                  className="btn-secondary border-expense/40 text-expense hover:bg-expense/10 hover:border-expense"
                >
                  Delete rule
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isRuleModalOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-bg/70"
            onClick={closeRuleModal}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <section className="card w-full max-w-3xl p-5">
              <div className="section-header mb-4">
                <h2 className="heading-3 text-text">{editingRuleId ? 'Edit Rule' : 'Create Rule'}</h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={closeRuleModal}
                >
                  <X size={16} />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSaveRule}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="rule-name">Rule name</label>
                    <input
                      id="rule-name"
                      className="input"
                      placeholder="Categorize grocery merchants"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label mb-1.5 block">Action: set category</label>
                    <div className="relative">
                      <button
                        type="button"
                        className="input flex items-center justify-between"
                        onClick={() => setIsCategoryPickerOpen((current) => !current)}
                        aria-expanded={isCategoryPickerOpen}
                        aria-controls="rule-category-picker"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon
                            name={selectedActionCategory?.icon ?? 'CircleHelp'}
                            size={16}
                            className="text-text-muted"
                          />
                          <span className="text-body text-text truncate">
                            {selectedActionCategory?.name ?? form.categoryId}
                          </span>
                        </span>
                        <ChevronDown size={16} className="text-text-muted" />
                      </button>

                      {isCategoryPickerOpen && (
                        <CategoryPicker
                          currentCategoryId={form.categoryId}
                          onSelect={(categoryId) => {
                            setForm((current) => ({ ...current, categoryId }));
                            setIsCategoryPickerOpen(false);
                          }}
                          onClose={() => setIsCategoryPickerOpen(false)}
                          className="top-full left-0 mt-1 w-full"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-1.5 block" htmlFor="rule-match-mode">Match conditions</label>
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
                    <label className="text-ui" htmlFor="rule-enabled">Rule enabled</label>
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
                            'flex items-start gap-2 p-3 rounded-(--radius-md) border cursor-pointer transition-colors',
                            isActive
                              ? 'border-accent/40 bg-accent/5'
                              : 'border-border bg-surface hover:border-text-muted',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleTrigger(option.value)}
                          />
                          <span className="flex flex-col gap-0.5">
                            <span className="text-body text-text">{option.label}</span>
                            <span className="text-ui text-text-muted">{option.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.applyToUncategorizedOnly}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        applyToUncategorizedOnly: event.target.checked,
                      }));
                    }}
                  />
                  <span className="text-ui">
                    Only apply when transaction is currently uncategorized
                  </span>
                </label>

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
                      const requiresValue = automationOperatorNeedsValue(condition.operator);
                      return (
                        <div key={condition.id} className="rounded-(--radius-md) border border-border bg-surface p-3 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                            <select
                              className="select"
                              value={condition.field}
                              onChange={(event) => {
                                handleConditionChange(condition.id, {
                                  field: event.target.value,
                                });
                              }}
                            >
                              {conditionFieldOptions.map((fieldOption) => (
                                <option key={fieldOption.value} value={fieldOption.value}>
                                  {fieldOption.label}
                                </option>
                              ))}
                            </select>

                            <select
                              className="select"
                              value={condition.operator}
                              onChange={(event) => {
                                handleConditionChange(condition.id, {
                                  operator: event.target.value as AutomationConditionOperator,
                                });
                              }}
                            >
                              {AUTOMATION_OPERATOR_OPTIONS.map((operator) => (
                                <option key={operator.value} value={operator.value}>
                                  {operator.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveCondition(condition.id)}
                              className="btn-icon justify-self-start md:justify-self-end"
                              disabled={form.conditions.length === 1}
                              title="Remove condition"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {requiresValue ? (
                            <textarea
                              className="input h-auto min-h-20 py-2"
                              placeholder="Value"
                              value={condition.value}
                              onChange={(event) => {
                                handleConditionChange(condition.id, {
                                  value: event.target.value,
                                });
                              }}
                              rows={3}
                            />
                          ) : (
                            <div className="input h-auto min-h-10 py-2 flex items-center text-ui text-text-muted">
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
                    onClick={closeRuleModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingRuleId ? 'Save Changes' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

      <section className="card p-4" style={{ marginTop: '-32px' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="heading-3 text-text">Automation Engine</h2>
            <p className="text-body mt-1">
              Rules can check any field (including metadata/raw import fields) and run one action.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRunManualRules}
            disabled={manualRunnableRuleCount === 0}
          >
            <Play size={14} />
            Run rules now
          </button>
        </div>

        {manualRunSummary && (
          <p className="text-ui text-text-muted mt-3">
            Last run {new Date(manualRunSummary.ranAt).toLocaleString()}: evaluated {manualRunSummary.evaluatedCount}, matched {manualRunSummary.matchedCount}, changed {manualRunSummary.changedCount}.
          </p>
        )}
      </section>

      <section>
        <div className="section-header">
          <h2 className="section-title">All Rules</h2>
          <span className="text-ui text-text-muted">{rules.length} rules</span>
        </div>

        {rules.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-body text-text">No rules yet.</p>
            <p className="text-ui text-text-muted mt-1">Create a rule to auto-categorize transactions on import or manual run.</p>
            <button className="btn-primary mt-4" onClick={openCreateModal}>Create Rule</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rules.map((rule) => {
              const category = getCategoryById(rule.action.categoryId);

              return (
                <div key={rule.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="heading-3 text-text">{rule.name}</h3>
                        {!rule.isEnabled && <span className="badge-muted">Disabled</span>}
                        {rule.applyToUncategorizedOnly !== false && (
                          <span className="badge-muted">Uncategorized only</span>
                        )}
                      </div>

                      <p className="text-ui text-text-muted mt-1">
                        Match mode: {rule.matchMode === 'all' ? 'all conditions' : 'any condition'}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rule.triggers.map((trigger) => (
                          <span key={trigger} className="badge-muted">
                            {getTriggerLabel(trigger)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleEnabled(rule)}
                        className="btn-secondary h-8 px-2.5 py-0"
                      >
                        {rule.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-text transition-colors"
                        aria-label={`Edit rule ${rule.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleToDelete(rule)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-text-muted hover:text-expense transition-colors"
                        aria-label={`Delete rule ${rule.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {rule.conditions.map((condition) => (
                      <p key={condition.id} className="text-ui text-text-muted">
                        {formatCondition(condition)}
                      </p>
                    ))}
                  </div>

                  <p className="text-ui mt-3">
                    Action: set category to <span className="text-text">{category?.name ?? rule.action.categoryId}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
