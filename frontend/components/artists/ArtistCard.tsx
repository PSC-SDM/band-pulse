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
 * - Prussian Blue background for cards
 * - White text for primary content
 * - Alabaster for secondary text
 * - Orange accent only for follow CTA (controlled usage)
 */
export default function ArtistCard({
    artist,
    token,
    showFollowButton = true,
    onFollowChange,
}: ArtistCardProps) {
    // Generate initials for placeholder avatar
    const initials = artist.name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Get country flag emoji from ISO code
    const getCountryFlag = (iso: string | undefined) => {
        if (!iso || iso.length !== 2) return null;
        const codePoints = iso
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    return (
        <div className="group relative">
            <Link
                href={`/dashboard/artists/${artist.id}`}
                className="block p-5 bg-prussian rounded-xl border border-alabaster/10 
                           hover:border-orange/30 transition-all duration-300
                           hover:translate-y-[-2px] hover:shadow-lg hover:shadow-orange/5"
            >
                <div className="flex items-center gap-4">
                    {/* Avatar / Image */}
                    <div className="relative flex-shrink-0">
                        {artist.imageUrl ? (
                            <img
                                src={artist.imageUrl}
                                alt={artist.name}
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-alabaster/20
                                           group-hover:ring-orange/40 transition-all duration-300"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-prussian-light 
                                          flex items-center justify-center
                                          ring-2 ring-alabaster/20 group-hover:ring-orange/40
                                          transition-all duration-300">
                                <span className="text-xl font-accent text-alabaster/60">
                                    {initials}
                                </span>
                            </div>
                        )}

                        {/* Country flag badge */}
                        {artist.area?.iso31661 && (
                            <span className="absolute -bottom-1 -right-1 text-lg" title={artist.area.name}>
                                {getCountryFlag(artist.area.iso31661)}
                            </span>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-accent text-lg text-white truncate
                                     group-hover:text-orange transition-colors duration-300">
                            {artist.name}
                        </h3>

                        {/* Area/Country */}
                        {artist.area && (
                            <p className="text-sm text-alabaster/60 font-body truncate">
                                {artist.area.name}
                            </p>
                        )}

                        {/* Aliases (show first 2) */}
                        {artist.aliases.length > 0 && (
                            <p className="text-xs text-alabaster/40 font-body truncate mt-1">
                                aka {artist.aliases.slice(0, 2).map(a => a.name).join(', ')}
                            </p>
                        )}

                        {/* Genres (if available from future enrichment) */}
                        {artist.genres && artist.genres.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                                {artist.genres.slice(0, 3).map(genre => (
                                    <span
                                        key={genre}
                                        className="px-2 py-0.5 text-xs font-display uppercase
                                                 bg-night/50 text-alabaster/70 rounded"
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* Follow button - positioned outside link to prevent navigation on click */}
            {showFollowButton && (
                <div className="absolute top-4 right-4 z-10">
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
