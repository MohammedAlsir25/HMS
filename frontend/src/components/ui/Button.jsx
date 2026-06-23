import { forwardRef } from 'react';

const variants = {
  primary: 'bg-lilac-bloom text-obsidian hover:brightness-95 active:brightness-90',
  secondary: 'bg-obsidian text-paper hover:bg-graphite active:bg-obsidian',
  ghost: 'bg-transparent text-obsidian border border-silver hover:bg-bone',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-caption',
  md: 'px-5 py-3 text-body',
  lg: 'px-6 py-4 text-body font-medium',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-switzer font-medium
        transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none
        touch-target ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
