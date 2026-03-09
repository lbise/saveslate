import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';

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
    <Modal onClose={onClose} panelClassName="max-w-md p-5">
      <div className="space-y-4">
        <div className="w-10 h-10 rounded-(--radius-md) border border-expense/40 bg-expense/10 flex items-center justify-center text-expense">
          <Trash2 size={16} />
        </div>

        <div className="space-y-2">
          <h2 id="modal-title" className="heading-2">{title}</h2>
          <p className="text-body">{description}</p>
          {details}
          <p className="text-ui text-dimmed">{note ?? 'This action cannot be undone.'}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-secondary border-expense/40 text-expense hover:bg-expense/10 hover:border-expense"
          >
            <Trash2 size={14} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
