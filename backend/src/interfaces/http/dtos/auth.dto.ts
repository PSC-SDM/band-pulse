/**
 * Auth response DTO.
 */
export interface AuthResponse {
    token: string;
    user: UserResponse;
}

/**
 * User data in auth responses.
 */
export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}
