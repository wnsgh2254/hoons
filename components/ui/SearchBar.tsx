'use client';

import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '검색...',
  rightContent,
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'bg-white p-4 rounded-xl border border-gray-200 shadow-sm',
        'flex flex-col md:flex-row gap-4 justify-start md:justify-between items-start md:items-center',
        className,
      )}
    >
      <div className="relative flex-1 max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg">
          search
        </span>
        <input
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}
