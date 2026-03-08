import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-11.5 text-center', className)}>
      {icon && (
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
          {icon}
        </span>
      )}
      <p className="text-gray-500 text-sm">{title}</p>
      {description && (
        <p className="text-gray-400 text-xs mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
