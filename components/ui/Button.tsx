'use client';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a loading spinner and disable the button */
  loading?: boolean;
  /** Material Symbols icon name (e.g. 'add', 'edit') */
  icon?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-black text-white hover:bg-gray-800',
  secondary:
    'bg-gray-200 text-gray-700 hover:bg-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
  ghost:
    'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
  outline:
    'bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4.5 py-3 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        'font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {icon && !loading && (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
      {children}
    </button>
  );
}
