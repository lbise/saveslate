import { useEffect, useMemo, useState } from "react";
import { Pencil, Play, Power, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader, PageHeaderActions } from "../components/layout";
import {
  DeleteConfirmationModal,
  EntityCard,
  EntityCardDetailList,
  EntityCardOverflowMenu,
  EntityCardSection,
} from "../components/ui";
import {
  CATEGORIES,
  getAccounts,
  getGoals,
} from "../lib/data-service";
import {
  addAutomationRule,
  applyAutomationRules,
  AUTOMATION_RULES_EXPORT_SCHEMA_VERSION,
  createAutomationConditionId,
  deleteAutomationRule,
  loadAutomationRules,
  mergeAutomationRules,
  parseAutomationRulesFile,
  updateAutomationRule,
} from "../lib/automation-rules";
import {
  loadImportBatches,
  loadTransactions,
  saveTransactions,
} from "../lib/transaction-storage";
import { UNCATEGORIZED_CATEGORY_ID } from "../lib/transaction-type";
import { useImportExport } from "../hooks";
import {
  createDefaultRuleFormState,
  formatCondition,
  formatRuleActionSummary,
  getTriggerLabel,
  toRuleFormStateFromPrefill,
  toRuleFormStateFromRule,
} from "../lib/rule-utils";
import { RuleFormModal } from "../components/rules/RuleFormModal";
import type {
  AutomationRule,
  RulesRouteState,
} from "../types";
import type {
  ExportedRulesFile,
  ManualRunSummary,
  RuleFieldOption,
  RuleFormState,
} from "../lib/rule-utils";

