'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, wrapperClassName, className, id, ...rest }, ref) => {
    const inputId = id || label?.replace(/\s+/g, '-').toLowerCase();

    return (
      <div className={cn(wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-2 border border-gray-200 rounded-lg text-sm',
            'focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-300 focus:ring-red-500',
            className,
          )}
          {...rest}
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
