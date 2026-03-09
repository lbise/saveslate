import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Icon, Modal } from "../ui";
import { useFormatCurrency, useIconPicker } from "../../hooks";
import {
  formatContributionPeriods,
  getContributionPeriods,
  getDerivedTargetAmount,
  getYearlyContribution,
  parseAmount,
} from "../../lib/goal-utils";
import type { ContributionFrequency, Goal, GoalProgress } from "../../types";
import type { GoalFormState } from "../../lib/goal-utils";

export interface GoalFormModalProps {
  editingGoalId: string | null;
  initialForm: GoalFormState;
  goals: GoalProgress[];
  onClose: () => void;
  onSave: (goal: Goal) => void;
}

export function GoalFormModal({
  editingGoalId,
  initialForm,
  goals,
  onClose,
  onSave,
}: GoalFormModalProps) {
  const { formatCurrency } = useFormatCurrency();
  const [form, setForm] = useState<GoalFormState>(initialForm);
  const iconPicker = useIconPicker();

  // ─── Derived Values ────────────────────────────────────────

  const startingAmount = useMemo(
    () => parseAmount(form.startingAmount),
    [form.startingAmount],
  );
  const explicitTargetAmount = useMemo(
    () => parseAmount(form.targetAmount),
    [form.targetAmount],
  );
  const expectedContributionAmount = useMemo(
    () => parseAmount(form.expectedContributionAmount),
    [form.expectedContributionAmount],
  );
  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const hasExpectedContribution =
    form.targetMethod === "contribution" && expectedContributionAmount > 0;
  const contributionPeriods = useMemo(
    () =>
      getContributionPeriods(
        form.expectedContributionFrequency,
        form.dueDate,
      ),
    [form.expectedContributionFrequency, form.dueDate],
  );
  const contributionPeriodsLabel = useMemo(
    () =>
      formatContributionPeriods(
        form.expectedContributionFrequency,
        contributionPeriods,
      ),
    [contributionPeriods, form.expectedContributionFrequency],
  );
  const derivedContributionPlanAmount = useMemo(() => {
    if (!hasExpectedContribution) {
      return 0;
    }

    return getDerivedTargetAmount(
      expectedContributionAmount,
      contributionPeriods,
    );
  }, [contributionPeriods, hasExpectedContribution, expectedContributionAmount]);
  const yearlyContributionAmount = useMemo(
    () =>
      getYearlyContribution(
        form.expectedContributionFrequency,
        expectedContributionAmount,
      ),
    [expectedContributionAmount, form.expectedContributionFrequency],
  );

  const previewTargetAmount = explicitTargetAmount;
  const amountLeftToSave = Math.max(previewTargetAmount - startingAmount, 0);
  const isTargetConfigValid =
    form.targetMethod === "fixed"
      ? explicitTargetAmount >= 0
      : expectedContributionAmount > 0;
  const canSubmit = form.name.trim().length > 0 && isTargetConfigValid;
  const hasTarget = form.targetMethod === "fixed" && explicitTargetAmount > 0;

  // ─── Event Handlers ────────────────────────────────────────

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName || !canSubmit) {
      return;
    }

    const goalPayload: Goal = {
      id: editingGoalId ?? `goal-${Date.now()}`,
      name: trimmedName,
      description: form.description.trim() || undefined,
      icon: form.icon,
      startingAmount,
      targetAmount: hasTarget ? explicitTargetAmount : 0,
      hasTarget,
      deadline: form.dueDate || undefined,
      expectedContribution:
        form.targetMethod === "contribution" && hasExpectedContribution
          ? {
              amount: expectedContributionAmount,
              frequency: form.expectedContributionFrequency,
            }
          : undefined,
      createdAt: new Date().toISOString().split("T")[0],
      isArchived: false,
    };

    if (editingGoalId) {
      const existingGoal = goals.find(
        (goalProgress) => goalProgress.goal.id === editingGoalId,
      )?.goal;
      if (!existingGoal) {
        return;
      }

      onSave({
        ...goalPayload,
        createdAt: existingGoal.createdAt,
        isArchived: existingGoal.isArchived,
      });
    } else {
      onSave(goalPayload);
    }
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <Modal onClose={onClose} panelClassName="max-w-3xl p-5">
      <section>
        <div className="section-header mb-4">
          <h2 id="modal-title" className="heading-3 text-foreground">
            {editingGoalId ? "Edit Goal" : "Create Goal"}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block" htmlFor="goal-name">
                Goal name
              </label>
              <input
                id="goal-name"
                className="input"
                placeholder="Emergency Fund"
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

            <div className="relative">
              <label className="label mb-1.5 block" htmlFor="goal-icon-search">
                Icon
              </label>
              <button
                type="button"
                className="input flex items-center justify-between"
                onClick={() =>
                  iconPicker.setIsIconPickerOpen((current) => !current)
                }
                aria-expanded={iconPicker.isIconPickerOpen}
                aria-controls="goal-icon-picker"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon name={form.icon} size={16} className="text-foreground" />
                  <span className="text-body text-foreground truncate">
                    {form.icon}
                  </span>
                </span>
                <ChevronDown size={16} className="text-dimmed" />
              </button>

              {iconPicker.isIconPickerOpen && (
                <div
                  id="goal-icon-picker"
                  className="card absolute z-20 mt-2 w-full p-3"
                >
                  <div className="relative mb-3">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-dimmed"
                    />
                    <input
                      id="goal-icon-search"
                      className="input pl-9"
                      placeholder="Search icon"
                      value={iconPicker.iconSearchQuery}
                      onChange={(event) =>
                        iconPicker.setIconSearchQuery(event.target.value)
                      }
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-(--radius-md) border border-border">
                    {iconPicker.filteredIconNames.map((iconName) => {
                      const isSelected = form.icon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              icon: iconName,
                            }));
                            iconPicker.setIsIconPickerOpen(false);
                          }}
                          className={[
                            "w-full flex items-center gap-2 px-3 py-2 text-left border-none bg-transparent",
                            "transition-colors duration-150",
                            isSelected
                              ? "bg-secondary text-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          ].join(" ")}
                        >
                          <Icon name={iconName} size={16} />
                          <span className="text-ui">{iconName}</span>
                        </button>
                      );
                    })}

                    {iconPicker.filteredIconNames.length === 0 && (
                      <div className="px-3 py-4 text-ui text-dimmed">
                        No icons found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block" htmlFor="goal-description">
              Description
            </label>
            <textarea
              id="goal-description"
              className="w-full px-4 py-2.5 rounded-md bg-card border border-border text-foreground placeholder:text-dimmed focus:outline-none focus:ring-1 focus:ring-dimmed focus:border-dimmed transition-all duration-150 leading-5 min-h-16 resize-y"
              placeholder="Why are you saving for this goal?"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="label mb-1.5 block"
                htmlFor="goal-starting-amount"
              >
                Starting amount
              </label>
              <input
                id="goal-starting-amount"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.startingAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startingAmount: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <label className="label mb-1.5 block" htmlFor="goal-due-date">
                Due date (optional)
              </label>
              <input
                id="goal-due-date"
                className="input"
                type="date"
                min={todayDate}
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Target setup</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    targetMethod: "fixed",
                  }))
                }
                className={[
                  "card p-3 text-left transition-colors duration-150 border",
                  form.targetMethod === "fixed"
                    ? "border-foreground bg-secondary"
                    : "border-border hover:border-dimmed",
                ].join(" ")}
              >
                <div className="text-body text-foreground font-medium">
                  Fixed Target Amount
                </div>
                <div className="text-ui text-dimmed">
                  Set one exact target value.
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    targetMethod: "contribution",
                  }))
                }
                className={[
                  "card p-3 text-left transition-colors duration-150 border",
                  form.targetMethod === "contribution"
                    ? "border-foreground bg-secondary"
                    : "border-border hover:border-dimmed",
                ].join(" ")}
              >
                <div className="text-body text-foreground font-medium">
                  Contribution Plan
                </div>
                <div className="text-ui text-dimmed">
                  Set a recurring contribution without a fixed target.
                </div>
              </button>
            </div>
          </div>

          {form.targetMethod === "fixed" && (
            <div>
              <label
                className="label mb-1.5 block"
                htmlFor="goal-target-amount"
              >
                Target amount
              </label>
              <input
                id="goal-target-amount"
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="1200"
                value={form.targetAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetAmount: event.target.value,
                  }))
                }
                required={form.targetMethod === "fixed"}
              />
            </div>
          )}

          {form.targetMethod === "contribution" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="label mb-1.5 block"
                  htmlFor="goal-contribution-amount"
                >
                  Expected contribution
                </label>
                <input
                  id="goal-contribution-amount"
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100"
                  value={form.expectedContributionAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedContributionAmount: event.target.value,
                    }))
                  }
                  required={form.targetMethod === "contribution"}
                />
              </div>

              <div>
                <label
                  className="label mb-1.5 block"
                  htmlFor="goal-contribution-frequency"
                >
                  Contribution frequency
                </label>
                <select
                  id="goal-contribution-frequency"
                  className="select"
                  value={form.expectedContributionFrequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedContributionFrequency: event.target
                        .value as ContributionFrequency,
                    }))
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}

          <div className="card p-3.5 bg-background">
            {form.targetMethod === "fixed" ? (
              <>
                <div className="text-ui text-dimmed">Target preview</div>
                <div className="text-body text-foreground mt-1">
                  {formatCurrency(previewTargetAmount)}
                </div>
                <div className="text-ui text-dimmed mt-2">
                  Already saved: {formatCurrency(startingAmount)}
                </div>
                <div className="text-ui text-dimmed">
                  Left to save: {formatCurrency(amountLeftToSave)}
                </div>
              </>
            ) : (
              <>
                <div className="text-ui text-dimmed">
                  Contribution plan
                </div>
                <div className="text-body text-foreground mt-1">
                  {formatCurrency(expectedContributionAmount)}{" "}
                  {form.expectedContributionFrequency}
                </div>
                <div className="text-ui text-dimmed mt-2">
                  Yearly contribution:{" "}
                  {formatCurrency(yearlyContributionAmount)}
                </div>
                <div className="text-ui text-dimmed">
                  Horizon:{" "}
                  {form.dueDate
                    ? `until due date (${contributionPeriodsLabel})`
                    : `until year end (${contributionPeriodsLabel})`}
                </div>
                <div className="text-ui text-dimmed">
                  Planned total in horizon:{" "}
                  {formatCurrency(derivedContributionPlanAmount)}
                </div>
                <div className="text-ui text-dimmed">
                  Current saved amount: {formatCurrency(startingAmount)}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {editingGoalId ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
