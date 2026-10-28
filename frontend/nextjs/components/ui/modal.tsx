'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** When true the modal can be closed via Escape, overlay click and the X button. */
  dismissible?: boolean;
  className?: string;
}

/**
 * Lightweight accessible modal for the Clucky customer app.
 * - Closes on Escape and overlay click when `dismissible`.
 * - Focuses the dialog on open and restores focus on close.
 * - Blocks body scroll while open (blocking modal).
 */
const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  className,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const node = dialogRef.current;
    node?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onOpenChange(false);
      // keep Tab inside the modal
      if (e.key === 'Tab' && node) {
        const focusable = node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, dismissible, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-[#16100D]/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-md rounded-3xl border border-[#E8DED1] bg-[#FFFAF3] p-6 shadow-[0_30px_80px_rgba(0,0,0,.3)] outline-none',
          className
        )}
      >
        {(title || dismissible) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 className="font-['Baloo_2',sans-serif] text-xl font-bold tracking-[-0.02em] text-[#16100D]">
                  {title}
                </h2>
              )}
              {description && <p className="mt-1 text-sm text-[#75675E]">{description}</p>}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Đóng hộp thoại"
                className="rounded-full p-1.5 text-[#75675E] transition hover:bg-[#F5EDE0] hover:text-[#16100D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A227]"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export { Modal };
export default Modal;

