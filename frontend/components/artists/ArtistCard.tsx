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
 * - Dynamic, non-rectangular layout with diagonal accents
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
                className="block relative overflow-hidden bg-prussian/80 backdrop-blur-sm
                           border-l-2 border-transparent hover:border-orange
                           transition-all duration-300 hover:bg-prussian"
            >
                {/* Diagonal accent background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -right-20 -top-20 w-40 h-40 bg-orange/5 rotate-45 transform origin-center" />
                </div>

                <div className="relative p-5">
                    <div className="flex items-center gap-5">
                        {/* Avatar / Image - Hexagonal mask for visual interest */}
                        <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 clip-hexagon overflow-hidden bg-night">
                                {artist.imageUrl ? (
                                    <img
                                        src={artist.imageUrl}
                                        alt={artist.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-prussian-light">
                                        <span className="text-xl font-accent text-alabaster/60">
                                            {initials}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Country flag badge - positioned outside hexagon */}
                            {artist.area?.iso31661 && (
                                <span className="absolute -bottom-1 -right-1 text-lg drop-shadow-lg" title={artist.area.name}>
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

                            {/* Area/Country with accent line */}
                            {artist.area && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-3 h-px bg-alabaster/30 group-hover:bg-orange/50 group-hover:w-6 transition-all duration-300" />
                                    <p className="text-sm text-alabaster/60 font-body truncate">
                                        {artist.area.name}
                                    </p>
                                </div>
                            )}

                            {/* Aliases (show first 2) */}
                            {artist.aliases.length > 0 && (
                                <p className="text-xs text-alabaster/40 font-body truncate mt-1.5">
                                    aka {artist.aliases.slice(0, 2).map(a => a.name).join(', ')}
                                </p>
                            )}

                            {/* Genres - pill style with dynamic spacing */}
                            {artist.genres && artist.genres.length > 0 && (
                                <div className="flex gap-1.5 mt-3 flex-wrap">
                                    {artist.genres.slice(0, 3).map((genre, index) => (
                                        <span
                                            key={genre}
                                            className="px-2 py-0.5 text-[10px] font-display uppercase tracking-wider
                                                     bg-night/60 text-alabaster/70 
                                                     border-l border-alabaster/10 group-hover:border-orange/30
                                                     transition-colors duration-300"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom progress bar on hover */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-500" />
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
