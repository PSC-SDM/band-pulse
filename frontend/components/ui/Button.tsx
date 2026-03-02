'use client';

import { forwardRef } from 'react';
import { Icon } from '@iconify/react';

/**
 * Button Component
 * 
 * Unified button component with variants following Band-Pulse design system.
 * - Primary: Orange background (CTA, max 10% usage)
 * - Secondary: Prussian Blue with border
 * - Ghost: Transparent with hover state
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: string;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

const variantStyles = {
    primary: `
    bg-orange text-night font-medium
    hover:bg-orange/90 
    active:bg-orange/80
    disabled:bg-orange/50
  `,
    secondary: `
    bg-prussian text-white font-medium
    border border-alabaster/20 
    hover:border-alabaster/40 hover:bg-prussian-light/20
    active:bg-prussian-light/30
    disabled:opacity-50
  `,
    ghost: `
    bg-transparent text-alabaster font-medium
    hover:bg-alabaster/10 hover:text-white
    active:bg-alabaster/20
    disabled:opacity-50
  `,
};

const sizeStyles = {
    sm: 'px-4 py-2 text-sm rounded-[10px] gap-1.5',
    md: 'px-6 py-3 text-base rounded-xl gap-2',
    lg: 'px-8 py-4 text-lg rounded-[14px] gap-2.5',
};

const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    className = '',
    ...props
}, ref) => {
    const isDisabled = disabled || loading;

    return (
        <button
            ref={ref}
            disabled={isDisabled}
            className={`
        inline-flex items-center justify-center
        transition-all duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'cursor-not-allowed' : ''}
        ${className}
      `}
            {...props}
        >
            {/* Loading spinner */}
            {loading && (
                <Icon
                    icon="mdi:loading"
                    className={`${iconSizes[size]} animate-spin`}
                />
            )}

            {/* Left icon */}
            {!loading && icon && iconPosition === 'left' && (
                <Icon icon={icon} className={iconSizes[size]} />
            )}

            {/* Content */}
            {children}

            {/* Right icon */}
            {!loading && icon && iconPosition === 'right' && (
                <Icon icon={icon} className={iconSizes[size]} />
            )}
        </button>
    );
});

Button.displayName = 'Button';

// Icon-only button variant
interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition' | 'children'> {
    icon: string;
    'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
    variant = 'ghost',
    size = 'md',
    icon,
    className = '',
    ...props
}, ref) => {
    const paddingSizes = {
        sm: 'p-2',
        md: 'p-2.5',
        lg: 'p-3',
    };

    return (
        <button
            ref={ref}
            className={`
        inline-flex items-center justify-center
        transition-all duration-200
        ${variantStyles[variant]}
        ${paddingSizes[size]}
        rounded-xl
        ${className}
      `}
            {...props}
        >
            <Icon icon={icon} className={iconSizes[size]} />
        </button>
    );
});

IconButton.displayName = 'IconButton';
