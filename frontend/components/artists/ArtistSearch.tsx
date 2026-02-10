'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks';
import { searchArtists, followArtist, unfollowArtist } from '@/lib/artists';
import { Artist } from '@/types/artist.types';

interface ArtistSearchProps {
    token: string;
    onFollowChange?: (artistId: string, isFollowing: boolean) => void;
}

/**
 * Artist search component with compact dropdown results.
 * 
 * Redesigned for better UX:
 * - Compact result items (not full cards)
 * - Proper z-index stacking
 * - Scrollable results
 * - Click-friendly items
 * 
 * Style Guide compliance:
 * - Prussian Blue for dropdown background
 * - Orange accent for focus states and CTAs
 * - White/Alabaster for text hierarchy
 */
export default function ArtistSearch({ token, onFollowChange }: ArtistSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, 300);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Search when debounced query changes
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const performSearch = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const artists = await searchArtists(debouncedQuery, token, 10);
                setResults(artists);
                setIsOpen(true);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Search failed');
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery, token]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    // Navigate to artist page
    const handleArtistClick = useCallback((artistId: string) => {
        setIsOpen(false);
        router.push(`/dashboard/artists/${artistId}`);
    }, [router]);

    // Handle follow/unfollow
    const handleFollowClick = useCallback(async (e: React.MouseEvent, artist: Artist) => {
        e.stopPropagation(); // Prevent navigation

        if (loadingFollow) return;

        setLoadingFollow(artist.id);

        try {
            if (artist.isFollowing) {
                await unfollowArtist(artist.id, token);
                setResults(prev => prev.map(a =>
                    a.id === artist.id ? { ...a, isFollowing: false } : a
                ));
                onFollowChange?.(artist.id, false);
            } else {
                await followArtist(artist.id, token);
                setResults(prev => prev.map(a =>
                    a.id === artist.id ? { ...a, isFollowing: true } : a
                ));
                onFollowChange?.(artist.id, true);
            }
        } catch (err) {
            console.error('Follow action failed:', err);
        } finally {
            setLoadingFollow(null);
        }
    }, [token, loadingFollow, onFollowChange]);

    // Get country flag emoji
    const getCountryFlag = (iso: string | undefined) => {
        if (!iso || iso.length !== 2) return null;
        const codePoints = iso.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    // Generate initials
    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full"
            style={{ isolation: 'isolate' }}
            onKeyDown={handleKeyDown}
        >
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder="Search for artists..."
                    className="w-full px-5 py-4 pl-12
                             bg-prussian border border-alabaster/20 rounded-xl
                             text-white font-body placeholder:text-alabaster/40
                             focus:border-orange/50 focus:ring-2 focus:ring-orange/20
                             transition-all duration-300"
                />

                {/* Search Icon */}
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-alabaster/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>

                {/* Loading Spinner */}
                {isLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-5 w-5 text-orange" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                )}

                {/* Clear Button */}
                {query && !isLoading && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                            setIsOpen(false);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-alabaster/50 hover:text-white transition-colors"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-2 px-4 py-2 bg-orange/10 border border-orange/30 rounded-lg">
                    <p className="text-sm text-orange font-body flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                    </p>
                </div>
            )}

            {/* Results Dropdown - Fixed positioning and high z-index */}
            {isOpen && results.length > 0 && (
                <div
                    className="absolute left-0 right-0 mt-2 
                             bg-night border border-alabaster/20 rounded-xl
                             shadow-2xl shadow-black/80
                             overflow-hidden"
                    style={{ zIndex: 9999 }}
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-alabaster/10 bg-prussian/50">
                        <span className="text-xs font-display uppercase tracking-wider text-alabaster/60">
                            {results.length} artist{results.length !== 1 ? 's' : ''} found
                        </span>
                    </div>

                    {/* Scrollable Results */}
                    <div className="max-h-80 overflow-y-auto overscroll-contain">
                        {results.map((artist) => (
                            <div
                                key={artist.id}
                                onClick={() => handleArtistClick(artist.id)}
                                className="flex items-center gap-3 px-4 py-3 
                                         hover:bg-prussian/80 cursor-pointer
                                         border-b border-alabaster/5 last:border-b-0
                                         transition-colors duration-150"
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {artist.imageUrl ? (
                                        <img
                                            src={artist.imageUrl}
                                            alt={artist.name}
                                            className="w-11 h-11 rounded-full object-cover ring-1 ring-alabaster/20"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-prussian flex items-center justify-center ring-1 ring-alabaster/20">
                                            <span className="text-sm font-display text-alabaster/50">
                                                {getInitials(artist.name)}
                                            </span>
                                        </div>
                                    )}
                                    {artist.area?.iso31661 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 text-xs">
                                            {getCountryFlag(artist.area.iso31661)}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-body font-semibold text-white text-sm truncate">
                                        {artist.name}
                                    </h4>
                                    {artist.area && (
                                        <p className="text-xs text-alabaster/50 truncate">
                                            {artist.area.name}
                                        </p>
                                    )}
                                </div>

                                {/* Follow Button - Compact */}
                                <button
                                    onClick={(e) => handleFollowClick(e, artist)}
                                    disabled={loadingFollow === artist.id}
                                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-display uppercase tracking-wide rounded-md
                                              transition-all duration-200 disabled:opacity-50
                                              ${artist.isFollowing
                                            ? 'bg-prussian border border-alabaster/30 text-alabaster hover:border-orange/50 hover:text-white'
                                            : 'bg-orange text-night hover:bg-orange-light'
                                        }`}
                                    type="button"
                                >
                                    {loadingFollow === artist.id ? (
                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : artist.isFollowing ? (
                                        'Following'
                                    ) : (
                                        'Follow'
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-alabaster/10 bg-prussian/30">
                        <p className="text-[10px] text-alabaster/40 font-body text-center">
                            Click artist name to view profile · Press ESC to close
                        </p>
                    </div>
                </div>
            )}

            {/* No Results */}
            {isOpen && !isLoading && query.length >= 2 && results.length === 0 && !error && (
                <div
                    className="absolute left-0 right-0 mt-2 
                             bg-night border border-alabaster/20 rounded-xl
                             p-6 text-center shadow-2xl shadow-black/80"
                    style={{ zIndex: 9999 }}
                >
                    <div className="text-alabaster/30 mb-2">
                        <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-alabaster/60 font-body text-sm">
                        No artists found for &quot;{query}&quot;
                    </p>
                    <p className="text-alabaster/40 text-xs font-body mt-1">
                        Try a different search term
                    </p>
                </div>
            )}
        </div>
    );
}
