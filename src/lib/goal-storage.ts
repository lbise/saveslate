import type { Goal } from '../types';

const GOALS_KEY = 'melomoney:goals';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isContributionFrequency(value: unknown): value is 'weekly' | 'monthly' {
  return value === 'weekly' || value === 'monthly';
}

function parseGoal(value: unknown): Goal | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const icon = typeof value.icon === 'string' ? value.icon.trim() : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt.trim() : '';
  const targetAmount = typeof value.targetAmount === 'number' && Number.isFinite(value.targetAmount)
    ? value.targetAmount
    : Number.NaN;

  if (!id || !name || !icon || !createdAt || Number.isNaN(targetAmount)) {
    return null;
  }

  const parsedGoal: Goal = {
    id,
    name,
    icon,
    targetAmount,
    createdAt,
  };

  if (typeof value.description === 'string' && value.description.trim()) {
    parsedGoal.description = value.description.trim();
  }

  if (typeof value.startingAmount === 'number' && Number.isFinite(value.startingAmount)) {
    parsedGoal.startingAmount = value.startingAmount;
  }

  if (typeof value.hasTarget === 'boolean') {
    parsedGoal.hasTarget = value.hasTarget;
  }

  if (typeof value.deadline === 'string' && value.deadline.trim()) {
    parsedGoal.deadline = value.deadline.trim();
  }

  if (typeof value.isArchived === 'boolean') {
    parsedGoal.isArchived = value.isArchived;
  }

  if (isRecord(value.expectedContribution)) {
    const amount = value.expectedContribution.amount;
    const frequency = value.expectedContribution.frequency;
    if (typeof amount === 'number' && Number.isFinite(amount) && isContributionFrequency(frequency)) {
      parsedGoal.expectedContribution = {
        amount,
        frequency,
      };
    }
  }

  // Contribution-plan goals are open-ended by design.
  if (parsedGoal.expectedContribution) {
    parsedGoal.hasTarget = false;
    parsedGoal.targetAmount = 0;
  }

  return parsedGoal;
}

export function createUniqueGoalId(existingIds: Set<string>): string {
  let candidate = '';
  do {
    candidate = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

export function saveGoals(goals: Goal[]): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) {
      const emptyGoals: Goal[] = [];
      saveGoals(emptyGoals);
      return emptyGoals;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      const emptyGoals: Goal[] = [];
      saveGoals(emptyGoals);
      return emptyGoals;
    }

    const goals = parsed
      .map((goal) => parseGoal(goal))
      .filter((goal): goal is Goal => goal !== null);

    if (goals.length !== parsed.length) {
      saveGoals(goals);
    }

    return goals;
  } catch {
    const emptyGoals: Goal[] = [];
    saveGoals(emptyGoals);
    return emptyGoals;
  }
}

export function addGoal(goal: Goal): Goal {
  const goals = loadGoals();
  const existingIds = new Set(goals.map((existingGoal) => existingGoal.id));
  const nextId = goal.id && !existingIds.has(goal.id)
    ? goal.id
    : createUniqueGoalId(existingIds);

  const newGoal: Goal = {
    ...goal,
    id: nextId,
  };

  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
}

export function mergeGoals(incomingGoals: Goal[]): Goal[] {
  const existingGoals = loadGoals();
  const existingGoalIds = new Set(existingGoals.map((goal) => goal.id));

  const merged = [
    ...existingGoals,
    ...incomingGoals.map((goal) => {
      const nextId = goal.id && !existingGoalIds.has(goal.id)
        ? goal.id
        : createUniqueGoalId(existingGoalIds);

      existingGoalIds.add(nextId);

      if (nextId === goal.id) {
        return goal;
      }

      return {
        ...goal,
        id: nextId,
      };
    }),
  ];

  saveGoals(merged);
  return merged;
}

export function updateGoal(updatedGoal: Goal): Goal | null {
  const goals = loadGoals();
  const goalIndex = goals.findIndex((goal) => goal.id === updatedGoal.id);
  if (goalIndex === -1) {
    return null;
  }

  goals[goalIndex] = updatedGoal;
  saveGoals(goals);
  return updatedGoal;
}

export function deleteGoal(goalId: string): boolean {
  const goals = loadGoals();
  const nextGoals = goals.filter((goal) => goal.id !== goalId);
  if (nextGoals.length === goals.length) {
    return false;
  }

  saveGoals(nextGoals);
  return true;
}
