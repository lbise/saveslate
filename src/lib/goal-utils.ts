import type { ContributionFrequency, Goal, GoalProgress } from "../types";

// ─── Types ───────────────────────────────────────────────────

export type TargetMethod = "fixed" | "contribution";

export interface GoalFormState {
  name: string;
  description: string;
  icon: string;
  targetMethod: TargetMethod;
  dueDate: string;
  startingAmount: string;
  targetAmount: string;
  expectedContributionAmount: string;
  expectedContributionFrequency: ContributionFrequency;
}

export const DEFAULT_FORM_STATE: GoalFormState = {
  name: "",
  description: "",
  icon: "Target",
  targetMethod: "fixed",
  dueDate: "",
  startingAmount: "0",
  targetAmount: "",
  expectedContributionAmount: "",
  expectedContributionFrequency: "monthly",
};

export interface ExportedGoalProgress {
  goal: Goal;
  currentAmount: number;
  transactionCount: number;
}

export interface ExportedGoalsFile {
  schemaVersion: number;
  exportedAt: string;
  goalCount: number;
  goals: ExportedGoalProgress[];
}

export const GOALS_EXPORT_SCHEMA_VERSION = 1;

// ─── Parsing Helpers ─────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNonNegativeNumber(value: unknown, fallback = 0): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return fallback;
  }

  return value;
}

function parseFiniteNumber(value: unknown, fallback = 0): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return value;
}

function parseNonNegativeInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function parseDateString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const normalized = value.trim();
  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return normalized;
}

function isContributionFrequency(
  value: unknown,
): value is ContributionFrequency {
  return value === "weekly" || value === "monthly";
}

function parseExpectedContribution(
  value: unknown,
): Goal["expectedContribution"] {
  if (!isRecord(value)) {
    return undefined;
  }

  const amount = parseNonNegativeNumber(value.amount, 0);
  if (amount <= 0 || !isContributionFrequency(value.frequency)) {
    return undefined;
  }

  return {
    amount,
    frequency: value.frequency,
  };
}

function calculateGoalPercentage(goal: Goal, currentAmount: number): number {
  if (goal.hasTarget === false || goal.targetAmount <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min((currentAmount / goal.targetAmount) * 100, 100),
  );
}

function parseImportedGoalEntry(
  entry: unknown,
  index: number,
): GoalProgress {
  if (!isRecord(entry) || !isRecord(entry.goal)) {
    throw new Error(`Goal #${index + 1} is missing goal details.`);
  }

  const rawGoal = entry.goal;
  const name = typeof rawGoal.name === "string" ? rawGoal.name.trim() : "";
  if (!name) {
    throw new Error(`Goal #${index + 1} is missing a name.`);
  }

  const icon =
    typeof rawGoal.icon === "string" && rawGoal.icon.trim().length > 0
      ? rawGoal.icon.trim()
      : "Target";
  const targetAmount = parseNonNegativeNumber(rawGoal.targetAmount, 0);
  const hasTarget =
    typeof rawGoal.hasTarget === "boolean"
      ? rawGoal.hasTarget && targetAmount > 0
      : targetAmount > 0;
  const createdAt =
    parseDateString(rawGoal.createdAt) ??
    new Date().toISOString().split("T")[0];
  const startingAmount = parseFiniteNumber(rawGoal.startingAmount, 0);
  const expectedContribution = parseExpectedContribution(
    rawGoal.expectedContribution,
  );
  const isContributionPlan = Boolean(expectedContribution);
  const description =
    typeof rawGoal.description === "string"
      ? rawGoal.description.trim() || undefined
      : undefined;

  const goal: Goal = {
    id: typeof rawGoal.id === "string" ? rawGoal.id.trim() : "",
    name,
    description,
    icon,
    startingAmount,
    targetAmount: isContributionPlan ? 0 : hasTarget ? targetAmount : 0,
    hasTarget: isContributionPlan ? false : hasTarget,
    deadline: parseDateString(rawGoal.deadline),
    expectedContribution,
    createdAt,
    isArchived:
      typeof rawGoal.isArchived === "boolean" ? rawGoal.isArchived : false,
  };

  const importedCurrentAmount = parseFiniteNumber(
    entry.currentAmount,
    startingAmount,
  );
  const currentAmount = importedCurrentAmount;
  const transactionCount = parseNonNegativeInteger(entry.transactionCount, 0);

  return {
    goal,
    currentAmount,
    percentage: calculateGoalPercentage(goal, currentAmount),
    transactionCount,
  };
}

