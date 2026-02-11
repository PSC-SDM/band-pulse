import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env';

export interface JWTPayload {
    userId: string;
    email: string;
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}
