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
 * - View followed artists
 * - Follow/unfollow directly from search results
 * 
 * Style Guide compliance:
 * - Night (#000) background
 * - Prussian Blue for cards
 * - Orange for CTAs only (controlled usage)
 */
export default function ArtistsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

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
            <div className="mx-auto max-w-5xl px-6 py-8">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-accent text-white mb-2 
                                 opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards' }}>
                        Artists
                    </h1>
                    <p className="text-alabaster/60 font-body text-lg
                                opacity-0 animate-fade-up stagger-1"
                        style={{ animationFillMode: 'forwards' }}>
                        Search and follow your favorite artists to get notified about upcoming concerts
                    </p>
                </header>

                {/* Search Section */}
                <section className="mb-12 opacity-0 animate-fade-up stagger-2 relative z-50"
                    style={{ animationFillMode: 'forwards' }}>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange/5 via-transparent to-orange/5 
                                      rounded-2xl blur-xl" />
                        <div className="relative bg-prussian-dark/50 backdrop-blur-sm 
                                      border border-alabaster/10 rounded-2xl p-6">
                            <h2 className="text-lg font-display uppercase tracking-wider text-alabaster/70 mb-4">
                                Search Artists
                            </h2>
                            {token && (
                                <ArtistSearch
                                    token={token}
                                    onFollowChange={handleFollowChange}
                                />
                            )}
                        </div>
                    </div>
                </section>

                {/* Following Section */}
                <section className="opacity-0 animate-fade-up stagger-3 relative z-10"
                    style={{ animationFillMode: 'forwards' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-display uppercase tracking-wider text-white">
                            Following
                            {followedArtists.length > 0 && (
                                <span className="ml-3 px-2 py-0.5 text-sm bg-orange/20 text-orange rounded">
                                    {followedArtists.length}
                                </span>
                            )}
                        </h2>
                    </div>

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

                    {/* Loading State */}
                    {isLoading && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-5 bg-prussian rounded-xl border border-alabaster/10 animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-prussian-light" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-5 bg-prussian-light rounded w-3/4" />
                                            <div className="h-4 bg-prussian-light rounded w-1/2" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && followedArtists.length === 0 && (
                        <div className="text-center py-16 bg-prussian/30 rounded-2xl border border-alabaster/10">
                            <div className="text-alabaster/30 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-accent text-white mb-2">No artists yet</h3>
                            <p className="text-alabaster/50 font-body max-w-md mx-auto">
                                Start by searching for your favorite artists above.
                                Follow them to get notified when they announce concerts near you.
                            </p>
                        </div>
                    )}

                    {/* Artists Grid */}
                    {!isLoading && followedArtists.length > 0 && token && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {followedArtists.map((artist, index) => (
                                <div
                                    key={artist.id}
                                    className="opacity-0 animate-fade-up"
                                    style={{
                                        animationDelay: `${index * 100}ms`,
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
