"""add_category_group_type

Revision ID: 3f4e5a6b7c8d
Revises: 9b3f5f7a14d2
Create Date: 2026-03-17 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f4e5a6b7c8d'
down_revision: Union[str, Sequence[str], None] = '9b3f5f7a14d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'category_groups',
        sa.Column('type', sa.String(length=10), server_default='expense', nullable=False),
    )
    op.create_check_constraint(
        'ck_category_groups_type',
        'category_groups',
        "type IN ('expense', 'income', 'transfer')",
    )
    op.execute(
        """
        UPDATE category_groups
        SET type = CASE
            WHEN lower(name) = 'income' THEN 'income'
            WHEN lower(name) = 'transfers' THEN 'transfer'
            ELSE 'expense'
        END
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_category_groups_type', 'category_groups', type_='check')
    op.drop_column('category_groups', 'type')
