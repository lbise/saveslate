import { Target, Tags, Filter, Pencil, Copy, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

export interface ActionMenuProps {
  onAction: (action: "edit" | "duplicate" | "delete") => void;
  onEditGoal: () => void;
  onEditTags: () => void;
  onRemoveGoal: () => void;
  onCreateRule: () => void;
  hasGoal: boolean;
  hasTags: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName?: string;
}

export function ActionMenu({
  onAction,
  onEditGoal,
  onEditTags,
  onRemoveGoal,
  onCreateRule,
  hasGoal,
  hasTags,
  open,
  onOpenChange,
  triggerClassName,
}: ActionMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-dimmed hover:text-foreground transition-opacity",
            triggerClassName,
          )}
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEditGoal}>
          <Target size={12} />
          {hasGoal ? "Change goal" : "Set goal"}
        </DropdownMenuItem>
        {hasGoal && (
          <DropdownMenuItem onClick={onRemoveGoal}>
            <Target size={12} />
            Unlink goal
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onEditTags}>
          <Tags size={12} />
          {hasTags ? "Edit tags" : "Set tags"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateRule}>
          <Filter size={12} />
          Create rule
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction("edit")}>
          <Pencil size={12} />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("duplicate")}>
          <Copy size={12} />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
          <Trash2 size={12} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
