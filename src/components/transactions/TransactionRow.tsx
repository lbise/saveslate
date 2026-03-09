import { Tag, Users, MoreHorizontal } from "lucide-react";
import {
  Badge,
  CategoryPicker,
  GoalPicker,
  Icon,
  TagPicker,
} from "../ui";
import { useFormatCurrency } from "../../hooks";
import { cn, formatDate, resolveTransferFlowAccounts } from "../../lib/utils";
import { UNCATEGORIZED_CATEGORY_ID } from "../../lib/transaction-type";
import {
  getAmountColorClass,
  iconBoxStyles,
  UNCATEGORIZED_ICON_STYLE,
} from "../../lib/transaction-utils";
import { ActionMenu } from "./ActionMenu";
import type {
  Tag as TransactionTag,
  TransactionWithDetails as TxDetails,
} from "../../types";

export interface TransactionRowProps {
  transaction: TxDetails;
  openCategoryUpward: boolean;
  isActionOpen: boolean;
  isEditingCategory: boolean;
  isEditingGoal: boolean;
  isEditingTags: boolean;
  availableTags: TransactionTag[];
  availableTagsById: Map<string, TransactionTag>;
  tagUsageCountById: Map<string, number>;
  onToggleAction: () => void;
  onToggleEditCategory: () => void;
  onToggleEditGoal: () => void;
  onToggleEditTags: () => void;
  onCategoryChange: (categoryId: string) => void;
  onGoalChange: (goalId: string | null) => void;
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag: (draft: { name: string; color: string }) => TransactionTag;
  onUpdateTag: (tagId: string, updates: { name: string; color: string }) => TransactionTag;
  onDeleteTag: (tagId: string) => boolean;
  onCreateRule: () => void;
  onAction: (action: "edit" | "duplicate" | "delete") => void;
}

