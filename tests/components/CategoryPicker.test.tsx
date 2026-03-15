import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingContext } from '../../src/context';
import { CategoryPicker } from '../../src/components/ui/CategoryPicker';
import { api } from '../../src/lib/api-client';

import type { ReactNode } from 'react';
import type { OnboardingContextValue } from '../../src/context';
import type { Category, CategoryGroup } from '../../src/types';

vi.mock('../../src/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Groceries',
    icon: 'ShoppingCart',
    groupId: 'group-food',
  },
  {
    id: 'cat-2',
    name: 'Dining',
    icon: 'UtensilsCrossed',
    groupId: 'group-food',
  },
  {
    id: 'cat-3',
    name: 'Transport',
    icon: 'Car',
  },
];

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'group-food',
    name: 'Food',
    icon: 'UtensilsCrossed',
    order: 1,
  },
];

const ONBOARDING_CONTEXT_VALUE: OnboardingContextValue = {
  onboardingState: {
    version: 1,
    isComplete: true,
  },
  isOnboardingComplete: true,
  completeOnboarding: () => undefined,
  resetOnboarding: () => undefined,
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <OnboardingContext.Provider value={ONBOARDING_CONTEXT_VALUE}>
          {children}
        </OnboardingContext.Provider>
      </QueryClientProvider>
    );
  };
}

function CategoryPickerHarness() {
  const [currentCategoryId, setCurrentCategoryId] = useState('cat-1');
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const handleSelect = (categoryId: string) => {
    setCurrentCategoryId(categoryId);
    setRecentCategoryIds((prev) =>
      [categoryId, ...prev.filter((id) => id !== categoryId)].slice(0, 4),
    );
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(true)}>
        Open category picker
      </button>
      {isOpen && (
        <CategoryPicker
          currentCategoryId={currentCategoryId}
          recentCategoryIds={recentCategoryIds}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

describe('CategoryPicker', () => {
  it('shows recent categories once and keeps them in most-recent-first order', async () => {
    const user = userEvent.setup();
    const mockApiGet = vi.mocked(api.get);

    mockApiGet.mockImplementation(async (url) => {
      if (url === '/api/categories') {
        return CATEGORIES;
      }

      if (url === '/api/category-groups') {
        return CATEGORY_GROUPS;
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<CategoryPickerHarness />, { wrapper: createWrapper() });

    await user.click(await screen.findByText('Dining'));

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open category picker' }));
    await screen.findByText('Recent');

    expect(screen.getAllByText('Dining')).toHaveLength(1);

    await user.click(await screen.findByText('Transport'));
    await user.click(screen.getByRole('button', { name: 'Open category picker' }));
    await screen.findByText('Recent');

    expect(screen.getAllByText('Transport')).toHaveLength(1);
    expect(screen.getAllByText('Dining')).toHaveLength(1);

    const transport = screen.getByText('Transport');
    const dining = screen.getByText('Dining');

    expect(
      transport.compareDocumentPosition(dining) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
