import { EventResponse } from '@/types/event.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Event API client.
 * All requests require authentication via session token.
 */

async function fetchWithAuth<T>(
    endpoint: string,
    token: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
        credentials: 'include',
    });

    if (response.status === 401) {
        // Token expired or invalid — sign out and redirect to login
        if (typeof window !== 'undefined') {
            window.location.href = '/api/auth/signout?callbackUrl=' + encodeURIComponent('/login');
        }
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Get events near the authenticated user's location.
 * Filtered by followed artists.
 */
export async function getEventsNearMe(token: string): Promise<EventResponse[]> {
    return fetchWithAuth<EventResponse[]>('/events/near-me', token);
}

/**
 * Search events by explicit coordinates and radius.
 * Filtered by the user's followed artists.
 */
export async function searchEvents(
    token: string,
    lng: number,
    lat: number,
    radiusKm: number
): Promise<EventResponse[]> {
    return fetchWithAuth<EventResponse[]>(
        `/events/search?lng=${lng}&lat=${lat}&radiusKm=${radiusKm}`,
        token
    );
}

/**
 * Explore all music events in an area (no artist filter).
 */
export async function exploreEvents(
    token: string,
    lng: number,
    lat: number,
    radiusKm: number
): Promise<EventResponse[]> {
    return fetchWithAuth<EventResponse[]>(
        `/events/explore?lng=${lng}&lat=${lat}&radiusKm=${radiusKm}`,
        token
    );
}

/**
 * Get upcoming events for a specific artist.
 */
export async function getArtistEvents(
    artistId: string,
    token: string
): Promise<EventResponse[]> {
    return fetchWithAuth<EventResponse[]>(`/events/artist/${artistId}`, token);
}
