'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { searchEvents } from '@/lib/events';
import { EventResponse } from '@/types/event.types';
import EventCard from '@/components/Events/EventCard';

// Dynamic import to avoid SSR issues with Leaflet
const EventExplorerMap = dynamic(
    () => import('@/components/Events/EventExplorerMap'),
    {
        ssr: false,
        loading: () => (
            <div className="h-[500px] w-full bg-prussian-light border border-white/[0.04] flex items-center justify-center relative overflow-hidden"
                style={{ borderRadius: '28px' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" style={{ borderRadius: '28px' }} />
                <div className="text-center relative">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
                    <p className="mt-3 text-alabaster/60 font-body text-sm">Loading map...</p>
                </div>
            </div>
        ),
    }
);

/**
 * Your Pulse - Unified event discovery + location setup.
 *
 * Combines the interactive map explorer with the ability to
 * save the current position as the user's default location.
 *
 * Style Guide: Night bg, Prussian cards, Orange accents.
 */
export default function YourPulsePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [events, setEvents] = useState<EventResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // User's saved location from API
    const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
    const [userRadius, setUserRadius] = useState(50);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // VIP toggle — initialized from user profile's showVipEvents setting
    const [includeVip, setIncludeVip] = useState(false);

    // Current map state (updated by map interactions)
    const currentSearchRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Save location state
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveMessageType, setSaveMessageType] = useState<'success' | 'error'>('success');

    const token = (session as any)?.accessToken as string | undefined;

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Fetch user profile to get saved location + VIP preference
    useEffect(() => {
        if (status !== 'authenticated') return;

        async function fetchUserProfile() {
            try {
                const response = await fetch('/api/user/me');
                if (response.ok) {
                    const data = await response.json();
                    if (data?.location?.coordinates) {
                        setUserPosition([
                            data.location.coordinates[1], // lat
                            data.location.coordinates[0], // lng
                        ]);
                        setUserRadius(data.radiusKm || 50);
                    } else {
                        setUserPosition([40.4168, -3.7038]);
                    }
                    setIncludeVip(data?.notificationPreferences?.showVipEvents ?? false);
                } else {
                    setUserPosition([40.4168, -3.7038]);
                }
            } catch {
                setUserPosition([40.4168, -3.7038]);
            } finally {
                setProfileLoaded(true);
            }
        }

        fetchUserProfile();
    }, [status]);

    // Fetch events for given coordinates
    const fetchEventsForLocation = useCallback(
        async (lat: number, lng: number, radiusKm: number, vip: boolean) => {
            if (!token) return;
            setIsFetching(true);
            setError(null);

            try {
                const data = await searchEvents(token, lng, lat, radiusKm, vip);
                setEvents(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load events');
            } finally {
                setIsFetching(false);
                setIsLoading(false);
            }
        },
        [token]
    );

    // Initial fetch when profile loads
    useEffect(() => {
        if (!profileLoaded || !userPosition || !token) return;
        fetchEventsForLocation(userPosition[0], userPosition[1], userRadius, includeVip);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoaded, userPosition, token, userRadius]);

    // Called when the user moves the pin or changes radius
    const handleLocationChange = useCallback(
        (lat: number, lng: number, radius: number) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            const prev = currentSearchRef.current;
            if (prev && prev.lat === lat && prev.lng === lng && prev.radius === radius) {
                return;
            }

            currentSearchRef.current = { lat, lng, radius };

            debounceTimerRef.current = setTimeout(() => {
                fetchEventsForLocation(lat, lng, radius, includeVip);
            }, 600);
        },
        [fetchEventsForLocation, includeVip]
    );

    // Toggle VIP and immediately re-fetch
    const handleVipToggle = () => {
        const next = !includeVip;
        setIncludeVip(next);
        const current = currentSearchRef.current;
        if (current) {
            fetchEventsForLocation(current.lat, current.lng, current.radius, next);
        }
    };

    // Save current map position as user's default location
    const handleSaveLocation = async () => {
        const current = currentSearchRef.current;
        if (!current) return;

        setSaving(true);
        setSaveMessage('');

        try {
            const response = await fetch('/api/user/location', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    longitude: current.lng,
                    latitude: current.lat,
                    radiusKm: current.radius,
                }),
            });

            if (response.ok) {
                setSaveMessage('Location saved!');
                setSaveMessageType('success');
                setTimeout(() => setSaveMessage(''), 3000);
            } else {
                setSaveMessage('Error saving. Try again.');
                setSaveMessageType('error');
            }
        } catch {
            setSaveMessage('Error saving. Try again.');
            setSaveMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    // Loading
    if (status === 'loading' || (isLoading && !profileLoaded)) {
        return (
            <div className="bg-night min-h-[calc(100vh-73px-65px)]">
                <div className="mx-auto max-w-7xl px-6 py-8">
                    <div className="h-6 w-32 bg-prussian rounded animate-pulse mb-8" />
                    <div className="h-10 w-64 bg-prussian rounded animate-pulse mb-8" />
                    <div className="h-[500px] bg-prussian/60 rounded-lg animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-7xl px-6 py-8">
                {/* Back Navigation */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-alabaster/60 hover:text-white
                             font-body transition-colors mb-8 group
                             opacity-0 animate-fade-in"
                    style={{ animationFillMode: 'forwards' }}
                >
                    <svg
                        className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Dashboard
                </Link>

                {/* Header */}
                <div
                    className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8
                              opacity-0 animate-fade-up"
                    style={{ animationFillMode: 'forwards', animationDelay: '0.1s' }}
                >
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-px w-8 bg-orange" />
                            <span className="font-display text-xs tracking-[0.3em] text-orange uppercase">
                                Your Pulse
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-accent text-white">Discover Concerts</h1>
                        <p className="text-alabaster/50 font-body text-sm mt-2">
                            Move the pin or search a city. Events update automatically.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Fetching indicator */}
                        {isFetching && (
                            <div className="flex items-center gap-2 text-alabaster/50 font-body text-sm">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-orange border-r-transparent" />
                                Searching...
                            </div>
                        )}

                        {/* Save location button */}
                        <button
                            onClick={handleSaveLocation}
                            disabled={saving || !currentSearchRef.current}
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange/10 text-orange
                                     border border-orange/20 font-display uppercase text-sm tracking-wider
                                     hover:bg-orange hover:text-night hover:scale-105
                                     disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                                     transition-all duration-300"
                            style={{ borderRadius: '12px' }}
                        >
                            {saving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                    Save as My Location
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Save feedback message */}
                {saveMessage && (
                    <div
                        className={`mb-6 px-4 py-3 font-body text-sm border transition-all duration-300 ${saveMessageType === 'success'
                                ? 'bg-green-900/20 text-green-400 border-green-500/30'
                                : 'bg-red-900/20 text-red-400 border-red-500/30'
                            }`}
                        style={{ borderRadius: '16px' }}
                    >
                        {saveMessage}
                    </div>
                )}

                {/* Map explorer */}
                {userPosition && (
                    <div
                        className="mb-8 opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}
                    >
                        <EventExplorerMap
                            initialPosition={userPosition}
                            initialRadius={userRadius}
                            events={events}
                            onLocationChange={handleLocationChange}
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        className="bg-prussian/30 p-8 border border-orange/20 text-center mb-8 relative overflow-hidden
                                  opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.3s', borderRadius: '28px' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" style={{ borderRadius: '28px' }} />
                        <div className="relative">
                            <div className="text-orange mb-3">
                                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <p className="text-alabaster/60 font-body">{error}</p>
                            <p className="text-alabaster/40 font-body text-sm mt-2">
                                Make sure you are following at least one artist.
                            </p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!error && !isFetching && !isLoading && events.length === 0 && (
                    <div
                        className="bg-prussian/30 p-12 border border-white/[0.04] text-center relative overflow-hidden
                                  opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.3s', borderRadius: '28px' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" style={{ borderRadius: '28px' }} />
                        <div className="relative">
                            <div className="text-alabaster/20 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-xl font-accent text-white mb-2">No Concerts Found</h2>
                            <p className="text-alabaster/50 font-body max-w-md mx-auto mb-6">
                                No upcoming concerts found in this area. Try increasing the radius or searching a
                                different city.
                            </p>
                            <Link
                                href="/dashboard/artists"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange/10 text-orange border border-orange/20
                                         font-display uppercase text-sm tracking-wider
                                         hover:bg-orange hover:text-night hover:scale-105 transition-all duration-300"
                                style={{ borderRadius: '12px' }}
                            >
                                Follow More Artists
                            </Link>
                        </div>
                    </div>
                )}

                {/* Events list */}
                {!error && events.length > 0 && (
                    <div
                        className="opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards', animationDelay: '0.35s' }}
                    >
                        {/* Stats bar */}
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange rounded-full" />
                                <span className="font-display text-[10px] tracking-[0.2em] text-alabaster/40 uppercase">
                                    {events.length} result{events.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {/* VIP toggle */}
                            <button
                                onClick={handleVipToggle}
                                className={`text-[10px] font-display uppercase tracking-wider px-3 py-1
                                            border transition-colors duration-200 ${
                                                includeVip
                                                    ? 'border-orange/40 text-orange bg-orange/10'
                                                    : 'border-white/10 text-alabaster/40 hover:border-orange/20 hover:text-alabaster/60'
                                            }`}
                                style={{ borderRadius: '8px' }}
                            >
                                VIP &amp; packages
                            </button>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {events.map((event, index) => (
                                <div
                                    key={event.id}
                                    className="opacity-0 animate-fade-up"
                                    style={{
                                        animationFillMode: 'forwards',
                                        animationDelay: `${50 + (index * 80)}ms`,
                                    }}
                                >
                                    <EventCard event={event} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
