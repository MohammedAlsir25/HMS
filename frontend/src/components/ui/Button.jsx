import { forwardRef } from 'react';

const variants = {
  primary: 'bg-lilac-bloom text-obsidian hover:brightness-95 active:brightness-90',
  secondary: 'bg-obsidian text-paper hover:bg-graphite active:bg-obsidian',
  ghost: 'bg-transparent text-obsidian border border-silver hover:bg-bone',
  danger: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500',
};

const sizes = {
  sm: 'px-3 py-1.5 text-caption',
  md: 'px-5 py-3 text-body',
  lg: 'px-6 py-4 text-body font-medium',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', loading, disabled: disabledProp, children, ...props },
  ref,
) {
  const isDisabled = disabledProp || loading;
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-switzer font-medium
        transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none
        touch-target ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
});
