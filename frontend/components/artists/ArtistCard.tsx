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
 * Artist card component for display in lists and search results.
 *
 * Style Guide compliance:
 * - Prussian Blue flat background, no transparency stacking
 * - White text for primary content, Alabaster for secondary
 * - Orange only on hover for artist name (controlled usage)
 * - No decorative shapes or motion — quiet, precise, reliable
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
        <div className="group relative">
            <Link
                href={`/dashboard/artists/${artist.id}`}
                className="block bg-prussian border border-white/[0.06]
                           hover:border-white/10 hover:bg-[#192d50]
                           transition-colors duration-150"
            >
                <div className="px-5 py-4 pr-36">
                    <div className="flex items-center gap-4">
                        {/* Square initials avatar — no decorative clipping */}
                        <div className="flex-shrink-0 w-11 h-11 bg-night border border-white/10
                                       flex items-center justify-center">
                            {artist.imageUrl ? (
                                <img
                                    src={artist.imageUrl}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xs font-accent text-alabaster/40 tracking-widest select-none">
                                    {initials}
                                </span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-accent text-[15px] text-white leading-snug truncate
                                         group-hover:text-orange transition-colors duration-150">
                                {artist.name}
                            </h3>

                            {/* Single meta line: flag + country · genres · followers */}
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                                {artist.area && (
                                    <span className="text-xs text-alabaster/50 font-body flex items-center gap-1 flex-shrink-0">
                                        {flag && <span>{flag}</span>}
                                        <span>{artist.area.name}</span>
                                    </span>
                                )}

                                {artist.area && artist.genres && artist.genres.length > 0 && (
                                    <span className="text-alabaster/20 text-xs flex-shrink-0 select-none">·</span>
                                )}

                                {artist.genres && artist.genres.length > 0 && (
                                    <span className="text-xs text-alabaster/35 font-body truncate">
                                        {artist.genres.slice(0, 3).join(' · ')}
                                    </span>
                                )}

                                {followerCount && (
                                    <>
                                        <span className="text-alabaster/20 text-xs flex-shrink-0 select-none">·</span>
                                        <span className="text-xs text-alabaster/30 font-body flex-shrink-0">
                                            {formatFollowers(followerCount)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Follow button — outside link to avoid navigation on click */}
            {showFollowButton && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10">
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
