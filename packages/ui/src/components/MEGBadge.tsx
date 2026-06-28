interface MEGBadgeProps {
  children: string;
  tone?: 'default' | 'good' | 'warning' | 'danger' | 'info';
}

export function MEGBadge({ children, tone = 'default' }: MEGBadgeProps) {
  return <span className={`meg-badge ${tone}`}>{children}</span>;
}
