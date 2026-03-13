import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pencil, Trash2 } from 'lucide-react';
import { EntityCardOverflowMenu } from '../../src/components/ui/EntityCard';

describe('EntityCardOverflowMenu', () => {
  it('opens the menu when the trigger is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <EntityCardOverflowMenu
        label="More actions"
        actions={[
          { label: 'Edit', icon: Pencil, onClick: onEdit },
          { label: 'Delete', icon: Trash2, onClick: vi.fn(), tone: 'danger' },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  });
});
