import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { PageHeader, PageHeaderActions } from "../components/layout";
import { EntityListSkeleton, QueryError } from "../components/layout";
import { DeleteConfirmationModal } from "../components/ui";
import { GoalDetailCard, GoalFormModal } from "../components/goals";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "../hooks/api";
import { useGoalProgress } from "../hooks/api";
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
  const goalsResult = useGoals();
  const progressResult = useGoalProgress();
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const rawGoals = goalsResult.data ?? [];
  const goalProgressData = progressResult.data ?? [];

  // Show skeleton while primary data is loading
  if (goalsResult.isLoading) return <EntityListSkeleton cardCount={3} />;
  if (goalsResult.isError) return <QueryError message="Failed to load goals." onRetry={() => goalsResult.refetch()} />;

  const goals = useMemo<GoalProgress[]>(() => {
    return rawGoals.map((goal) => {
      const progress = goalProgressData.find((p) => p.goalId === goal.id);
      return {
        goal,
        currentAmount: progress?.currentAmount ?? (goal.startingAmount ?? 0),
        percentage: progress?.progressPercentage ?? 0,
        transactionCount: progress?.contributionCount ?? 0,
      };
    });
  }, [rawGoals, goalProgressData]);

  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [initialForm, setInitialForm] = useState<GoalFormState>(DEFAULT_FORM_STATE);

  const { importError, isImporting, importInputRef, openFilePicker, handleFileChange, exportJsonFile } = useImportExport<GoalProgress[]>({
    parseFile: parseImportedGoals,
    onImportSuccess: async (importedGoals) => {
      try {
        for (const gp of importedGoals) {
          const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...goalData } = gp.goal;
          await createGoalMutation.mutateAsync({
            ...goalData,
            startingAmount: gp.currentAmount,
          });
        }
        toast.success(`${importedGoals.length} goal(s) imported`);
      } catch {
        toast.error("Failed to import some goals");
      }
    },
  });

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
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...goalData } = goalPayload;

    if (editingGoalId) {
      updateGoalMutation.mutate(
        { id: editingGoalId, ...goalData },
        {
          onSuccess: () => {
            closeGoalForm();
            toast.success("Goal updated");
          },
          onError: () => toast.error("Failed to update goal"),
        },
      );
    } else {
      createGoalMutation.mutate(goalData, {
        onSuccess: () => {
          closeGoalForm();
          toast.success("Goal created");
        },
        onError: () => toast.error("Failed to create goal"),
      });
    }
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) {
      return;
    }

    deleteGoalMutation.mutate(goalToDelete.id, {
      onSuccess: () => {
        setGoalToDelete(null);
        toast.success("Goal deleted");
      },
      onError: () => toast.error("Failed to delete goal"),
    });
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
    toast.success("Goals exported");
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto px-[18px] pt-[30px] pb-9 lg:px-8 lg:py-11 xl:px-10 xl:py-12">
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
        <p className="text-sm text-expense mb-3">{importError}</p>
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
              This will delete <span className="text-foreground">{goalToDelete.name}</span> and remove its goal link from related transactions.
            </>
          )}
          confirmLabel="Delete goal"
          onConfirm={handleConfirmDeleteGoal}
          onClose={() => setGoalToDelete(null)}
        />
      )}

      <div className="flex flex-wrap gap-8 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {goals.length}
            </span>
            <span className="text-sm text-dimmed">Active Goals</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-income" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCurrency(goals.reduce((sum, g) => sum + g.currentAmount, 0))}
            </span>
            <span className="text-sm text-dimmed">Total Saved</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-dimmed" />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-base font-medium text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCurrency(
                goals.reduce((sum, g) => sum + (g.goal.hasTarget === false ? 0 : g.goal.targetAmount), 0),
              )}
            </span>
            <span className="text-sm text-dimmed">Total Target</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {goals.map((gp) => {
          return (
            <GoalDetailCard
              key={gp.goal.id}
              goalProgress={gp}
              allGoalTransactions={[]}
              onEdit={openEditGoalForm}
              onDelete={(goal) => setGoalToDelete(goal)}
            />
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-card rounded-(--radius-lg) flex items-center justify-center mb-4">
            <Target size={24} className="text-dimmed" />
          </div>
          <div className="text-base text-muted-foreground mb-1">No goals yet</div>
          <div className="text-sm text-dimmed">
            Create your first savings goal to get started.
          </div>
        </div>
      )}
    </div>
  );
}
