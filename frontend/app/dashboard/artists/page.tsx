'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ArtistSearch from '@/components/artists/ArtistSearch';
import ArtistCard from '@/components/artists/ArtistCard';
import { getFollowedArtists } from '@/lib/artists';
import { Artist } from '@/types/artist.types';

/**
 * Artists Dashboard Page
 * 
 * Features:
 * - Search for artists (with lazy-loading from MusicBrainz)
 * - View followed artists in refined grid layout
 * - Follow/unfollow with immediate feedback
 * 
 * Style Guide compliance:
 * - Night (#000) background with depth
 * - Prussian Blue for structure
 * - Orange for temporal CTAs only
 */
export default function ArtistsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Read ?search= param client-side without useSearchParams (avoids Suspense requirement)
    const [initialSearch] = useState<string>(() => {
        if (typeof window === 'undefined') return '';
        return new URLSearchParams(window.location.search).get('search') ?? '';
    });

    const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get the backend token from session
    const token = (session as any)?.accessToken as string | undefined;

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch followed artists
    useEffect(() => {
        if (!token) return;

        const fetchFollowed = async () => {
            setIsLoading(true);
            try {
                const artists = await getFollowedArtists(token);
                setFollowedArtists(artists);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load artists');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFollowed();
    }, [token]);

    // Handle follow changes from search results
    const handleFollowChange = (artistId: string, isFollowing: boolean) => {
        if (isFollowing) {
            // Refresh followed artists list when a new artist is followed
            if (token) {
                getFollowedArtists(token).then(setFollowedArtists).catch(console.error);
            }
        } else {
            // Remove from local state when unfollowed
            setFollowedArtists(prev => prev.filter(a => a.id !== artistId));
        }
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-night">
                <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full 
                                  border-4 border-solid border-orange border-r-transparent" />
                    <p className="mt-4 text-alabaster font-body">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-7xl px-6 py-10">
                {/* Header - asymmetric layout */}
                <header className="mb-12 max-w-3xl">
                    <div className="flex items-end gap-6 mb-3">
                        <h1 className="text-5xl md:text-6xl font-accent text-white leading-none
                                     opacity-0 animate-fade-up"
                            style={{ animationFillMode: 'forwards' }}>
                            Artists
                        </h1>
                        {followedArtists.length > 0 && (
                            <span className="text-2xl font-display text-orange tabular-nums mb-1
                                         opacity-0 animate-fade-up stagger-1"
                                style={{ animationFillMode: 'forwards' }}>
                                {followedArtists.length}
                            </span>
                        )}
                    </div>
                    <p className="text-alabaster/50 font-body text-base leading-relaxed
                                opacity-0 animate-fade-up stagger-1"
                        style={{ animationFillMode: 'forwards' }}>
                        Follow artists to track their tours and get instant notifications when they announce
                        concerts within your radius
                    </p>
                </header>

                {/* Search Section - refined */}
                <section className="mb-16 opacity-0 animate-fade-up stagger-2 relative z-[100]"
                    style={{ animationFillMode: 'forwards' }}>
                    <div className="bg-prussian border border-white/[0.04] p-8 relative"
                        style={{ borderRadius: '32px' }}>
                        {/* Subtle depth effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" style={{ borderRadius: '32px' }} />
                        <h2 className="text-[10px] font-display uppercase tracking-[0.2em] text-alabaster/30 mb-5">
                            Discover
                        </h2>
                        {token && (
                            <ArtistSearch
                                token={token}
                                onFollowChange={handleFollowChange}
                                initialQuery={initialSearch}
                            />
                        )}
                    </div>
                </section>

                {/* Following Section */}
                <section className="opacity-0 animate-fade-up stagger-3 relative z-10"
                    style={{ animationFillMode: 'forwards' }}>
                    {followedArtists.length > 0 && (
                        <h2 className="text-[10px] font-display uppercase tracking-[0.2em] text-alabaster/30 mb-8">
                            Your Artists
                        </h2>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-orange/10 border border-orange/30 rounded-xl mb-6">
                            <p className="text-orange font-body flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Loading State - refined skeletons */}
                    {isLoading && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i}
                                    className="bg-prussian border border-white/[0.04] animate-pulse relative overflow-hidden"
                                    style={{
                                        borderRadius: '28px',
                                        aspectRatio: '1/1.3'
                                    }}>
                                    <div className="w-full aspect-square bg-prussian-light" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-5 bg-prussian-light/70 rounded w-3/4" />
                                        <div className="h-3 bg-prussian-light/50 rounded w-1/2" />
                                        <div className="flex gap-2">
                                            <div className="h-5 bg-prussian-light/30 rounded-lg w-16" />
                                            <div className="h-5 bg-prussian-light/30 rounded-lg w-20" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State - refined */}
                    {!isLoading && followedArtists.length === 0 && (
                        <div className="text-center py-24 bg-prussian/20 border border-white/[0.04] relative overflow-hidden"
                            style={{ borderRadius: '32px' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent" />
                            <div className="relative z-10">
                                <div className="text-alabaster/20 mb-6">
                                    <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-accent text-white mb-3">No artists yet</h3>
                                <p className="text-alabaster/40 font-body text-sm max-w-sm mx-auto leading-relaxed">
                                    Start discovering artists above. When you follow them, they'll appear here
                                    and you'll receive notifications for their concerts.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Artists Grid - 3 columns on large screens */}
                    {!isLoading && followedArtists.length > 0 && token && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {followedArtists.map((artist, index) => (
                                <div
                                    key={artist.id}
                                    className="opacity-0 animate-fade-up"
                                    style={{
                                        animationDelay: `${50 + (index * 80)}ms`,
                                        animationFillMode: 'forwards',
                                    }}
                                >
                                    <ArtistCard
                                        artist={{ ...artist, isFollowing: true }}
                                        token={token}
                                        onFollowChange={handleFollowChange}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
