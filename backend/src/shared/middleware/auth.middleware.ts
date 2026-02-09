import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/jwt';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
    };
}

export function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
