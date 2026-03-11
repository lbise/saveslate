import { describe, expect, it, vi } from 'vitest';
import {
  createUniqueGoalId,
  saveGoals,
  loadGoals,
  addGoal,
  mergeGoals,
  updateGoal,
  deleteGoal,
} from '../../src/lib/goal-storage';
import type { Goal } from '../../src/types';

const GOALS_KEY = 'saveslate:goals';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    name: 'Emergency Fund',
    icon: 'Shield',
    targetAmount: 10000,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('createUniqueGoalId', () => {
  it('generates an id matching goal-{timestamp}-{random} format', () => {
    const id = createUniqueGoalId(new Set());
    expect(id).toMatch(/^goal-\d+-[a-z0-9]+$/);
  });

  it('avoids collisions with existing ids', () => {
    const fakeNow = 1000000;

    let callCount = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      // First call returns a value that produces the colliding suffix
      if (callCount === 1) return 0.001; // will collide
      return 0.999; // different value, won't collide
    });

    const firstId = `goal-${fakeNow}-${(0.001).toString(36).slice(2, 8)}`;
    const existingIds = new Set([firstId]);

    const result = createUniqueGoalId(existingIds);
    expect(result).not.toBe(firstId);
    expect(existingIds.has(result)).toBe(false);
    expect(result).toMatch(/^goal-\d+-[a-z0-9]+$/);

    vi.restoreAllMocks();
  });

  it('returns different ids on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(createUniqueGoalId(new Set()));
    }
    expect(ids.size).toBe(20);
  });
});

