import type { Goal } from '../../types';

// Helper to generate dates
const monthsFromNow = (months: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Sample goals
export const GOALS: Goal[] = [
  {
    id: 'goal-1',
    name: 'Summer Vacation',
    icon: 'Palmtree',
    targetAmount: 3000,
    deadline: monthsFromNow(6),
    createdAt: daysAgo(60),
    isArchived: false,
  },
  {
    id: 'goal-2',
    name: 'New Laptop',
    icon: 'Laptop',
    targetAmount: 2000,
    deadline: monthsFromNow(3),
    createdAt: daysAgo(30),
    isArchived: false,
  },
];

export const getGoalById = (id: string): Goal | undefined => {
  return GOALS.find((goal) => goal.id === id);
};

export const getActiveGoals = (): Goal[] => {
  return GOALS.filter((goal) => !goal.isArchived);
};

export const getArchivedGoals = (): Goal[] => {
  return GOALS.filter((goal) => goal.isArchived);
};
