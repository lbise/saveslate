import { Target, Tags, Filter, Pencil, Copy, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ActionMenuProps {
  onAction: (action: "edit" | "duplicate" | "delete") => void;
  onEditGoal: () => void;
  onEditTags: () => void;
  onRemoveGoal: () => void;
  onCreateRule: () => void;
  hasGoal: boolean;
  hasTags: boolean;
  className?: string;
}

export function ActionMenu({
  onAction,
  onEditGoal,
  onEditTags,
  onRemoveGoal,
  onCreateRule,
  hasGoal,
  hasTags,
  className,
}: ActionMenuProps) {
  const itemClass = "menu-item";

  return (
    <div
      className={cn(
        "menu-popover w-44",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEditGoal}
        className={itemClass}
      >
        <Target size={12} />
        {hasGoal ? "Change goal" : "Set goal"}
      </button>
      {hasGoal && (
        <button
          onClick={onRemoveGoal}
          className={itemClass}
        >
          <Target size={12} />
          Unlink goal
        </button>
      )}
      <button
        onClick={onEditTags}
        className={itemClass}
      >
        <Tags size={12} />
        {hasTags ? "Edit tags" : "Set tags"}
      </button>
      <button
        onClick={onCreateRule}
        className={itemClass}
      >
        <Filter size={12} />
        Create rule
      </button>
      <div className="menu-divider" />
      <button
        onClick={() => onAction("edit")}
        className={itemClass}
      >
        <Pencil size={12} />
        Edit
      </button>
      <button
        onClick={() => onAction("duplicate")}
        className={itemClass}
      >
        <Copy size={12} />
        Duplicate
      </button>
      <div className="menu-divider" />
      <button
        onClick={() => onAction("delete")}
        className="menu-item-danger"
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );
}
