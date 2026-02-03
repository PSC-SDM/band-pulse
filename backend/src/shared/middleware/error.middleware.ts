import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export function errorHandler(
    err: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log the error
    logger.error(`${req.method} ${req.path} - ${err.message}`, {
        stack: err.stack,
        statusCode: err.statusCode,
    });

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation error',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Handle known operational errors
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            error: err.message,
        });
        return;
    }

    // Handle unknown errors
    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message;

    res.status(statusCode).json({
        error: message,
    });
}

export class AppError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
