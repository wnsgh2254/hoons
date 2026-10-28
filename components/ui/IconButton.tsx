'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'danger';
}

const sizeStyles = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-10 h-10 text-xl',
};

const variantStyles = {
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-black',
  danger: 'text-gray-600 hover:bg-red-50 hover:text-red-600',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'sm', variant = 'ghost', className, disabled, onClick, ...rest }, ref) => {
    const [pending, setPending] = useState(false);
    const lockRef = useRef(false);
    const mountedRef = useRef(true);
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const isDisabled = disabled || pending;

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
        ref={ref}
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center rounded-lg transition-colors',
          sizeStyles[size],
          variantStyles[variant],
          isDisabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export default IconButton;
