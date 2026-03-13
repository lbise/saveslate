"""add_transaction_notes

Revision ID: 9b3f5f7a14d2
Revises: 5a57d82a2ce3
Create Date: 2026-03-13 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b3f5f7a14d2'
down_revision: Union[str, Sequence[str], None] = '5a57d82a2ce3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transactions', sa.Column('notes', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transactions', 'notes')
