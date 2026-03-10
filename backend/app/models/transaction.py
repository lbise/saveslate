"""Transaction and TransactionTag models."""

import uuid
from datetime import date, time, datetime
from decimal import Decimal

from sqlalchemy import (
    String, Date, Time, DateTime, Numeric, ForeignKey, CheckConstraint, Index, Table, Column, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

TRANSFER_PAIR_ROLES = ("source", "destination")

# Junction table for many-to-many transaction <-> tag
TransactionTag = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            f"transfer_pair_role IN ({', '.join(repr(r) for r in TRANSFER_PAIR_ROLES)}) OR transfer_pair_role IS NULL",
            name="ck_transactions_transfer_pair_role",
        ),
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_user_account", "user_id", "account_id"),
        Index("ix_transactions_user_category", "user_id", "category_id"),
        Index("ix_transactions_user_goal", "user_id", "goal_id"),
        Index("ix_transactions_user_import_batch", "user_id", "import_batch_id"),
        Index("ix_transactions_user_transfer_pair", "user_id", "transfer_pair_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[time | None] = mapped_column(Time, nullable=True)
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    transfer_pair_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transfer_pair_role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("goals.id", ondelete="SET NULL"), nullable=True
    )
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True
    )
    split_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    metadata_: Mapped[list | None] = mapped_column("metadata", JSONB, nullable=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="transactions")  # noqa: F821
    account: Mapped["Account"] = relationship("Account", back_populates="transactions")  # noqa: F821
    category: Mapped["Category | None"] = relationship("Category")  # noqa: F821
    goal: Mapped["Goal | None"] = relationship("Goal")  # noqa: F821
    import_batch: Mapped["ImportBatch | None"] = relationship("ImportBatch")  # noqa: F821
    tags: Mapped[list["Tag"]] = relationship(  # noqa: F821
        "Tag", secondary="transaction_tags", back_populates="transactions"
    )
