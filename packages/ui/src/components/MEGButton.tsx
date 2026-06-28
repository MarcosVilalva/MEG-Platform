import type { ButtonHTMLAttributes } from 'react';

interface MEGButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

export function MEGButton({ variant = 'primary', className = '', ...props }: MEGButtonProps) {
  return <button className={`meg-button ${variant} ${className}`} {...props} />;
}
