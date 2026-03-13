import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ActionMenu } from '../../src/components/transactions/ActionMenu';
import { TagPicker } from '../../src/components/ui/TagPicker';
import type { Tag } from '../../src/types';

const TAGS: Tag[] = [
  {
    id: 'tag-1',
    name: 'Food',
    color: '#55AEC8',
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
  },
];

function ActionMenuHarness() {
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  return (
    <div className="relative">
      <ActionMenu
        onAction={() => undefined}
        onEditGoal={() => undefined}
        onEditTags={() => {
          setIsActionOpen(false);
          setIsEditingTags((prev) => !prev);
        }}
        onRemoveGoal={() => undefined}
        onCreateRule={() => undefined}
        hasGoal={false}
        hasTags={false}
        hasNote={false}
        open={isActionOpen}
        onOpenChange={setIsActionOpen}
      />
      {isEditingTags && (
        <TagPicker
          tags={TAGS}
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          onCreateTag={async (draft) => ({
            id: 'tag-new',
            ...draft,
            createdAt: '2026-03-14T00:00:00.000Z',
            updatedAt: '2026-03-14T00:00:00.000Z',
          })}
          onUpdateTag={async () => undefined}
          onDeleteTag={async () => true}
          tagUsageCountById={new Map([['tag-1', 3]])}
          onClose={() => setIsEditingTags(false)}
        />
      )}
    </div>
  );
}

describe('ActionMenu', () => {
  it('keeps the tag picker open when launching it from the menu', async () => {
    const user = userEvent.setup();

    render(<ActionMenuHarness />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: 'Set tags' }));

    const searchInput = await screen.findByPlaceholderText('Search tags...');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => expect(searchInput).toHaveFocus());
    expect(searchInput).toBeVisible();
  });
});
