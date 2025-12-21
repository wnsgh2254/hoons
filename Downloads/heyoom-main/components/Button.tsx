import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  variant = 'primary',
  className,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'px-6 py-3 rounded-lg font-semibold transition-colors',
        variant === 'primary'
          ? 'bg-gray-900 text-white hover:bg-gray-800'
          : 'border-2 border-gray-900 text-gray-900 hover:bg-gray-50',
        className
      )}
    >
      {children}
    </button>
  );
}



