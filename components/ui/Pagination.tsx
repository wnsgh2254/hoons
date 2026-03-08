'use client';

import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const buttonBase =
    'w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 transition-colors';
  const buttonEnabled = 'hover:bg-gray-100 text-gray-700';
  const buttonDisabled = 'opacity-40 cursor-not-allowed text-gray-400';

  return (
    <div
      className={cn(
        'bg-gray-50 px-4 py-2.5 border-t border-gray-200 flex items-center justify-between',
        className,
      )}
    >
      <div className="text-xs text-gray-500">
        페이지 {currentPage} / {totalPages}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          className={cn(buttonBase, canGoPrev ? buttonEnabled : buttonDisabled)}
        >
          <span className="material-symbols-outlined text-base leading-none">first_page</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={cn(buttonBase, canGoPrev ? buttonEnabled : buttonDisabled)}
        >
          <span className="material-symbols-outlined text-base leading-none">chevron_left</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={cn(buttonBase, canGoNext ? buttonEnabled : buttonDisabled)}
        >
          <span className="material-symbols-outlined text-base leading-none">chevron_right</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className={cn(buttonBase, canGoNext ? buttonEnabled : buttonDisabled)}
        >
          <span className="material-symbols-outlined text-base leading-none">last_page</span>
        </button>
      </div>
    </div>
  );
}
