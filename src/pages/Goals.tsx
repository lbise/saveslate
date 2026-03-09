import { useState } from "react";
import { Target } from "lucide-react";
import { PageHeader, PageHeaderActions } from "../components/layout";
import { DeleteConfirmationModal } from "../components/ui";
import { GoalDetailCard, GoalFormModal } from "../components/goals";
import {
  getGoalProgress,
  getTransactionsWithDetails,
} from "../lib/data-service";
import { addGoal, deleteGoal, mergeGoals, updateGoal } from "../lib/goal-storage";
import { loadTransactions, saveTransactions } from "../lib/transaction-storage";
import { useFormatCurrency, useImportExport } from "../hooks";
import {
  DEFAULT_FORM_STATE,
  GOALS_EXPORT_SCHEMA_VERSION,
  parseImportedGoals,
  toGoalFormState,
} from "../lib/goal-utils";
import type { Goal, GoalProgress } from "../types";
import type { ExportedGoalsFile, GoalFormState } from "../lib/goal-utils";

export function Goals() {
  const { formatCurrency } = useFormatCurrency();
  const [goals, setGoals] = useState<GoalProgress[]>(() => getGoalProgress());
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [initialForm, setInitialForm] = useState<GoalFormState>(DEFAULT_FORM_STATE);

  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<GoalProgress[]>({
    parseFile: parseImportedGoals,
    onImportSuccess: (importedGoals) => {
      mergeGoals(importedGoals.map((goalProgress) => ({
        ...goalProgress.goal,
        startingAmount: goalProgress.currentAmount,
      })));
      setGoals(getGoalProgress());
    },
  });

  const allTransactions = getTransactionsWithDetails();

  // ─── Modal handlers ───────────────────────────────────────

  const openCreateGoalForm = () => {
    setInitialForm(DEFAULT_FORM_STATE);
    setEditingGoalId(null);
    setIsCreateMenuOpen(true);
  };

  const openEditGoalForm = (goal: Goal) => {
    setInitialForm(toGoalFormState(goal));
    setEditingGoalId(goal.id);
    setIsCreateMenuOpen(true);
  };

  const closeGoalForm = () => {
    setIsCreateMenuOpen(false);
    setEditingGoalId(null);
  };

  // ─── Goal operations ─────────────────────────────────────

  const handleSaveGoal = (goalPayload: Goal) => {
    if (editingGoalId) {
      updateGoal(goalPayload);
    } else {
      addGoal(goalPayload);
    }

    setGoals(getGoalProgress());
    closeGoalForm();
  };

  const handleDeleteGoal = (goalId: string) => {
    const deleted = deleteGoal(goalId);
    if (!deleted) {
      return;
    }

    const transactions = loadTransactions();
    const hasLinkedTransactions = transactions.some((transaction) => transaction.goalId === goalId);
    if (hasLinkedTransactions) {
      saveTransactions(
        transactions.map((transaction) => (
          transaction.goalId === goalId
            ? { ...transaction, goalId: undefined }
            : transaction
        )),
      );
    }

    setGoals(getGoalProgress());
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) {
      return;
    }

    handleDeleteGoal(goalToDelete.id);
    setGoalToDelete(null);
  };

  const handleExportGoals = () => {
    if (goals.length === 0) {
      return;
    }

    const exportPayload: ExportedGoalsFile = {
      schemaVersion: GOALS_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      goalCount: goals.length,
      goals: goals.map((goalProgress) => ({
        goal: goalProgress.goal,
        currentAmount: goalProgress.currentAmount,
        transactionCount: goalProgress.transactionCount,
      })),
    };

    const fileDate = new Date().toISOString().split("T")[0];
    exportJsonFile(`saveslate-goals-${fileDate}.json`, exportPayload);
  };

  return (
    <div className="page-container">
      <PageHeader title="Goals">
        <PageHeaderActions
          onImport={openFilePicker}
          onExport={handleExportGoals}
          onCreate={openCreateGoalForm}
          importDisabled={isImporting}
          exportDisabled={goals.length === 0}
          importLabel={isImporting ? "Importing..." : "Import"}
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

      {isCreateMenuOpen && (
        <GoalFormModal
          editingGoalId={editingGoalId}
          initialForm={initialForm}
          goals={goals}
          onClose={closeGoalForm}
          onSave={handleSaveGoal}
        />
      )}

      {goalToDelete && (
        <DeleteConfirmationModal
          title="Delete goal?"
          description={(
            <>
              This will delete <span className="text-text">{goalToDelete.name}</span> and remove its goal link from related transactions.
            </>
          )}
          confirmLabel="Delete goal"
          onConfirm={handleConfirmDeleteGoal}
          onClose={() => setGoalToDelete(null)}
        />
      )}

      <div className="flex flex-wrap gap-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-secondary" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {goals.length}
            </span>
            <span className="text-ui text-text-muted">Active Goals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </span>
            <span className="text-ui text-text-muted">Total Saved</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-text-muted" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-body font-medium text-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCurrency(
                goals.reduce((sum, g) => sum + (g.goal.hasTarget === false ? 0 : g.goal.targetAmount), 0),
              )}
            </span>
            <span className="text-ui text-text-muted">Total Target</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {goals.map((gp) => {
          const allGoalTransactions = allTransactions.filter((tx) => tx.goalId === gp.goal.id);
          return (
            <GoalDetailCard
              key={gp.goal.id}
              goalProgress={gp}
              allGoalTransactions={allGoalTransactions}
              onEdit={openEditGoalForm}
              onDelete={(goal) => setGoalToDelete(goal)}
            />
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-surface rounded-(--radius-lg) flex items-center justify-center mb-4">
            <Target size={24} className="text-text-muted" />
          </div>
          <div className="text-body mb-1">No goals yet</div>
          <div className="text-ui text-text-muted">
            Create your first savings goal to get started.
          </div>
        </div>
      )}
    </div>
  );
}
