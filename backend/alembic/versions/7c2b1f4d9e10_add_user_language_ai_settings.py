"""add_user_language_ai_settings

Revision ID: 7c2b1f4d9e10
Revises: 3f4e5a6b7c8d
Create Date: 2026-04-15 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2b1f4d9e10'
down_revision: Union[str, Sequence[str], None] = '3f4e5a6b7c8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('preferred_language', sa.String(length=5), server_default='en', nullable=False),
    )
    op.add_column(
        'users',
        sa.Column('ai_translate_descriptions', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'ai_translate_descriptions')
    op.drop_column('users', 'preferred_language')
