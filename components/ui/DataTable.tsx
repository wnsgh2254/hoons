'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';
import Pagination from './Pagination';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  /** Pagination: current page (1-based) */
  currentPage?: number;
  /** Pagination: total pages */
  totalPages?: number;
  /** Pagination: page change handler */
  onPageChange?: (page: number) => void;
  /** Enable drag-and-drop row reordering */
  draggable?: boolean;
  /** Called with reordered data array after a drop */
  onReorder?: (reorderedData: T[]) => void;
}

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  emptyIcon,
  onRowClick,
  className,
  currentPage,
  totalPages,
  onPageChange,
  draggable: isDraggable = false,
  onReorder,
}: DataTableProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below'>('below');

  const showPagination =
    currentPage != null && totalPages != null && onPageChange != null && data.length > 0 && !loading;

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex === null || index === dragIndex) {
      setDragOverIndex(null);
      return;
    }
    setDragOverIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverPosition(e.clientY < midY ? 'above' : 'below');
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !onReorder) return;

    const newData = [...data];
    const [draggedItem] = newData.splice(dragIndex, 1);
    const targetIndex = dragOverPosition === 'above' ? dropIndex : dropIndex + 1;
    const adjustedIndex = dragIndex < dropIndex ? targetIndex - 1 : targetIndex;
    newData.splice(adjustedIndex, 0, draggedItem);
    onReorder(newData);

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        className,
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center py-11.5">
          <div className="text-gray-500 text-sm">로딩 중...</div>
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyMessage} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isDraggable && (
                  <th className="w-10 px-2 py-3" />
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider',
                      alignClass[col.align || 'left'],
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  draggable={isDraggable}
                  onDragStart={isDraggable ? (e) => handleDragStart(e, index) : undefined}
                  onDragOver={isDraggable ? (e) => handleDragOver(e, index) : undefined}
                  onDrop={isDraggable ? (e) => handleDrop(e, index) : undefined}
                  onDragEnd={isDraggable ? handleDragEnd : undefined}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isDraggable && dragIndex === index && 'opacity-30',
                    isDraggable && dragOverIndex === index && dragOverPosition === 'above' && 'border-t-2 !border-t-blue-400',
                    isDraggable && dragOverIndex === index && dragOverPosition === 'below' && 'border-b-2 !border-b-blue-400',
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {isDraggable && (
                    <td className="w-10 px-2 py-3 text-center">
                      <span
                        className="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing text-lg select-none"
                      >
                        drag_indicator
                      </span>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-900',
                        alignClass[col.align || 'left'],
                        col.className,
                      )}
                    >
                      {col.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
