'use client';

import { forwardRef, useState } from 'react';
import { Icon } from '@iconify/react';

/**
 * Input Component
 * 
 * Unified input component following Band-Pulse design system.
 * - Consistent border styling (no border-l-2)
 * - Focus ring with orange accent
 * - Error states with red highlight
 */

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: string;
    onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    icon,
    type = 'text',
    className = '',
    onChange,
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
    };

    return (
        <div className="space-y-2">
            {/* Label */}
            {label && (
                <label className="block text-[10px] tracking-[0.2em] font-display text-alabaster/60 uppercase">
                    {label}
                </label>
            )}

            {/* Input wrapper */}
            <div className="relative">
                {/* Icon */}
                {icon && (
                    <Icon
                        icon={icon}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-alabaster/40"
                    />
                )}

                {/* Input */}
                <input
                    ref={ref}
                    type={inputType}
                    onChange={handleChange}
                    className={`
            w-full px-4 py-3 rounded-[20px]
            bg-night/50 text-white font-body
            border transition-all duration-200
            placeholder:text-alabaster/30
            focus:outline-none
            ${icon ? 'pl-12' : ''}
            ${isPassword ? 'pr-12' : ''}
            ${error
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                            : 'border-alabaster/20 focus:border-orange/50 focus:ring-2 focus:ring-orange/20'
                        }
            ${className}
          `}
                    {...props}
                />

                {/* Password toggle */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-alabaster/40 hover:text-alabaster/60 transition-colors"
                        tabIndex={-1}
                    >
                        <Icon
                            icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
                            className="w-5 h-5"
                        />
                    </button>
                )}
            </div>

            {/* Error message */}
            {error && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                    <Icon icon="mdi:alert-circle-outline" className="w-4 h-4" />
                    {error}
                </p>
            )}

            {/* Hint text */}
            {hint && !error && (
                <p className="text-sm text-alabaster/40">
                    {hint}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

// Textarea variant
interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string;
    error?: string;
    hint?: string;
    onChange?: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    label,
    error,
    hint,
    className = '',
    onChange,
    rows = 4,
    ...props
}, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    };

    return (
        <div className="space-y-2">
            {/* Label */}
            {label && (
                <label className="block text-[10px] tracking-[0.2em] font-display text-alabaster/60 uppercase">
                    {label}
                </label>
            )}

            {/* Textarea */}
            <textarea
                ref={ref}
                rows={rows}
                onChange={handleChange}
                className={`
          w-full px-4 py-3 rounded-[20px]
          bg-night/50 text-white font-body
          border transition-all duration-200
          placeholder:text-alabaster/30
          focus:outline-none resize-none
          ${error
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-alabaster/20 focus:border-orange/50 focus:ring-2 focus:ring-orange/20'
                    }
          ${className}
        `}
                {...props}
            />

            {/* Error message */}
            {error && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                    <Icon icon="mdi:alert-circle-outline" className="w-4 h-4" />
                    {error}
                </p>
            )}

            {/* Hint text */}
            {hint && !error && (
                <p className="text-sm text-alabaster/40">
                    {hint}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';
