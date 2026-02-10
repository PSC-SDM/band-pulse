import { Artist, FollowResponse, UnfollowResponse } from '@/types/artist.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Artist API client.
 * All requests require authentication via session token.
 */

async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Search artists by name.
 * Implements lazy-loading: checks cache first, then MusicBrainz.
 */
export async function searchArtists(
    query: string,
    token: string,
    limit: number = 10
): Promise<Artist[]> {
    return fetchWithAuth<Artist[]>(
        `/artists/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
}

/**
 * Get artists followed by the current user.
 */
export async function getFollowedArtists(token: string): Promise<Artist[]> {
    return fetchWithAuth<Artist[]>('/artists', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Get a specific artist by ID.
 */
export async function getArtistById(id: string, token: string): Promise<Artist> {
    return fetchWithAuth<Artist>(`/artists/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Follow an artist.
 */
export async function followArtist(
    artistId: string,
    token: string
): Promise<FollowResponse> {
    return fetchWithAuth<FollowResponse>(`/artists/${artistId}/follow`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Unfollow an artist.
 */
export async function unfollowArtist(
    artistId: string,
    token: string
): Promise<UnfollowResponse> {
    return fetchWithAuth<UnfollowResponse>(`/artists/${artistId}/follow`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
