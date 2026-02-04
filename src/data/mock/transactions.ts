import type { Transaction } from '../../types';

// Helper to generate dates relative to today
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Realistic Swiss-life transactions over the past month
export const TRANSACTIONS: Transaction[] = [
  // Today
  {
    id: 't1',
    amount: 12.5,
    type: 'expense',
    tagIds: ['dining'],
    description: 'Coffee & croissant at Starbucks',
    date: daysAgo(0),
    accountId: 'main-checking',
  },

  // Yesterday
  {
    id: 't2',
    amount: 87.3,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Weekly groceries at Migros',
    date: daysAgo(1),
    accountId: 'main-checking',
    // Split expense example - pending reimbursement
    split: {
      ratio: 0.5,
      status: 'pending',
    },
  },
  {
    id: 't3',
    amount: 25.0,
    type: 'expense',
    tagIds: ['entertainment'],
    description: 'Cinema tickets',
    date: daysAgo(1),
    accountId: 'credit-card',
  },

  // 2 days ago
  {
    id: 't4',
    amount: 45.0,
    type: 'expense',
    tagIds: ['transport'],
    description: 'SBB monthly pass top-up',
    date: daysAgo(2),
    accountId: 'main-checking',
  },

  // 3 days ago
  {
    id: 't5',
    amount: 7200.0,
    type: 'income',
    tagIds: ['salary'],
    description: 'Monthly salary',
    date: daysAgo(3),
    accountId: 'main-checking',
  },
  {
    id: 't6',
    amount: 156.8,
    type: 'expense',
    tagIds: ['shopping', 'health'], // Multiple tags example
    description: 'New running shoes at Ochsner Sport',
    date: daysAgo(3),
    accountId: 'credit-card',
  },

  // 4 days ago
  {
    id: 't7',
    amount: 32.5,
    type: 'expense',
    tagIds: ['dining'],
    description: 'Lunch with friends at Holy Cow',
    date: daysAgo(4),
    accountId: 'cash',
    // Split expense - already reimbursed
    split: {
      ratio: 0.5,
      status: 'reimbursed',
    },
  },

  // 5 days ago
  {
    id: 't8',
    amount: 15.9,
    type: 'expense',
    tagIds: ['subscriptions'],
    description: 'Spotify Premium',
    date: daysAgo(5),
    accountId: 'credit-card',
  },
  {
    id: 't9',
    amount: 23.9,
    type: 'expense',
    tagIds: ['subscriptions'],
    description: 'Netflix',
    date: daysAgo(5),
    accountId: 'credit-card',
  },

  // 6 days ago
  {
    id: 't10',
    amount: 65.0,
    type: 'expense',
    tagIds: ['health'],
    description: 'Pharmacy - vitamins & supplements',
    date: daysAgo(6),
    accountId: 'main-checking',
  },

  // 1 week ago
  {
    id: 't11',
    amount: 42.3,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Coop Pronto snacks',
    date: daysAgo(7),
    accountId: 'cash',
  },
  {
    id: 't12',
    amount: 350.0,
    type: 'income',
    tagIds: ['freelance'],
    description: 'Freelance web design project',
    date: daysAgo(7),
    accountId: 'main-checking',
  },

  // 8 days ago
  {
    id: 't13',
    amount: 89.0,
    type: 'expense',
    tagIds: ['dining', 'gifts'], // Multiple tags - dinner was also a birthday treat
    description: 'Birthday dinner at Clouds',
    date: daysAgo(8),
    accountId: 'credit-card',
  },

  // 10 days ago
  {
    id: 't14',
    amount: 1450.0,
    type: 'expense',
    tagIds: ['home'],
    description: 'Monthly rent',
    date: daysAgo(10),
    accountId: 'main-checking',
    // Split expense - pending
    split: {
      ratio: 0.5,
      status: 'pending',
    },
  },
  {
    id: 't15',
    amount: 78.5,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Aldi weekly shop',
    date: daysAgo(10),
    accountId: 'main-checking',
  },

  // 12 days ago - Vacation saving transactions
  {
    id: 't16',
    amount: 200.0,
    type: 'expense',
    tagIds: ['travel', 'goal-summer-vacation'], // Tagged for vacation goal
    description: 'Weekend trip to Lucerne - train tickets',
    date: daysAgo(12),
    accountId: 'main-checking',
  },
  {
    id: 't17',
    amount: 145.0,
    type: 'expense',
    tagIds: ['travel', 'goal-summer-vacation'], // Tagged for vacation goal
    description: 'Hotel in Lucerne',
    date: daysAgo(12),
    accountId: 'credit-card',
  },

  // 14 days ago
  {
    id: 't18',
    amount: 55.0,
    type: 'expense',
    tagIds: ['gifts'],
    description: 'Birthday gift for Maria',
    date: daysAgo(14),
    accountId: 'main-checking',
  },

  // 15 days ago
  {
    id: 't19',
    amount: 92.6,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Big Migros haul',
    date: daysAgo(15),
    accountId: 'main-checking',
  },

  // 17 days ago
  {
    id: 't20',
    amount: 39.9,
    type: 'expense',
    tagIds: ['entertainment'],
    description: 'Steam game sale',
    date: daysAgo(17),
    accountId: 'credit-card',
  },

  // 18 days ago
  {
    id: 't21',
    amount: 100.0,
    type: 'income',
    tagIds: ['gifts-received'],
    description: 'Birthday money from grandma',
    date: daysAgo(18),
    accountId: 'cash',
  },

  // 20 days ago
  {
    id: 't22',
    amount: 28.5,
    type: 'expense',
    tagIds: ['transport'],
    description: 'Uber ride home',
    date: daysAgo(20),
    accountId: 'main-checking',
  },

  // 21 days ago
  {
    id: 't23',
    amount: 120.0,
    type: 'expense',
    tagIds: ['health'],
    description: 'Gym membership monthly',
    date: daysAgo(21),
    accountId: 'main-checking',
  },

  // 23 days ago
  {
    id: 't24',
    amount: 67.8,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Lidl groceries',
    date: daysAgo(23),
    accountId: 'main-checking',
  },

  // 25 days ago
  {
    id: 't25',
    amount: 245.0,
    type: 'expense',
    tagIds: ['shopping'],
    description: 'Winter jacket at Manor',
    date: daysAgo(25),
    accountId: 'credit-card',
  },

  // 27 days ago
  {
    id: 't26',
    amount: 18.9,
    type: 'expense',
    tagIds: ['dining'],
    description: 'Takeaway sushi',
    date: daysAgo(27),
    accountId: 'main-checking',
  },

  // 28 days ago - Laptop saving
  {
    id: 't27',
    amount: 500.0,
    type: 'expense',
    tagIds: ['home', 'goal-new-laptop'], // Tagged for laptop goal
    description: 'New desk chair',
    date: daysAgo(28),
    accountId: 'credit-card',
  },

  // 30 days ago
  {
    id: 't28',
    amount: 7200.0,
    type: 'income',
    tagIds: ['salary'],
    description: 'Monthly salary',
    date: daysAgo(30),
    accountId: 'main-checking',
  },
  {
    id: 't29',
    amount: 85.0,
    type: 'expense',
    tagIds: ['subscriptions'],
    description: 'Mobile phone plan',
    date: daysAgo(30),
    accountId: 'main-checking',
  },
  {
    id: 't30',
    amount: 45.5,
    type: 'expense',
    tagIds: ['groceries'],
    description: 'Quick Denner run',
    date: daysAgo(30),
    accountId: 'cash',
  },
];

// Sort transactions by date (newest first)
export const getTransactionsSorted = (): Transaction[] => {
  return [...TRANSACTIONS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getRecentTransactions = (count: number = 5): Transaction[] => {
  return getTransactionsSorted().slice(0, count);
};

export const getTransactionsByDateRange = (
  startDate: string,
  endDate: string
): Transaction[] => {
  return getTransactionsSorted().filter((t) => {
    return t.date >= startDate && t.date <= endDate;
  });
};

export const getTransactionsByTag = (tagId: string): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.tagIds.includes(tagId));
};

export const getTransactionsByAccount = (accountId: string): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.accountId === accountId);
};

export const getSplitTransactions = (): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.split !== undefined);
};

export const getPendingSplitTransactions = (): Transaction[] => {
  return getTransactionsSorted().filter((t) => t.split?.status === 'pending');
};
