const variants = {
  default: 'bg-bone text-obsidian',
  primary: 'bg-lilac-bloom text-obsidian',
  success: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  warning: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
  danger: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
  info: 'bg-sky-veil text-obsidian',
};

const sizes = {
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-3 py-1 text-caption',
  lg: 'px-4 py-1.5 text-body',
};

export function Badge({ variant = 'default', size = 'md', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[10px] font-switzer font-medium
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