export function parseImportedGoals(rawContent: string): GoalProgress[] {
  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(rawContent) as unknown;
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (!Array.isArray(parsedContent) && !isRecord(parsedContent)) {
    throw new Error("Invalid goals file format.");
  }

  if (
    isRecord(parsedContent) &&
    "schemaVersion" in parsedContent &&
    parsedContent.schemaVersion !== GOALS_EXPORT_SCHEMA_VERSION
  ) {
    throw new Error("Unsupported goals file version.");
  }

  const rawGoals = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent.goals;

  if (!Array.isArray(rawGoals)) {
    throw new Error("Goals file is missing a goals array.");
  }

  const importedGoals = rawGoals.map((goalEntry, index) =>
    parseImportedGoalEntry(goalEntry, index),
  );
  if (importedGoals.length === 0) {
    throw new Error("No goals found in file.");
  }

  return importedGoals;
}

// ─── Calculation Helpers ─────────────────────────────────────

export function parseAmount(value: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function getContributionPeriods(
  contributionFrequency: ContributionFrequency,
  dueDate: string,
): number {
  const today = new Date();
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const effectiveDueDate = dueDate
    ? new Date(`${dueDate}T00:00:00`)
    : new Date(startDate.getFullYear(), 11, 31);

  const parsedDueDate = effectiveDueDate;
  if (Number.isNaN(parsedDueDate.getTime()) || parsedDueDate <= startDate) {
    return 1;
  }

  if (contributionFrequency === "weekly") {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const dayDiff = Math.floor(
      (parsedDueDate.getTime() - startDate.getTime()) / millisecondsPerDay,
    );
    return Math.max(1, Math.floor(dayDiff / 7));
  }

  const monthDiff =
    (parsedDueDate.getFullYear() - startDate.getFullYear()) * 12 +
    parsedDueDate.getMonth() -
    startDate.getMonth();
  const adjustedMonthDiff =
    parsedDueDate.getDate() < startDate.getDate()
      ? monthDiff - 1
      : monthDiff;
  return Math.max(1, adjustedMonthDiff);
}

export function getDerivedTargetAmount(
  contributionAmount: number,
  contributionPeriods: number,
): number {
  return contributionAmount * contributionPeriods;
}

export function getYearlyContribution(
  contributionFrequency: ContributionFrequency,
  contributionAmount: number,
): number {
  if (contributionAmount <= 0) {
    return 0;
  }

  return contributionFrequency === "weekly"
    ? contributionAmount * 52
    : contributionAmount * 12;
}

export function formatContributionPeriods(
  contributionFrequency: ContributionFrequency,
  contributionPeriods: number,
): string {
  const label = contributionFrequency === "weekly" ? "week" : "month";
  return `${contributionPeriods} ${label}${contributionPeriods === 1 ? "" : "s"}`;
}

export function toGoalFormState(goal: Goal): GoalFormState {
  return {
    name: goal.name,
    description: goal.description ?? "",
    icon: goal.icon,
    targetMethod: goal.expectedContribution ? "contribution" : "fixed",
    dueDate: goal.deadline ?? "",
    startingAmount: String(goal.startingAmount ?? 0),
    targetAmount: String(goal.targetAmount),
    expectedContributionAmount: goal.expectedContribution
      ? String(goal.expectedContribution.amount)
      : "",
    expectedContributionFrequency:
      goal.expectedContribution?.frequency ?? "monthly",
  };
}
