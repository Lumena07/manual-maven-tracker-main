
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'dark' | 'light';
  blur?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  fullWidth?: boolean;
}

const blurValues = {
  none: 'backdrop-blur-none',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
};

export function GlassCard({
  children,
  className,
  variant = 'default',
  blur = 'md',
  border = true,
  fullWidth = false,
  ...props
}: GlassCardProps) {
  const variantClassNames = {
    default: 'bg-white/70 shadow-sm',
    dark: 'bg-black/70 text-white shadow-md',
    light: 'bg-white/30 shadow-sm',
  };

  return (
    <div
      className={cn(
        'rounded-lg transition-all',
        variantClassNames[variant],
        blurValues[blur],
        border && 'border border-white/20',
        fullWidth ? 'w-full' : '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
