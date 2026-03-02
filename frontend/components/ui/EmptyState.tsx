'use client';

import React from 'react';

import Link from 'next/link';
import { Icon } from '@iconify/react';

/**
 * EmptyState Component
 * 
 * Unified empty state for consistent messaging across the app.
 * Follows Band-Pulse design system.
 */

interface EmptyStateProps {
    icon: 'artists' | 'events' | 'notifications' | 'search' | 'error';
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    className?: string;
}

const iconMap = {
    artists: 'mdi:music-note',
    events: 'mdi:ticket-outline',
    notifications: 'mdi:bell-outline',
    search: 'mdi:magnify',
    error: 'mdi:alert-circle-outline',
};

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = ''
}: EmptyStateProps) {
    return (
        <div
            className={`
        flex flex-col items-center justify-center py-16 px-6 text-center
        bg-prussian/20 border border-white/[0.04]
        ${className}
      `}
            style={{ borderRadius: '32px' }}
        >
            {/* Icon */}
            <div className="text-alabaster/20 mb-6">
                <Icon icon={iconMap[icon]} className="w-20 h-20" />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-accent text-white mb-3">
                {title}
            </h3>

            {/* Description */}
            <p className="text-alabaster/40 font-body text-sm max-w-sm leading-relaxed mb-6">
                {description}
            </p>

            {/* Action Button */}
            {action && (
                action.href ? (
                    <Link
                        href={action.href}
                        className="
              bg-orange text-night font-medium px-6 py-3 
              rounded-xl hover:bg-orange/90 transition-colors
            "
                    >
                        {action.label}
                    </Link>
                ) : action.onClick ? (
                    <button
                        onClick={action.onClick}
                        className="
              bg-orange text-night font-medium px-6 py-3 
              rounded-xl hover:bg-orange/90 transition-colors
            "
                    >
                        {action.label}
                    </button>
                ) : null
            )}
        </div>
    );
}

// Pre-configured empty states for common use cases
export function NoArtistsEmptyState() {
    return (
        <EmptyState
            icon="artists"
            title="No artists yet"
            description="Start discovering artists above. When you follow them, they'll appear here and you'll receive notifications for their concerts."
            action={{ label: "Explore Artists", href: "/dashboard/explore" }}
        />
    );
}

export function NoEventsEmptyState() {
    return (
        <EmptyState
            icon="events"
            title="No upcoming events"
            description="We'll notify you when artists you follow announce new concerts near you."
        />
    );
}

export function NoNotificationsEmptyState() {
    return (
        <EmptyState
            icon="notifications"
            title="You're all caught up"
            description="No new notifications at the moment. We'll let you know when something happens."
        />
    );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
    return (
        <EmptyState
            icon="search"
            title="No results found"
            description={`We couldn't find any results for "${query}". Try a different search term.`}
        />
    );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
    return (
        <EmptyState
            icon="error"
            title="Something went wrong"
            description="We couldn't load the data. Please try again."
            action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
        />
    );
}
