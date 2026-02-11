'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getArtistById } from '@/lib/artists';
import { getArtistEvents } from '@/lib/events';
import { Artist } from '@/types/artist.types';
import { EventResponse } from '@/types/event.types';
import FollowButton from '@/components/artists/FollowButton';
import EventCard from '@/components/Events/EventCard';
import EventMap from '@/components/Events/EventMap';

/**
 * Artist Detail Page
 * 
 * Displays full artist profile with:
 * - Name, country, aliases
 * - Follow button
 * - Follower count
 * - Future: upcoming events section
 * 
 * Style Guide compliance:
 * - Night background with Prussian Blue cards
 * - Orange for follow CTA only
 * - Controlled orange usage (< 10% screen)
 */
export default function ArtistDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const artistId = params.id as string;

    const [artist, setArtist] = useState<Artist | null>(null);
    const [events, setEvents] = useState<EventResponse[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsView, setEventsView] = useState<'list' | 'map'>('list');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = (session as any)?.accessToken as string | undefined;

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch artist data
    useEffect(() => {
        if (!token || !artistId) return;

        const fetchArtist = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await getArtistById(artistId, token);
                setArtist(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load artist');
            } finally {
                setIsLoading(false);
            }
        };

        fetchArtist();
    }, [token, artistId]);

    // Fetch artist events
    useEffect(() => {
        if (!token || !artistId) return;

        const fetchEvents = async () => {
            setEventsLoading(true);
            try {
                const data = await getArtistEvents(artistId, token);
                setEvents(data);
            } catch {
                // Silently fail - events are supplementary
            } finally {
                setEventsLoading(false);
            }
        };

        fetchEvents();
    }, [token, artistId]);

    // Handle follow status change
    const handleFollowChange = (isFollowing: boolean) => {
        if (artist) {
            setArtist({ ...artist, isFollowing });
        }
    };

    // Get country flag emoji from ISO code
    const getCountryFlag = (iso: string | undefined) => {
        if (!iso || iso.length !== 2) return null;
        const codePoints = iso
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    };

    // Generate initials for placeholder
    const initials = artist?.name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';

    // Loading state
    if (status === 'loading' || isLoading) {
        return (
            <div className="bg-night min-h-[calc(100vh-73px-65px)]">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    {/* Back link skeleton */}
                    <div className="h-6 w-32 bg-prussian rounded animate-pulse mb-8" />

                    {/* Header skeleton */}
                    <div className="bg-prussian rounded-2xl p-8 animate-pulse">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                            <div className="w-40 h-40 rounded-full bg-prussian-light" />
                            <div className="flex-1 space-y-4 text-center md:text-left">
                                <div className="h-10 bg-prussian-light rounded w-64 mx-auto md:mx-0" />
                                <div className="h-6 bg-prussian-light rounded w-40 mx-auto md:mx-0" />
                                <div className="h-10 bg-prussian-light rounded w-32 mx-auto md:mx-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-night min-h-[calc(100vh-73px-65px)]">
                <div className="mx-auto max-w-4xl px-6 py-8">
                    <Link
                        href="/dashboard/artists"
                        className="inline-flex items-center gap-2 text-alabaster/60 hover:text-white 
                                 font-body transition-colors mb-8"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Artists
                    </Link>

                    <div className="text-center py-16 bg-prussian/30 rounded-2xl border border-alabaster/10">
                        <div className="text-orange mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-accent text-white mb-2">Error Loading Artist</h2>
                        <p className="text-alabaster/60 font-body mb-6">{error}</p>
                        <button
                            onClick={() => router.push('/dashboard/artists')}
                            className="px-6 py-3 bg-prussian border border-alabaster/30 text-white 
                                     font-display uppercase tracking-wider rounded-lg
                                     hover:border-orange/50 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!artist) return null;

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-4xl px-6 py-8">
                {/* Back Navigation */}
                <Link
                    href="/dashboard/artists"
                    className="inline-flex items-center gap-2 text-alabaster/60 hover:text-white 
                             font-body transition-colors mb-8 group
                             opacity-0 animate-fade-in"
                    style={{ animationFillMode: 'forwards' }}
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Artists
                </Link>

                {/* Artist Header Card */}
                <div className="relative overflow-hidden rounded-2xl
                              opacity-0 animate-fade-up"
                    style={{ animationFillMode: 'forwards', animationDelay: '0.1s' }}>
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-prussian via-prussian-dark to-night" />

                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange/3 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                {artist.imageUrl ? (
                                    <img
                                        src={artist.imageUrl}
                                        alt={artist.name}
                                        className="w-40 h-40 md:w-48 md:h-48 rounded-full object-cover
                                                 ring-4 ring-alabaster/20 shadow-2xl"
                                    />
                                ) : (
                                    <div className="w-40 h-40 md:w-48 md:h-48 rounded-full 
                                                  bg-prussian-light flex items-center justify-center
                                                  ring-4 ring-alabaster/20 shadow-2xl">
                                        <span className="text-5xl md:text-6xl font-accent text-alabaster/40">
                                            {initials}
                                        </span>
                                    </div>
                                )}

                                {/* Country flag */}
                                {artist.area?.iso31661 && (
                                    <span className="absolute bottom-2 right-2 text-4xl"
                                        title={artist.area.name}>
                                        {getCountryFlag(artist.area.iso31661)}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-4xl md:text-5xl font-accent text-white mb-3">
                                    {artist.name}
                                </h1>

                                {/* Location */}
                                {artist.area && (
                                    <p className="text-lg text-alabaster/70 font-body mb-4 flex items-center justify-center md:justify-start gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        {artist.area.name}
                                    </p>
                                )}

                                {/* Stats */}
                                <div className="flex items-center justify-center md:justify-start gap-6 mb-6">
                                    {artist.followerCount !== undefined && (
                                        <div className="text-center">
                                            <p className="text-2xl font-display text-white">
                                                {artist.followerCount.toLocaleString()}
                                            </p>
                                            <p className="text-xs font-display uppercase tracking-wider text-alabaster/50">
                                                Followers
                                            </p>
                                        </div>
                                    )}
                                    {artist.aliases.length > 0 && (
                                        <div className="text-center">
                                            <p className="text-2xl font-display text-white">
                                                {artist.aliases.length}
                                            </p>
                                            <p className="text-xs font-display uppercase tracking-wider text-alabaster/50">
                                                Aliases
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Follow Button */}
                                {token && (
                                    <FollowButton
                                        artistId={artist.id}
                                        initialFollowing={artist.isFollowing ?? false}
                                        token={token}
                                        size="lg"
                                        onFollowChange={handleFollowChange}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aliases Section */}
                {artist.aliases.length > 0 && (
                    <section className="mt-8 opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
                        <h2 className="text-lg font-display uppercase tracking-wider text-alabaster/70 mb-4">
                            Also Known As
                        </h2>
                        <div className="bg-prussian/50 rounded-xl p-6 border border-alabaster/10">
                            <div className="flex flex-wrap gap-2">
                                {artist.aliases.map((alias, index) => (
                                    <span
                                        key={`${alias.name}-${index}`}
                                        className="px-4 py-2 bg-prussian-dark rounded-lg 
                                                 text-white font-body border border-alabaster/10"
                                        title={alias.locale ? `Locale: ${alias.locale}` : undefined}
                                    >
                                        {alias.name}
                                        {alias.primary && (
                                            <span className="ml-2 text-xs text-orange">Primary</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Genres Section (Future enrichment) */}
                {artist.genres && artist.genres.length > 0 && (
                    <section className="mt-8 opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.3s' }}>
                        <h2 className="text-lg font-display uppercase tracking-wider text-alabaster/70 mb-4">
                            Genres
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {artist.genres.map(genre => (
                                <span
                                    key={genre}
                                    className="px-4 py-2 bg-orange/10 text-orange rounded-lg 
                                             font-display uppercase text-sm tracking-wider
                                             border border-orange/20"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Upcoming Events */}
                <section className="mt-8 opacity-0 animate-fade-up"
                    style={{ animationFillMode: 'forwards', animationDelay: '0.4s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-display uppercase tracking-wider text-alabaster/70">
                            Upcoming Events
                        </h2>

                        {events.length > 0 && (
                            <div className="flex bg-prussian/60 border border-alabaster/10 rounded-lg p-0.5">
                                <button
                                    onClick={() => setEventsView('list')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all
                                              ${eventsView === 'list'
                                            ? 'bg-orange/10 text-orange border border-orange/20'
                                            : 'text-alabaster/50 hover:text-white'
                                        }`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setEventsView('map')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wider transition-all
                                              ${eventsView === 'map'
                                            ? 'bg-orange/10 text-orange border border-orange/20'
                                            : 'text-alabaster/50 hover:text-white'
                                        }`}
                                >
                                    Map
                                </button>
                            </div>
                        )}
                    </div>

                    {eventsLoading && (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-32 bg-prussian/40 rounded animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!eventsLoading && events.length === 0 && (
                        <div className="bg-prussian/30 rounded-xl p-8 border border-alabaster/10 text-center">
                            <div className="text-alabaster/30 mb-3">
                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-alabaster/50 font-body">
                                No upcoming events found for {artist.name}.
                            </p>
                        </div>
                    )}

                    {!eventsLoading && events.length > 0 && eventsView === 'list' && (
                        <div className="space-y-3">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    )}

                    {!eventsLoading && events.length > 0 && eventsView === 'map' && (
                        <EventMap events={events} />
                    )}
                </section>
            </div>
        </div>
    );
}
