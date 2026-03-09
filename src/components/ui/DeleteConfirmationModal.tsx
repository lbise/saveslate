import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationModalProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  details?: ReactNode;
  note?: ReactNode;
}

export function DeleteConfirmationModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  details,
  note,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <div className="w-10 h-10 rounded-(--radius-md) border border-expense/40 bg-expense/10 flex items-center justify-center text-expense">
          <Trash2 size={16} />
        </div>

        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{description}</p>
              {details}
              <p className="text-xs text-dimmed">{note ?? 'This action cannot be undone.'}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            onClick={onConfirm}
            className="border-expense/40 text-expense hover:bg-expense/10 hover:border-expense"
          >
            <Trash2 size={14} />
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