describe('saveGoals / loadGoals', () => {
  it('round-trips save and load', () => {
    const goals = [makeGoal(), makeGoal({ id: 'goal-2', name: 'Vacation' })];
    saveGoals(goals);
    const loaded = loadGoals();
    expect(loaded).toEqual(goals);
  });

  it('returns [] and saves [] when key is missing', () => {
    const result = loadGoals();
    expect(result).toEqual([]);
    expect(localStorage.getItem(GOALS_KEY)).toBe('[]');
  });

  it('returns [] and saves [] for invalid JSON', () => {
    localStorage.setItem(GOALS_KEY, '{not valid json!!!');
    const result = loadGoals();
    expect(result).toEqual([]);
    expect(localStorage.getItem(GOALS_KEY)).toBe('[]');
  });

  it('returns [] and saves [] for non-array JSON (object)', () => {
    localStorage.setItem(GOALS_KEY, JSON.stringify({ id: 'goal-1' }));
    const result = loadGoals();
    expect(result).toEqual([]);
    expect(localStorage.getItem(GOALS_KEY)).toBe('[]');
  });

  it('returns [] and saves [] for non-array JSON (string)', () => {
    localStorage.setItem(GOALS_KEY, JSON.stringify('hello'));
    const result = loadGoals();
    expect(result).toEqual([]);
    expect(localStorage.getItem(GOALS_KEY)).toBe('[]');
  });

  it('returns [] and saves [] for non-array JSON (number)', () => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(42));
    const result = loadGoals();
    expect(result).toEqual([]);
    expect(localStorage.getItem(GOALS_KEY)).toBe('[]');
  });

  describe('filters invalid goals', () => {
    it('filters out goal with missing id', () => {
      const raw = [{ name: 'X', icon: 'Y', targetAmount: 100, createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with empty id', () => {
      const raw = [{ id: '', name: 'X', icon: 'Y', targetAmount: 100, createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with missing name', () => {
      const raw = [{ id: 'g1', icon: 'Y', targetAmount: 100, createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with empty name', () => {
      const raw = [{ id: 'g1', name: '   ', icon: 'Y', targetAmount: 100, createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with missing icon', () => {
      const raw = [{ id: 'g1', name: 'X', targetAmount: 100, createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with missing createdAt', () => {
      const raw = [{ id: 'g1', name: 'X', icon: 'Y', targetAmount: 100 }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with non-finite targetAmount (NaN)', () => {
      const raw = [{ id: 'g1', name: 'X', icon: 'Y', targetAmount: NaN, createdAt: '2025-01-01' }];
      // NaN serializes to null in JSON
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with non-finite targetAmount (Infinity)', () => {
      // Infinity serializes to null in JSON, so set it manually
      localStorage.setItem(GOALS_KEY, '[{"id":"g1","name":"X","icon":"Y","targetAmount":Infinity,"createdAt":"2025-01-01"}]');
      // This is invalid JSON, so it will fail parsing
      expect(loadGoals()).toEqual([]);
    });

    it('filters out goal with string targetAmount', () => {
      const raw = [{ id: 'g1', name: 'X', icon: 'Y', targetAmount: 'not-a-number', createdAt: '2025-01-01' }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      expect(loadGoals()).toEqual([]);
    });

    it('filters out non-object items', () => {
      localStorage.setItem(GOALS_KEY, JSON.stringify(['string', 42, null, true]));
      expect(loadGoals()).toEqual([]);
    });
  });

  it('re-saves when filtering occurs', () => {
    const validGoal = makeGoal();
    const invalidGoal = { id: '', name: '', icon: '', targetAmount: 0, createdAt: '' };
    localStorage.setItem(GOALS_KEY, JSON.stringify([validGoal, invalidGoal]));

    const result = loadGoals();
    expect(result).toHaveLength(1);

    // localStorage should now contain only the valid goal
    const stored = JSON.parse(localStorage.getItem(GOALS_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('goal-1');
  });

  it('does not re-save when all goals are valid', () => {
    const goals = [makeGoal(), makeGoal({ id: 'goal-2', name: 'Travel' })];
    saveGoals(goals);

    const spy = vi.spyOn(Storage.prototype, 'setItem');
    loadGoals();
    // setItem should not be called again since all goals were valid
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('preserves optional fields', () => {
    it('preserves description', () => {
      const goal = makeGoal({ description: 'My emergency savings' });
      saveGoals([goal]);
      const loaded = loadGoals();
      expect(loaded[0].description).toBe('My emergency savings');
    });

    it('trims description and omits if empty', () => {
      const raw = [{
        id: 'g1', name: 'X', icon: 'Y', targetAmount: 100,
        createdAt: '2025-01-01', description: '   ',
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].description).toBeUndefined();
    });

    it('preserves startingAmount', () => {
      const goal = makeGoal({ startingAmount: 500 });
      saveGoals([goal]);
      const loaded = loadGoals();
      expect(loaded[0].startingAmount).toBe(500);
    });

    it('ignores non-finite startingAmount', () => {
      const raw = [{
        id: 'g1', name: 'X', icon: 'Y', targetAmount: 100,
        createdAt: '2025-01-01', startingAmount: 'not-a-number',
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].startingAmount).toBeUndefined();
    });

    it('preserves hasTarget', () => {
      const goal = makeGoal({ hasTarget: true });
      saveGoals([goal]);
      const loaded = loadGoals();
      expect(loaded[0].hasTarget).toBe(true);
    });

    it('preserves deadline', () => {
      const goal = makeGoal({ deadline: '2026-12-31' });
      saveGoals([goal]);
      const loaded = loadGoals();
      expect(loaded[0].deadline).toBe('2026-12-31');
    });

    it('trims deadline and omits if empty', () => {
      const raw = [{
        id: 'g1', name: 'X', icon: 'Y', targetAmount: 100,
        createdAt: '2025-01-01', deadline: '   ',
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].deadline).toBeUndefined();
    });

    it('preserves isArchived', () => {
      const goal = makeGoal({ isArchived: true });
      saveGoals([goal]);
      const loaded = loadGoals();
      expect(loaded[0].isArchived).toBe(true);
    });

    it('ignores non-boolean hasTarget', () => {
      const raw = [{
        id: 'g1', name: 'X', icon: 'Y', targetAmount: 100,
        createdAt: '2025-01-01', hasTarget: 'yes',
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].hasTarget).toBeUndefined();
    });

    it('ignores non-boolean isArchived', () => {
      const raw = [{
        id: 'g1', name: 'X', icon: 'Y', targetAmount: 100,
        createdAt: '2025-01-01', isArchived: 1,
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].isArchived).toBeUndefined();
    });
  });

  describe('expectedContribution parsing', () => {
    it('parses valid weekly expectedContribution', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 100, frequency: 'weekly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toEqual({ amount: 100, frequency: 'weekly' });
    });

    it('parses valid monthly expectedContribution', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 200, frequency: 'monthly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toEqual({ amount: 200, frequency: 'monthly' });
    });

    it('forces hasTarget to false when expectedContribution is present', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01', hasTarget: true,
        expectedContribution: { amount: 100, frequency: 'weekly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].hasTarget).toBe(false);
    });

    it('forces targetAmount to 0 when expectedContribution is present', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 100, frequency: 'weekly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].targetAmount).toBe(0);
    });

    it('rejects expectedContribution with missing amount', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { frequency: 'weekly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toBeUndefined();
      // targetAmount should NOT be forced to 0
      expect(loaded[0].targetAmount).toBe(5000);
    });

    it('rejects expectedContribution with non-finite amount', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 'abc', frequency: 'weekly' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toBeUndefined();
    });

    it('rejects expectedContribution with invalid frequency', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 100, frequency: 'daily' },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toBeUndefined();
    });

    it('rejects expectedContribution with missing frequency', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: { amount: 100 },
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toBeUndefined();
    });

    it('rejects expectedContribution that is not an object', () => {
      const raw = [{
        id: 'g1', name: 'Savings', icon: 'Piggy', targetAmount: 5000,
        createdAt: '2025-01-01',
        expectedContribution: 'invalid',
      }];
      localStorage.setItem(GOALS_KEY, JSON.stringify(raw));
      const loaded = loadGoals();
      expect(loaded[0].expectedContribution).toBeUndefined();
    });
  });
});

describe('addGoal', () => {
  it('adds a goal with the original id when unique', () => {
    const goal = makeGoal();
    const result = addGoal(goal);
    expect(result.id).toBe('goal-1');

    const stored = loadGoals();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(goal);
  });

  it('generates a new id when the original id collides', () => {
    saveGoals([makeGoal()]);

    const duplicate = makeGoal({ name: 'Different Goal' });
    const result = addGoal(duplicate);

    expect(result.id).not.toBe('goal-1');
    expect(result.id).toMatch(/^goal-\d+-[a-z0-9]+$/);
    expect(result.name).toBe('Different Goal');

    const stored = loadGoals();
    expect(stored).toHaveLength(2);
  });

  it('appends to existing goals', () => {
    saveGoals([makeGoal()]);

    const second = makeGoal({ id: 'goal-2', name: 'Vacation' });
    addGoal(second);

    const stored = loadGoals();
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('goal-1');
    expect(stored[1].id).toBe('goal-2');
  });

  it('returns the goal with its final id', () => {
    saveGoals([makeGoal()]);

    const result = addGoal(makeGoal({ id: 'goal-1' }));
    expect(result.id).not.toBe('goal-1');
    expect(result.name).toBe('Emergency Fund');
  });
});

describe('mergeGoals', () => {
  it('merges incoming goals without collisions (keeps original objects)', () => {
    saveGoals([makeGoal()]);

    const incoming1 = makeGoal({ id: 'goal-2', name: 'Vacation' });
    const incoming2 = makeGoal({ id: 'goal-3', name: 'Car' });
    const result = mergeGoals([incoming1, incoming2]);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('goal-1');
    expect(result[1]).toBe(incoming1); // same reference — no collision
    expect(result[2]).toBe(incoming2);
  });

  it('generates new ids for incoming goals that collide', () => {
    saveGoals([makeGoal()]);

    const colliding = makeGoal({ name: 'Colliding Goal' });
    const result = mergeGoals([colliding]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('goal-1');
    expect(result[1].id).not.toBe('goal-1');
    expect(result[1].name).toBe('Colliding Goal');
    // Should be a new object since id changed
    expect(result[1]).not.toBe(colliding);
  });

  it('handles empty existing goals', () => {
    const incoming = [makeGoal({ id: 'goal-1' }), makeGoal({ id: 'goal-2', name: 'Travel' })];
    const result = mergeGoals(incoming);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(incoming[0]); // no collision — same reference
    expect(result[1]).toBe(incoming[1]);
  });

  it('handles empty incoming goals', () => {
    saveGoals([makeGoal()]);
    const result = mergeGoals([]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('goal-1');
  });

  it('avoids collisions between incoming goals themselves', () => {
    const dup1 = makeGoal({ id: 'goal-same', name: 'First' });
    const dup2 = makeGoal({ id: 'goal-same', name: 'Second' });
    const result = mergeGoals([dup1, dup2]);

    expect(result).toHaveLength(2);
    // First incoming keeps original id, second gets a new one
    expect(result[0]).toBe(dup1);
    expect(result[1].id).not.toBe('goal-same');
    expect(result[1].name).toBe('Second');
  });

  it('saves merged result to localStorage', () => {
    saveGoals([makeGoal()]);
    mergeGoals([makeGoal({ id: 'goal-2', name: 'New' })]);

    const stored = loadGoals();
    expect(stored).toHaveLength(2);
  });
});

describe('updateGoal', () => {
  it('replaces the entire goal object by id', () => {
    saveGoals([makeGoal(), makeGoal({ id: 'goal-2', name: 'Vacation' })]);

    const updated = makeGoal({
      id: 'goal-1',
      name: 'Updated Fund',
      targetAmount: 20000,
      description: 'Updated description',
    });

    const result = updateGoal(updated);
    expect(result).toEqual(updated);

    const stored = loadGoals();
    expect(stored[0]).toEqual(updated);
    expect(stored[1].id).toBe('goal-2');
  });

  it('returns null for a non-existent id', () => {
    saveGoals([makeGoal()]);
    const result = updateGoal(makeGoal({ id: 'nonexistent' }));
    expect(result).toBeNull();
  });

  it('does not modify goals when id is not found', () => {
    const goals = [makeGoal()];
    saveGoals(goals);
    updateGoal(makeGoal({ id: 'nonexistent' }));

    const stored = loadGoals();
    expect(stored).toEqual(goals);
  });
});

describe('deleteGoal', () => {
  it('deletes an existing goal and returns true', () => {
    saveGoals([makeGoal(), makeGoal({ id: 'goal-2', name: 'Vacation' })]);

    const result = deleteGoal('goal-1');
    expect(result).toBe(true);

    const stored = loadGoals();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('goal-2');
  });

  it('returns false for a non-existent id', () => {
    saveGoals([makeGoal()]);
    const result = deleteGoal('nonexistent');
    expect(result).toBe(false);
  });

  it('does not modify goals when id is not found', () => {
    const goals = [makeGoal()];
    saveGoals(goals);
    deleteGoal('nonexistent');

    const stored = loadGoals();
    expect(stored).toEqual(goals);
  });

  it('can delete the last remaining goal', () => {
    saveGoals([makeGoal()]);
    const result = deleteGoal('goal-1');
    expect(result).toBe(true);
    expect(loadGoals()).toEqual([]);
  });
});
