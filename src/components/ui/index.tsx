'use client';

import React from 'react';

// =====================================================
// BUTTON COMPONENT
// =====================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    focus:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-copper)]
      text-[var(--bg-primary)] hover:from-[var(--accent-light)] hover:to-[var(--accent-gold)]
      focus:ring-[var(--accent-gold)]
    `,
    secondary: `
      bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)]
      hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]
      focus:ring-[var(--accent-bronze)]
    `,
    danger: `
      bg-[var(--color-danger)] text-white hover:bg-red-600
      focus:ring-[var(--color-danger)]
    `,
    ghost: `
      bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]
      hover:bg-[var(--bg-tertiary)] focus:ring-[var(--accent-bronze)]
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// =====================================================
// INPUT COMPONENT
// =====================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-lg
          bg-[var(--bg-tertiary)] border border-[var(--border-default)]
          text-[var(--text-primary)] placeholder-[var(--text-muted)]
          transition-all duration-200
          hover:border-[var(--border-hover)]
          focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {helperText && !error && <p className="text-sm text-[var(--text-muted)]">{helperText}</p>}
    </div>
  );
}

// =====================================================
// SELECT COMPONENT
// =====================================================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder = 'Seleccionar...',
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-lg appearance-none cursor-pointer
          bg-[var(--bg-tertiary)] border border-[var(--border-default)]
          text-[var(--text-primary)]
          transition-all duration-200
          hover:border-[var(--border-hover)]
          focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[var(--color-danger)]' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="" className="text-[var(--text-muted)]">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

// =====================================================
// CARD COMPONENT
// =====================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      className={`
        bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl p-4
        ${hover ? 'hover:border-[var(--accent-bronze)] hover:shadow-lg transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// =====================================================
// BADGE COMPONENT
// =====================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    success: 'bg-green-900/50 text-green-400 border border-green-800',
    warning: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
    danger: 'bg-red-900/50 text-red-400 border border-red-800',
    gold: 'bg-[var(--accent-gold)]/20 text-[var(--accent-light)] border border-[var(--accent-gold)]/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

// =====================================================
// SPINNER COMPONENT
// =====================================================
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <svg
      className={`animate-spin text-[var(--accent-gold)] ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Re-export Modal
export { Modal, ConfirmModal } from './Modal';

