'use client';

import { useEffect, useRef, useState } from 'react';
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
  onClick,
  ...rest
}: ButtonProps) {
  const [pending, setPending] = useState(false);
  // Ref guards rapid double-clicks that land before React re-renders with disabled.
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isLoading = loading || pending;
  const isDisabled = disabled || isLoading;

  // If the click handler returns a promise, lock the button until it settles.
  const handleClick = onClick
    ? (e: React.MouseEvent<HTMLButtonElement>) => {
        if (lockRef.current) return;
        const result: unknown = onClick(e);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          lockRef.current = true;
          setPending(true);
          const release = () => {
            lockRef.current = false;
            if (mountedRef.current) setPending(false);
          };
          (result as Promise<unknown>).then(release, release);
        }
      }
    : undefined;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        'font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {isLoading && (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {icon && !isLoading && (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
      {children}
    </button>
  );
}
