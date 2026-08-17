import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost'; loading?: boolean };
export default function Button({ variant = 'primary', loading, className, children, disabled, ...props }: Props) {
  return <button {...props} disabled={disabled || loading} className={clsx(variant === 'primary' ? 'ui-btn-primary' : variant === 'outline' ? 'ui-btn-outline' : 'ui-btn text-ui-text hover:bg-ui-muted', className)}>{loading ? 'Salvando...' : children}</button>;
}
