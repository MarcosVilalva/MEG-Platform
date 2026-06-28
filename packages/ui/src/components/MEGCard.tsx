import type { ReactNode } from 'react';

interface MEGCardProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function MEGCard({ title, eyebrow, children, className = '' }: MEGCardProps) {
  return (
    <article className={`meg-card ${className}`}>
      {eyebrow && <span className="meg-eyebrow">{eyebrow}</span>}
      {title && <h3>{title}</h3>}
      {children}
    </article>
  );
}