export function Rules() {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultCategoryId = CATEGORIES[0]?.id ?? UNCATEGORIZED_CATEGORY_ID;

  const [rules, setRules] = useState<AutomationRule[]>(() =>
    loadAutomationRules(),
  );
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
  const [initialForm, setInitialForm] = useState<RuleFormState>(() =>
    createDefaultRuleFormState(defaultCategoryId),
  );
  const [processedLocationKey, setProcessedLocationKey] = useState<
    string | undefined
  >(undefined);
  const [manualRunSummary, setManualRunSummary] =
    useState<ManualRunSummary | null>(null);

  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<AutomationRule[]>({
    parseFile: parseAutomationRulesFile,
    onImportSuccess: (parsedRules) => {
      const mergedRules = mergeAutomationRules(parsedRules);
      setRules(mergedRules);
    },
  });

  // ─── Lookup data for condition value labels (used in rules list) ───

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

  const conditionValueLabelByField = useMemo<Record<string, Map<string, string>>>(
    () => ({
      accountId: new Map(
        conditionValueOptionsByField.accountId.map((option) => [
          option.value,
          option.label,
        ]),
      ),
      goalId: new Map(
        conditionValueOptionsByField.goalId.map((option) => [
          option.value,
          option.label,
        ]),
      ),
      categoryId: new Map(
        conditionValueOptionsByField.categoryId.map((option) => [
          option.value,
          option.label,
        ]),
      ),
      importBatchId: new Map(
        conditionValueOptionsByField.importBatchId.map((option) => [
          option.value,
          option.label,
        ]),
      ),
    }),
    [conditionValueOptionsByField],
  );

  const resolveConditionValueLabel = (
    field: string,
    rawValue: string | undefined,
  ): string | undefined => {
    if (!rawValue) {
      return undefined;
    }
    return conditionValueLabelByField[field]?.get(rawValue);
  };

  // ─── Route prefill handling (render-phase pattern) ─────────

  const routePrefill =
    ((location.state as RulesRouteState | null) ?? null)?.prefillRuleDraft ??
    null;

  if (routePrefill && location.key !== processedLocationKey) {
    setProcessedLocationKey(location.key);

    const prefillCondition = routePrefill.conditions?.[0];
    const shouldMergeIntoExistingRule = Boolean(
      routePrefill.mergeIntoExistingCategoryRule &&
        routePrefill.categoryId &&
        !routePrefill.goalId &&
        prefillCondition &&
        prefillCondition.field === "description" &&
        prefillCondition.operator === "contains" &&
        prefillCondition.value?.trim(),
    );

    let resolvedForm: RuleFormState;
    let resolvedEditingId: string | null = null;

    if (shouldMergeIntoExistingRule) {
      const targetRule = rules.find((rule) => {
        const categoryAction = rule.actions.find(
          (action) => action.type === "set-category",
        );
        const hasGoalAction = rule.actions.some(
          (action) => action.type === "set-goal",
        );
        if (!categoryAction) {
          return false;
        }

        return (
          categoryAction.categoryId === routePrefill.categoryId &&
          categoryAction.overwriteExisting !== true &&
          !hasGoalAction
        );
      });

      if (targetRule) {
        const keyword = prefillCondition!.value!.trim();
        const hasKeyword = targetRule.conditions.some((condition) => {
          return (
            condition.field === "description" &&
            condition.operator === "contains" &&
            (condition.value ?? "").trim().toLowerCase() ===
              keyword.toLowerCase()
          );
        });

        const targetForm = toRuleFormStateFromRule(targetRule);
        if (!hasKeyword) {
          targetForm.conditions.push({
            id: createAutomationConditionId(),
            field: "description",
            operator: "contains",
            value: keyword,
          });
          targetForm.matchMode = "any";
        }

        resolvedForm = targetForm;
        resolvedEditingId = targetRule.id;
      } else {
        resolvedForm = toRuleFormStateFromPrefill(
          routePrefill,
          defaultCategoryId,
        );
      }
    } else {
      resolvedForm = toRuleFormStateFromPrefill(
        routePrefill,
        defaultCategoryId,
      );
    }

    setInitialForm(resolvedForm);
    setEditingRuleId(resolvedEditingId);
    setIsRuleModalOpen(true);
  }

  useEffect(() => {
    const routeState = (location.state as RulesRouteState | null) ?? null;
    if (routeState?.prefillRuleDraft) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  // ─── Derived values ────────────────────────────────────────

  const manualRunnableRuleCount = useMemo(
    () =>
      rules.filter(
        (rule) => rule.isEnabled && rule.triggers.includes("manual-run"),
      ).length,
    [rules],
  );

  // ─── Modal handlers ───────────────────────────────────────

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    setEditingRuleId(null);
  };

  const openCreateModal = () => {
    setInitialForm(createDefaultRuleFormState(defaultCategoryId));
    setEditingRuleId(null);
    setIsRuleModalOpen(true);
  };

  const openEditModal = (rule: AutomationRule) => {
    setInitialForm(toRuleFormStateFromRule(rule));
    setEditingRuleId(rule.id);
    setIsRuleModalOpen(true);
  };

  // ─── Rule operations ──────────────────────────────────────

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

    const fileDate = new Date().toISOString().split("T")[0];
    exportJsonFile(`saveslate-rules-${fileDate}.json`, exportPayload);
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
    const runResult = applyAutomationRules(transactions, rules, "manual-run");

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

  const handleSaveRule = (ruleData: {
    name: string;
    isEnabled: boolean;
    triggers: AutomationRule["triggers"];
    matchMode: AutomationRule["matchMode"];
    conditions: AutomationRule["conditions"];
    actions: AutomationRule["actions"];
  }) => {
    if (editingRuleId) {
      updateAutomationRule(editingRuleId, ruleData);
    } else {
      addAutomationRule(ruleData);
    }

    setRules(loadAutomationRules());
    closeRuleModal();
  };

  return (
    <div className="page-container">
      <PageHeader title="Rules">
        <PageHeaderActions
          onImport={openFilePicker}
          onExport={handleExportRules}
          onCreate={openCreateModal}
          importDisabled={isImporting}
          exportDisabled={rules.length === 0}
          importLabel={isImporting ? "Importing..." : "Import"}
          createLabel="New Rule"
        />
      </PageHeader>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          void handleFileChange(event);
        }}
        className="hidden"
      />

      {importError && (
        <p className="text-ui text-expense mb-3">{importError}</p>
      )}

      {ruleToDelete && (
        <DeleteConfirmationModal
          title="Delete rule?"
          description={(
            <>
              This will permanently delete <span className="text-text">{ruleToDelete.name}</span>.
            </>
          )}
          confirmLabel="Delete rule"
          onConfirm={handleConfirmDeleteRule}
          onClose={() => setRuleToDelete(null)}
        />
      )}

      {isRuleModalOpen && (
        <RuleFormModal
          editingRuleId={editingRuleId}
          initialForm={initialForm}
          defaultCategoryId={defaultCategoryId}
          onClose={closeRuleModal}
          onSave={handleSaveRule}
        />
      )}

      <section className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="heading-3 text-text">Automation Engine</h2>
            <p className="text-body mt-1">
              Runs enabled manual rules on current transactions.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunManualRules}
            disabled={manualRunnableRuleCount === 0}
          >
            <Play size={14} />
            Run
          </button>
        </div>

        {manualRunSummary && (
          <p className="text-ui text-text-muted mt-3">
            Last run {new Date(manualRunSummary.ranAt).toLocaleString()}:
            evaluated {manualRunSummary.evaluatedCount}, matched{" "}
            {manualRunSummary.matchedCount}, changed{" "}
            {manualRunSummary.changedCount}.
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
            <p className="text-ui text-text-muted mt-1">
              Create a rule to auto-categorize transactions on import or manual
              run.
            </p>
            <button className="btn-primary mt-4" onClick={openCreateModal}>
              Create Rule
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rules.map((rule) => {
              const actionSummary = formatRuleActionSummary(rule.actions);
              return (
                <EntityCard
                  key={rule.id}
                  icon="Bot"
                  title={rule.name}
                  tone={rule.isEnabled ? "income" : "warning"}
                  metric={rule.isEnabled ? "Enabled" : "Disabled"}
                  metricClassName={rule.isEnabled ? "text-income" : "text-text-muted"}
                  badges={rule.triggers.map((trigger) => (
                    <span key={trigger} className="badge-muted">
                      {getTriggerLabel(trigger)}
                    </span>
                  ))}
                  actions={(
                    <EntityCardOverflowMenu
                      label={`More actions for ${rule.name}`}
                      actions={[
                        {
                          label: rule.isEnabled ? 'Disable' : 'Enable',
                          icon: Power,
                          onClick: () => handleToggleRuleEnabled(rule),
                        },
                        {
                          label: 'Edit',
                          icon: Pencil,
                          onClick: () => openEditModal(rule),
                        },
                        {
                          label: 'Delete',
                          icon: Trash2,
                          onClick: () => setRuleToDelete(rule),
                          tone: 'danger',
                        },
                      ]}
                    />
                  )}
                >
                  <EntityCardDetailList
                    items={[
                      {
                        label: "Match mode",
                        value: rule.matchMode === "all" ? "All conditions" : "Any condition",
                        tone: "default",
                      },
                      {
                        label: "Action",
                        value: actionSummary,
                        tone: rule.actions.length > 0 ? "default" : "muted",
                      },
                    ]}
                  />

                  {rule.conditions.length > 0 && (
                    <EntityCardSection title="Conditions">
                      <div className="space-y-1.5">
                        {rule.conditions.map((condition) => (
                          <p key={condition.id} className="text-ui text-text-muted">
                            {formatCondition(
                              condition,
                              resolveConditionValueLabel(condition.field, condition.value),
                            )}
                          </p>
                        ))}
                      </div>
                    </EntityCardSection>
                  )}
                </EntityCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
