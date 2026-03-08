import { cn } from '@/lib/utils';

interface FormAlertProps {
  message: string;
  variant: 'error' | 'info' | 'success';
  className?: string;
}

const variantStyles = {
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
};

const iconMap = {
  error: 'error',
  info: 'info',
  success: 'check_circle',
};

export default function FormAlert({ message, variant, className }: FormAlertProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border px-4 py-3 rounded-lg text-sm',
        variantStyles[variant],
        className,
      )}
    >
      <span className="material-symbols-outlined text-lg">{iconMap[variant]}</span>
      {message}
    </div>
  );
}
