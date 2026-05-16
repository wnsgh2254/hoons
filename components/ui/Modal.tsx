'use client';

import { cn } from '@/lib/utils';

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the user clicks the overlay or the close button */
  onClose: () => void;
  /** Modal title shown in the header */
  title?: string;
  /** Tailwind z-index class (e.g. Z.MODAL_PRIMARY from lib/constants) */
  zIndex?: string;
  /** Max-width class. Defaults to "max-w-md" */
  maxWidth?: string;
  /** Content inside the modal body */
  children: React.ReactNode;
  /** Optional footer content (buttons etc.) */
  footer?: React.ReactNode;
  /** Hide the default header (title + close button). Useful for fully custom layouts. */
  hideHeader?: boolean;
  /** Additional className for the modal container */
  className?: string;
  /** Enable scroll for tall content. Adds max-h and overflow-y to the body. */
  scrollable?: boolean;
  /** Additional className for the body wrapper div */
  bodyClassName?: string;
  /** Whether clicking the backdrop closes the modal. Defaults to true. */
  closeOnBackdropClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  zIndex = 'z-[100000]',
  maxWidth = 'max-w-md',
  children,
  footer,
  hideHeader = false,
  className,
  scrollable = false,
  bodyClassName,
  closeOnBackdropClick = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4',
        zIndex,
      )}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={cn('bg-white rounded-2xl shadow-2xl w-full', maxWidth, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {!hideHeader && (
          <div className="p-5.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className={cn('p-5.5', scrollable && 'max-h-[70vh] overflow-y-auto', bodyClassName)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 px-5.5 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
