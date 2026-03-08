'use client';

import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('border-b border-gray-200 flex gap-1', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
