import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import './primitives.css';

export function GlassCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`meg-card ${className}`} {...props} />;
}

export function PrimaryButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`meg-button meg-button--primary ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button className={`meg-icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}
