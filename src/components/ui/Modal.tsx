import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/** Default ID for modal heading elements. Since only one modal is open at a time, a single fixed ID is sufficient. */
export const MODAL_TITLE_ID = 'modal-title';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  /** ID of the element that labels the modal (passed to aria-labelledby). Defaults to MODAL_TITLE_ID. */
  ariaLabelledBy?: string;
}

export function Modal({ onClose, children, panelClassName, ariaLabelledBy = MODAL_TITLE_ID }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Save the previously focused element to restore on unmount
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the dialog
    const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[190] bg-bg/70" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[200] overflow-y-auto p-4 sm:p-6">
        <div className="min-h-full flex items-start sm:items-center justify-center">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
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
