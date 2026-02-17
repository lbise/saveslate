import { loadGoals } from '../../lib/goal-storage';
import type { Goal } from '../../types';

export const GOALS: Goal[] = loadGoals();

export const getGoals = (): Goal[] => {
  return loadGoals();
};

export const getGoalById = (id: string): Goal | undefined => {
  return getGoals().find((goal) => goal.id === id);
};

export const getActiveGoals = (): Goal[] => {
  return getGoals().filter((goal) => !goal.isArchived);
};

export const getArchivedGoals = (): Goal[] => {
  return getGoals().filter((goal) => goal.isArchived);
};
