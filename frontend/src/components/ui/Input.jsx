import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, className = '', id, ...props },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-graphite">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full px-4 py-3 bg-paper border ${error ? 'border-red-400 dark:border-red-500' : 'border-silver'}
          rounded-lg text-body text-obsidian placeholder:text-slate
          focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent
          transition-colors duration-150 touch-target ${className}`}
        {...props}
      />
      {error && <span className="text-caption text-red-500 dark:text-red-400">{error}</span>}
    </div>
  );
});
