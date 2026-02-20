import { Notification, NotificationPreferences } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

    if (response.status === 401) {
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

export interface UserProfileResponse {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    notificationPreferences?: NotificationPreferences;
}

/**
 * Get the current user's profile (includes notification preferences).
 */
export async function getUserProfile(token: string): Promise<UserProfileResponse> {
    return fetchWithAuth<UserProfileResponse>('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get the current user's notifications (latest 50).
 * @param unreadOnly - If true, only returns unread notifications
 */
export async function getNotifications(
    token: string,
    unreadOnly = false
): Promise<Notification[]> {
    const query = unreadOnly ? '?unread=true' : '';
    return fetchWithAuth<Notification[]>(`/notifications${query}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadCount(token: string): Promise<number> {
    const data = await fetchWithAuth<{ count: number }>('/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data.count;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(token: string, notificationId: string): Promise<void> {
    await fetchWithAuth<void>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Mark all notifications for the current user as read.
 */
export async function markAllAsRead(token: string): Promise<void> {
    await fetchWithAuth<void>('/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
    });
}

/**
 * Update the current user's notification preferences (partial update).
 * Only the provided fields are changed.
 */
export async function updateNotificationPreferences(
    token: string,
    preferences: Partial<NotificationPreferences>
): Promise<UserProfileResponse> {
    return fetchWithAuth<UserProfileResponse>('/users/me/notification-preferences', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(preferences),
    });
}
