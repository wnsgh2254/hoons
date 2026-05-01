'use client';

import { useState, useRef } from 'react';
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
  const suppressNextRowClickRef = useRef(false);

  const showPagination =
    currentPage != null && totalPages != null && onPageChange != null && data.length > 0 && !loading;

  const handleDragStart = (e: React.DragEvent, index: number) => {
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
    const pos = e.clientY < midY ? 'above' : 'below';
    setDragOverPosition(pos);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || !onReorder) return;

    // Compute insert position from pointer at drop time (reliable; avoids stale drag-over state)
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'above' : 'below';
    const sourceIndex = dragIndex;

    // Dropping on the same row: only reorder if inserting above vs below changes position
    if (sourceIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newData = [...data];
    const [draggedItem] = newData.splice(sourceIndex, 1);
    const targetIndex = pos === 'above' ? dropIndex : dropIndex + 1;
    const adjustedIndex = sourceIndex < dropIndex ? targetIndex - 1 : targetIndex;
    newData.splice(adjustedIndex, 0, draggedItem);
    onReorder(newData);

    suppressNextRowClickRef.current = true;
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
                  onDragOver={isDraggable ? (e) => handleDragOver(e, index) : undefined}
                  onDrop={isDraggable ? (e) => handleDrop(e, index) : undefined}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isDraggable && dragIndex === index && 'opacity-30',
                    isDraggable && dragOverIndex === index && dragOverPosition === 'above' && 'border-t-2 !border-t-blue-400',
                    isDraggable && dragOverIndex === index && dragOverPosition === 'below' && 'border-b-2 !border-b-blue-400',
                  )}
                  onClick={() => {
                    if (suppressNextRowClickRef.current) {
                      suppressNextRowClickRef.current = false;
                      return;
                    }
                    onRowClick?.(item);
                  }}
                >
                  {isDraggable && (
                    <td className="w-10 px-2 py-3 text-center">
                      <span
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, index);
                        }}
                        onDragEnd={handleDragEnd}
                        className="material-symbols-outlined text-gray-400 cursor-grab active:cursor-grabbing text-lg select-none inline-block"
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
