import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
}

export function Modal({ onClose, children, panelClassName }: ModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-[190] bg-bg/70" onClick={onClose} />
      <div className="fixed inset-0 z-[200] overflow-y-auto p-4 sm:p-6">
        <div className="min-h-full flex items-start sm:items-center justify-center">
          <div
            className={cn('card w-full', panelClassName)}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
