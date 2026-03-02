'use client';

import { Icon } from '@iconify/react';

/**
 * Alert Component
 * 
 * Unified alert/message component for consistent feedback across the app.
 * Follows Band-Pulse design system with orange as primary accent.
 */

interface AlertProps {
    type: 'error' | 'warning' | 'success' | 'info';
    message: string;
    title?: string;
    onDismiss?: () => void;
    className?: string;
}

const alertStyles = {
    error: {
        container: 'bg-red-500/10 border-red-500/30',
        text: 'text-red-400',
        icon: 'mdi:alert-circle-outline',
    },
    warning: {
        container: 'bg-orange/10 border-orange/30',
        text: 'text-orange',
        icon: 'mdi:alert-outline',
    },
    success: {
        container: 'bg-green-500/10 border-green-500/30',
        text: 'text-green-400',
        icon: 'mdi:check-circle-outline',
    },
    info: {
        container: 'bg-prussian border-alabaster/20',
        text: 'text-alabaster',
        icon: 'mdi:information-outline',
    },
};

export function Alert({
    type,
    message,
    title,
    onDismiss,
    className = ''
}: AlertProps) {
    const styles = alertStyles[type];

    return (
        <div
            className={`
        p-4 rounded-xl border flex items-start gap-3
        ${styles.container}
        ${className}
      `}
            role="alert"
        >
            {/* Icon */}
            <Icon
                icon={styles.icon}
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.text}`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                {title && (
                    <p className={`font-medium mb-1 ${styles.text}`}>
                        {title}
                    </p>
                )}
                <p className={`text-sm ${styles.text} opacity-90`}>
                    {message}
                </p>
            </div>

            {/* Dismiss button */}
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className={`
            flex-shrink-0 p-1 rounded-lg
            opacity-60 hover:opacity-100 
            transition-opacity
            ${styles.text}
          `}
                    aria-label="Dismiss"
                >
                    <Icon icon="mdi:close" className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

// Toast-style alert for temporary messages
interface ToastProps extends AlertProps {
    duration?: number;
    onClose?: () => void;
}

export function Toast({
    duration = 5000,
    onClose,
    ...props
}: ToastProps) {
    // Auto-dismiss after duration
    if (duration > 0 && onClose) {
        setTimeout(onClose, duration);
    }

    return (
        <div className="fixed bottom-6 right-6 z-[400] animate-slide-up">
            <Alert {...props} onDismiss={onClose} />
        </div>
    );
}
