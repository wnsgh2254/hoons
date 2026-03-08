'use client';

import { forwardRef } from 'react';
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
  ({ icon, size = 'sm', variant = 'ghost', className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex items-center justify-center rounded-lg transition-colors',
          sizeStyles[size],
          variantStyles[variant],
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
