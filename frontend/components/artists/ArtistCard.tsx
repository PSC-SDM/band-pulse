'use client';

import Link from 'next/link';
import { Artist } from '@/types/artist.types';
import FollowButton from './FollowButton';

interface ArtistCardProps {
    artist: Artist;
    token: string;
    showFollowButton?: boolean;
    onFollowChange?: (artistId: string, isFollowing: boolean) => void;
}

/**
 * Artist card component - vertical layout with prominent imagery.
 *
 * Style Guide compliance:
 * - Prussian Blue structure with depth
 * - White text for primary content, Alabaster for secondary
 * - Orange only on hover for name (controlled usage)
 * - Refined interactions: lift on hover, subtle shadows
 */
export default function ArtistCard({
    artist,
    token,
    showFollowButton = true,
    onFollowChange,
}: ArtistCardProps) {
    const initials = artist.name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const getCountryFlag = (iso: string | undefined) => {
        if (!iso || iso.length !== 2) return null;
        const codePoints = iso
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    const flag = artist.area?.iso31661 ? getCountryFlag(artist.area.iso31661) : null;

    const followerCount = artist.metadata?.followerCount;
    const formatFollowers = (count: number) => {
        if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
        if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
        return count.toString();
    };

    return (
        <div className="group relative overflow-visible">
            <Link
                href={`/dashboard/artists/${artist.id}`}
                className="block relative bg-prussian border border-white/[0.04]
                           hover:border-white/20
                           transition-colors duration-200 overflow-hidden"
                style={{
                    borderRadius: '28px',
                }}
            >
                {/* Avatar - Large and prominent */}
                <div className="relative w-full aspect-square overflow-hidden bg-night/50">
                    {artist.imageUrl ? (
                        <>
                            <img
                                src={artist.imageUrl}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                            />
                            {/* Gradient overlay for text legibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-prussian/80 via-transparent to-transparent" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-prussian-light to-prussian-dark">
                            <span className="text-5xl font-accent text-alabaster/20 tracking-wider select-none">
                                {initials}
                            </span>
                        </div>
                    )}

                    {/* Follower count badge - temporal data, uses orange */}
                    {followerCount && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-night/80 backdrop-blur-sm border border-white/10"
                            style={{ borderRadius: '12px' }}>
                            <span className="text-[11px] font-display text-orange font-semibold tracking-wide">
                                {formatFollowers(followerCount)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 relative">
                    {/* Artist name */}
                    <h3 className="font-accent text-lg text-white leading-tight mb-2
                                 group-hover:text-orange transition-colors duration-200
                                 line-clamp-2">
                        {artist.name}
                    </h3>

                    {/* Location */}
                    {artist.area && (
                        <div className="flex items-center gap-1.5 mb-3">
                            {flag && <span className="text-sm">{flag}</span>}
                            <span className="text-xs text-alabaster/60 font-body tracking-wide">
                                {artist.area.name}
                            </span>
                        </div>
                    )}

                    {/* Genres - using dots for visual separation */}
                    {artist.genres && artist.genres.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {artist.genres.slice(0, 3).map((genre, i) => (
                                <span
                                    key={i}
                                    className="text-[10px] font-display uppercase tracking-widest text-alabaster/40
                                             px-2 py-1 bg-white/[0.03] border border-white/[0.06]"
                                    style={{ borderRadius: '8px' }}
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subtle accent line at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            {/* Follow button - positioned over the card */}
            {showFollowButton && (
                <div className="absolute top-3 left-3 z-10">
                    <FollowButton
                        artistId={artist.id}
                        initialFollowing={artist.isFollowing ?? false}
                        token={token}
                        size="sm"
                        onFollowChange={(isFollowing) => onFollowChange?.(artist.id, isFollowing)}
                    />
                </div>
            )}
        </div>
    );
}
