'use client';

import { useState } from 'react';
import { followArtist, unfollowArtist } from '@/lib/artists';

interface FollowButtonProps {
    artistId: string;
    initialFollowing: boolean;
    token: string;
    size?: 'sm' | 'md' | 'lg';
    onFollowChange?: (isFollowing: boolean) => void;
}

/**
 * Follow/Unfollow button for artists.
 * 
 * Style Guide compliance:
 * - Orange (#FCA311) for primary CTA when not following
 * - Prussian Blue for secondary state when following
 * - Controlled orange usage per Style Guide (< 10% screen area)
 */
export default function FollowButton({
    artistId,
    initialFollowing,
    token,
    size = 'md',
    onFollowChange,
}: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2 text-sm',
        lg: 'px-6 py-2.5 text-base',
    };

    const handleClick = async () => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            if (isFollowing) {
                await unfollowArtist(artistId, token);
                setIsFollowing(false);
                onFollowChange?.(false);
            } else {
                await followArtist(artistId, token);
                setIsFollowing(true);
                onFollowChange?.(true);
            }
        } catch (error) {
            console.error('Follow action failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Following state: subtle, not orange (per Style Guide - orange only for temporal activation)
    // Not following: orange CTA to draw attention to action
    const baseClasses = `
        ${sizeClasses[size]}
        font-display font-bold uppercase tracking-wider
        rounded-lg
        transition-all duration-300
        focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-night
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const stateClasses = isFollowing
        ? `
            bg-prussian border border-alabaster/30 text-white
            hover:bg-prussian-light hover:border-orange/50
          `
        : `
            bg-orange text-night
            hover:bg-orange-light
          `;

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`${baseClasses} ${stateClasses}`}
        >
            {isLoading ? (
                <span className="inline-flex items-center gap-2">
                    <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
                </span>
            ) : isFollowing ? (
                <span>{isHovered ? 'Unfollow' : 'Following'}</span>
            ) : (
                <span>Follow</span>
            )}
        </button>
    );
}
