import { Link } from "react-router-dom";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  EntityCard,
  EntityCardDetailList,
  EntityCardOverflowMenu,
  EntityCardSection,
  TransactionItem,
} from "../ui";
import { useFormatCurrency } from "../../hooks";
import { formatDate } from "../../lib/utils";
import { getYearlyContribution } from "../../lib/goal-utils";
import type { ReactNode } from "react";
import type { Goal, GoalProgress, TransactionWithDetails } from "../../types";

export interface GoalDetailCardProps {
  goalProgress: GoalProgress;
  allGoalTransactions: TransactionWithDetails[];
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalDetailCard({
  goalProgress: gp,
  allGoalTransactions,
  onEdit,
  onDelete,
}: GoalDetailCardProps) {
  const { formatCurrency } = useFormatCurrency();

  const goalTransactions = allGoalTransactions.slice(0, 4);
  const isOpenEnded = gp.goal.hasTarget === false;
  const isContributionPlan = Boolean(gp.goal.expectedContribution);
  const shouldShowProgressBar = !isOpenEnded || isContributionPlan;
  const yearlyPlanAmount = gp.goal.expectedContribution
    ? getYearlyContribution(
        gp.goal.expectedContribution.frequency,
        gp.goal.expectedContribution.amount,
      )
    : 0;
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const yearToDateContribution = allGoalTransactions
    .filter(
      (transaction) =>
        transaction.date >= yearStart && transaction.date <= yearEnd,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const yearlyPlanProgress =
    yearlyPlanAmount > 0
      ? Math.max(
          0,
          Math.min((yearToDateContribution / yearlyPlanAmount) * 100, 999),
        )
      : 0;

  const badges: ReactNode[] = [];
  if (isContributionPlan) {
    badges.push(
      <Badge key="goal-plan" variant="default">
        Contribution plan
      </Badge>,
    );
  }
  if (!isContributionPlan && !isOpenEnded) {
    badges.push(
      <Badge key="goal-fixed" variant="muted">
        Fixed target
      </Badge>,
    );
  }
  if (isOpenEnded) {
    badges.push(
      <Badge key="goal-open" variant="muted">
        Open-ended
      </Badge>,
    );
  }

  const detailItems = [
    !isOpenEnded
      ? {
          label: "Saved / Target",
          value: `${formatCurrency(gp.currentAmount)} / ${formatCurrency(gp.goal.targetAmount)}`,
          tone: gp.currentAmount < 0 ? "expense" : "strong",
        }
      : {
          label: "Saved",
          value: formatCurrency(gp.currentAmount),
          tone: gp.currentAmount < 0 ? "expense" : "strong",
        },
    gp.goal.expectedContribution
      ? {
          label: "Contribution",
          value: `${formatCurrency(gp.goal.expectedContribution.amount)} ${gp.goal.expectedContribution.frequency}`,
          tone: "goal",
        }
      : undefined,
    gp.goal.deadline
      ? {
          label: "Due date",
          value: formatDate(gp.goal.deadline),
          tone: "default",
        }
      : undefined,
  ].filter(
    (
      item,
    ): item is {
      label: string;
      value: string;
      tone: "default" | "strong" | "muted" | "goal" | "expense";
    } => item !== undefined,
  );

  return (
    <EntityCard
      icon={gp.goal.icon}
      title={gp.goal.name}
      subtitle={
        gp.goal.description?.trim() ||
        (gp.goal.deadline
          ? `Due ${formatDate(gp.goal.deadline)}`
          : "Savings goal")
      }
      tone="goal"
      badges={badges.length > 0 ? badges : undefined}
      actions={
        <EntityCardOverflowMenu
          label={`More actions for ${gp.goal.name}`}
          actions={[
            {
              label: "Edit",
              icon: Pencil,
              onClick: () => onEdit(gp.goal),
            },
            {
              label: "Delete",
              icon: Trash2,
              onClick: () => onDelete(gp.goal),
              tone: "danger",
            },
          ]}
        />
      }
    >
      <EntityCardDetailList items={detailItems} />

      {shouldShowProgressBar && (
        <EntityCardSection title="Progress">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-400 ease-out bg-goal"
              style={{
                width: `${Math.max(0, Math.min(gp.percentage, 100))}%`,
              }}
            />
          </div>
        </EntityCardSection>
      )}

      {gp.goal.expectedContribution && (
        <EntityCardSection title="Plan">
          <p className="text-ui text-dimmed">
            {formatCurrency(gp.goal.expectedContribution.amount)}{" "}
            {gp.goal.expectedContribution.frequency} ·{" "}
            {formatCurrency(yearlyPlanAmount)} yearly · This year:{" "}
            {formatCurrency(yearToDateContribution)} (
            {yearlyPlanProgress.toFixed(0)}%)
          </p>
        </EntityCardSection>
      )}

      {goalTransactions.length > 0 && (
        <EntityCardSection
          title="Recent Contributions"
          action={
            <Link
              to={`/transactions?goal=${encodeURIComponent(gp.goal.id)}`}
              className="text-link"
            >
              View all <ArrowUpRight size={10} />
            </Link>
          }
        >
          <div className="flex flex-col">
            {goalTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                description={tx.description}
                type={tx.type}
                amount={tx.amount}
                currency={tx.currency}
                categoryName={tx.category.name}
                accountName={tx.account.name}
                destinationAccountName={tx.destinationAccount?.name}
                transferPairRole={tx.transferPairRole}
                isSplit={!!tx.split}
              />
            ))}
          </div>
        </EntityCardSection>
      )}
    </EntityCard>
  );
}
