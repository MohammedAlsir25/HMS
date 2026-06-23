export function Card({ className = '', children, elevated = false, ...props }) {
  return (
    <div
      className={`${elevated ? 'card-surface-elevated' : 'card-surface'} p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ className = '', children }) {
  return <h3 className={`text-subheading font-medium text-obsidian ${className}`}>{children}</h3>;
}

export function CardContent({ className = '', children }) {
  return <div className={className}>{children}</div>;
}
