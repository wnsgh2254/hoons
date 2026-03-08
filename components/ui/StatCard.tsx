import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  className?: string;
}

export default function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white p-4.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between',
        className,
      )}
    >
      <div className="flex flex-col">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="text-2xl font-bold text-black mt-1">{value}</span>
      </div>
      {icon && (
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-gray-600">{icon}</span>
        </div>
      )}
    </div>
  );
}
