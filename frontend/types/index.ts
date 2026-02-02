// ============================================
// User Types
// ============================================

export interface User {
    _id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    provider: 'google';
    providerId: string;
    location?: UserLocation;
    searchRadius: number;
    notificationPreferences: NotificationPreferences;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
}

export interface UserLocation {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    city?: string;
    country?: string;
}

export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    newConcerts: boolean;
    priceDrops: boolean;
    reminderDaysBefore: number;
}

// ============================================
// Artist Types
// ============================================

export interface Artist {
    _id: string;
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres: string[];
    popularity?: number;
    externalUrls: {
        spotify?: string;
        bandsintown?: string;
    };
    lastUpdated: string;
    createdAt: string;
}

export interface ArtistSearchResult {
    spotifyId: string;
    name: string;
    imageUrl?: string;
    genres: string[];
    popularity: number;
    isFollowed?: boolean;
}

// ============================================
// Event Types
// ============================================

export interface Event {
    _id: string;
    bandsintownId: string;
    artistId: string;
    artistName: string;
    title: string;
    datetime: string;
    venue: Venue;
    ticketUrl?: string;
    status: 'confirmed' | 'cancelled' | 'postponed';
    onSaleDate?: string;
    offers?: TicketOffer[];
    lastUpdated: string;
    createdAt: string;
}

export interface Venue {
    name: string;
    city: string;
    region?: string;
    country: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
}

export interface TicketOffer {
    type: string;
    url: string;
    status: string;
}

export interface EventWithDistance extends Event {
    distance: number; // Distance in km from user's location
}

// ============================================
// Follow Types
// ============================================

export interface Follow {
    _id: string;
    userId: string;
    artistId: string;
    createdAt: string;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
    _id: string;
    userId: string;
    type: 'new_concert' | 'concert_reminder' | 'price_drop' | 'status_change';
    eventId?: string;
    artistId?: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ApiError {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}

// ============================================
// Auth Types
// ============================================

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginResponse {
    user: User;
    token: string;
}