export function TransactionRow({
  transaction,
  openCategoryUpward,
  isActionOpen,
  isEditingCategory,
  isEditingGoal,
  isEditingTags,
  availableTags,
  availableTagsById,
  tagUsageCountById,
  onToggleAction,
  onToggleEditCategory,
  onToggleEditGoal,
  onToggleEditTags,
  onCategoryChange,
  onGoalChange,
  onTagsChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onCreateRule,
  onAction,
}: TransactionRowProps) {
  const { formatSignedCurrency } = useFormatCurrency();
  const type = transaction.type;
  const iconStyle =
    transaction.categoryId === UNCATEGORIZED_CATEGORY_ID
      ? UNCATEGORIZED_ICON_STYLE
      : iconBoxStyles[type];
  const transferFlow = type === "transfer" && transaction.destinationAccount
    ? resolveTransferFlowAccounts({
        amount: transaction.amount,
        accountName: transaction.account.name,
        counterpartyAccountName: transaction.destinationAccount.name,
        transferPairRole: transaction.transferPairRole,
      })
    : null;
  const resolvedTags = (transaction.tagIds ?? [])
    .map((tagId) => availableTagsById.get(tagId))
    .filter((tag): tag is TransactionTag => tag !== undefined);
  const visibleTags = resolvedTags.slice(0, 2);
  const hiddenTagCount = resolvedTags.length - visibleTags.length;

  return (
    <div className="group flex items-center gap-3 py-3 border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-secondary/30 relative">
      {/* Icon — category shape, type-tinted (desktop), clickable to edit category */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleEditCategory();
        }}
        className={cn(
          "w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0 hidden lg:flex cursor-pointer border-none transition-opacity hover:opacity-80",
          iconStyle,
        )}
      >
        <Icon name={transaction.category.icon} size={16} />
      </button>

      {/* -------- Mobile layout -------- */}
      <div className="flex items-start gap-3 lg:hidden flex-1 min-w-0">
        {/* Icon — clickable to edit category */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleEditCategory();
          }}
          className={cn(
            "w-[34px] h-[34px] rounded-(--radius-md) flex items-center justify-center shrink-0 cursor-pointer border-none transition-opacity hover:opacity-80",
            iconStyle,
          )}
        >
          <Icon name={transaction.category.icon} size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-ui text-foreground font-medium line-clamp-2"
              title={transaction.description}
            >
              {transaction.description}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEditCategory();
                }}
                className="cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80"
              >
                <Badge variant={type}>{transaction.category.name}</Badge>
              </button>
              {isEditingCategory && (
                <CategoryPicker
                  currentCategoryId={transaction.categoryId}
                  onSelect={onCategoryChange}
                  onClose={onToggleEditCategory}
                  openUpward={openCategoryUpward}
                />
              )}
            </div>
            {transaction.goal && (
              <span className="inline-flex items-center gap-1 text-ui text-goal max-w-36">
                <Icon name={transaction.goal.icon} size={10} className="shrink-0" />
                <span className="truncate">{transaction.goal.name}</span>
              </span>
            )}
            {resolvedTags.length > 0 && (
              <span className="inline-flex items-center gap-2 flex-wrap max-w-full">
                {visibleTags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1 text-ui max-w-36" style={{ color: tag.color }}>
                    <Tag size={10} className="shrink-0" />
                    <span className="truncate">{tag.name}</span>
                  </span>
                ))}
                {hiddenTagCount > 0 && (
                  <span className="text-ui text-dimmed">+{hiddenTagCount}</span>
                )}
              </span>
            )}
            {transferFlow && (
              <span className="text-ui text-dimmed truncate max-w-48">
                {transferFlow.fromAccountName} &rarr; {transferFlow.toAccountName}
              </span>
            )}
            {transaction.split && (
              <span className="inline-flex items-center gap-1 text-ui text-dimmed">
                <Users size={9} />
                {transaction.split.withPerson}
                {transaction.split.status === "pending" && (
                  <span className="text-split">&middot; pending</span>
                )}
                {transaction.split.status === "reimbursed" && (
                  <span className="text-income">&middot; settled</span>
                )}
              </span>
            )}
            <span className="text-ui text-dimmed">
              {formatDate(transaction.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn("text-ui font-medium", getAmountColorClass(type, transaction.amount))}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatSignedCurrency(transaction.amount, transaction.currency)}
          </span>

          {/* Action button — mobile */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAction();
              }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-foreground transition-opacity",
                isActionOpen ? "opacity-100" : "opacity-60",
              )}
            >
              <MoreHorizontal size={14} />
            </button>
            {isActionOpen && (
              <ActionMenu
                onAction={onAction}
                onEditGoal={onToggleEditGoal}
                onEditTags={onToggleEditTags}
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
                hasTags={resolvedTags.length > 0}
                className="right-0"
              />
            )}
            {isEditingGoal && (
              <GoalPicker
                currentGoalId={transaction.goalId}
                onSelect={onGoalChange}
                onClose={onToggleEditGoal}
                className="top-full right-0 mt-1"
              />
            )}
            {isEditingTags && (
              <TagPicker
                tags={availableTags}
                selectedTagIds={transaction.tagIds ?? []}
                onChange={onTagsChange}
                onCreateTag={onCreateTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
                tagUsageCountById={tagUsageCountById}
                onClose={onToggleEditTags}
                className="top-full right-0 mt-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* -------- Desktop layout -------- */}
      <div className="hidden lg:flex lg:items-center lg:gap-4 lg:flex-1 min-w-0">
        {/* Description + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-ui text-foreground font-medium line-clamp-2"
              title={transaction.description}
            >
              {transaction.description}
            </span>
            {transaction.split && (
              <span className="inline-flex items-center gap-1 text-ui text-dimmed shrink-0">
                <Users size={9} />
                {transaction.split.withPerson}
                {transaction.split.status === "pending" && (
                  <span className="text-split">&middot; pending</span>
                )}
                {transaction.split.status === "reimbursed" && (
                  <span className="text-income">&middot; settled</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-ui text-dimmed relative flex-wrap">
            <span>
              {transferFlow
                ? `${transferFlow.fromAccountName} \u2192 ${transferFlow.toAccountName}`
                : transaction.account.name}
            </span>
            <span>&middot;</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleEditCategory();
              }}
              className="cursor-pointer bg-transparent border-none p-0 text-ui text-dimmed hover:text-foreground hover:underline transition-colors"
            >
              {transaction.category.name}
            </button>
            {isEditingCategory && (
              <CategoryPicker
                currentCategoryId={transaction.categoryId}
                onSelect={onCategoryChange}
                onClose={onToggleEditCategory}
                openUpward={openCategoryUpward}
              />
            )}
            {resolvedTags.length > 0 && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-2 flex-wrap max-w-[360px]">
                  {visibleTags.map((tag) => (
                    <span key={tag.id} className="inline-flex items-center gap-1 text-ui max-w-40" style={{ color: tag.color }}>
                      <Tag size={10} className="shrink-0" />
                      <span className="truncate">{tag.name}</span>
                    </span>
                  ))}
                  {hiddenTagCount > 0 && (
                    <span className="text-ui text-dimmed">+{hiddenTagCount}</span>
                  )}
                </span>
              </>
            )}
            {transaction.goal && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1 text-goal max-w-40">
                  <Icon name={transaction.goal.icon} size={10} className="shrink-0" />
                  <span className="truncate">{transaction.goal.name}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="w-24 text-ui">{formatDate(transaction.date)}</div>

        {/* Amount */}
        <span
          className={cn(
            "w-28 text-right text-ui font-medium",
            getAmountColorClass(type, transaction.amount),
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatSignedCurrency(transaction.amount, transaction.currency)}
        </span>

        {/* Action menu trigger */}
        <div className="relative w-8 flex items-center justify-center shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAction();
            }}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-foreground transition-opacity",
              isActionOpen
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <MoreHorizontal size={14} />
          </button>
          {isActionOpen && (
              <ActionMenu
                onAction={onAction}
                onEditGoal={onToggleEditGoal}
                onEditTags={onToggleEditTags}
                onRemoveGoal={() => onGoalChange(null)}
                onCreateRule={onCreateRule}
                hasGoal={Boolean(transaction.goalId)}
                hasTags={resolvedTags.length > 0}
                className="right-0"
              />
          )}
          {isEditingGoal && (
            <GoalPicker
              currentGoalId={transaction.goalId}
              onSelect={onGoalChange}
              onClose={onToggleEditGoal}
              className="top-full right-0 mt-1"
            />
          )}
          {isEditingTags && (
            <TagPicker
              tags={availableTags}
              selectedTagIds={transaction.tagIds ?? []}
              onChange={onTagsChange}
              onCreateTag={onCreateTag}
              onUpdateTag={onUpdateTag}
              onDeleteTag={onDeleteTag}
              tagUsageCountById={tagUsageCountById}
              onClose={onToggleEditTags}
              className="top-full right-0 mt-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}
