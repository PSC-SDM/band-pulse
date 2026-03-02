import React from 'react';

/**
 * Skeleton Loading Components
 * 
 * Unified skeleton components for consistent loading states across the app.
 * Follows Band-Pulse design system: border-radius hierarchy, prussian/alabaster colors.
 */

// Base skeleton with shimmer animation
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`bg-alabaster/10 animate-pulse ${className}`}
        />
    );
}

// Artist Card Skeleton
export function ArtistCardSkeleton() {
    return (
        <div
            className="bg-prussian border border-white/[0.04] overflow-hidden animate-pulse"
            style={{ borderRadius: '28px', aspectRatio: '1/1.3' }}
        >
            {/* Image placeholder */}
            <div className="w-full aspect-square bg-alabaster/10" />

            {/* Content placeholder */}
            <div className="p-5 space-y-3">
                {/* Name */}
                <div className="h-5 bg-alabaster/10 rounded w-3/4" />
                {/* Genres */}
                <div className="h-3 bg-alabaster/[0.07] rounded w-1/2" />
                {/* Tags */}
                <div className="flex gap-2">
                    <div className="h-5 bg-alabaster/[0.05] rounded-lg w-16" />
                    <div className="h-5 bg-alabaster/[0.05] rounded-lg w-20" />
                </div>
            </div>
        </div>
    );
}

// Event Card Skeleton
export function EventCardSkeleton() {
    return (
        <div
            className="bg-prussian border border-white/[0.04] overflow-hidden animate-pulse"
            style={{ borderRadius: '28px' }}
        >
            {/* Image placeholder */}
            <div className="w-full aspect-video bg-alabaster/10" />

            {/* Content placeholder */}
            <div className="p-5 space-y-3">
                {/* Artist name */}
                <div className="h-5 bg-alabaster/10 rounded w-2/3" />
                {/* Venue */}
                <div className="h-4 bg-alabaster/[0.07] rounded w-1/2" />
                {/* Date + Button row */}
                <div className="flex justify-between items-center pt-2">
                    <div className="h-4 bg-alabaster/[0.05] rounded w-24" />
                    <div className="h-10 bg-alabaster/[0.05] rounded-xl w-28" />
                </div>
            </div>
        </div>
    );
}

// Notification Item Skeleton
export function NotificationSkeleton() {
    return (
        <div
            className="p-3 animate-pulse"
            style={{ borderRadius: '20px' }}
        >
            <div className="flex gap-3">
                {/* Icon placeholder */}
                <div className="w-10 h-10 bg-alabaster/10 rounded-xl flex-shrink-0" />

                {/* Content placeholder */}
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-alabaster/10 rounded w-2/3" />
                    <div className="h-3 bg-alabaster/[0.07] rounded w-1/2" />
                </div>
            </div>
        </div>
    );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 p-4 animate-pulse">
            {Array.from({ length: columns }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-alabaster/10 rounded flex-1"
                    style={{ maxWidth: i === 0 ? '200px' : '100px' }}
                />
            ))}
        </div>
    );
}

// Grid of skeletons helper
export function SkeletonGrid({
    count = 6,
    type = 'artist',
    columns = 'md:grid-cols-2 lg:grid-cols-3'
}: {
    count?: number;
    type?: 'artist' | 'event' | 'notification';
    columns?: string;
}) {
    const SkeletonComponent = {
        artist: ArtistCardSkeleton,
        event: EventCardSkeleton,
        notification: NotificationSkeleton,
    }[type];

    return (
        <div className={`grid gap-6 ${columns}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonComponent key={i} />
            ))}
        </div>
    );
}
