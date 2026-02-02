const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
    data?: unknown;
}

class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public data?: unknown
    ) {
        super(`API Error: ${status} ${statusText}`);
        this.name = 'ApiError';
    }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { data, ...fetchOptions } = options;

    const config: RequestInit = {
        ...fetchOptions,
        headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        },
        credentials: 'include', // Include cookies for auth
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(response.status, response.statusText, errorData);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
        return {} as T;
    }

    return JSON.parse(text);
}

export const api = {
    get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return request<T>(endpoint, { ...options, method: 'GET' });
    },

    post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>(endpoint, { ...options, method: 'POST', data });
    },

    put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>(endpoint, { ...options, method: 'PUT', data });
    },

    patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
        return request<T>(endpoint, { ...options, method: 'PATCH', data });
    },

    delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return request<T>(endpoint, { ...options, method: 'DELETE' });
    },
};

export { ApiError };
