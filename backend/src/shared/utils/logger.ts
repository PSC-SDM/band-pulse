import winston from 'winston';
import { env } from '../../config/env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true })
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            ),
        }),
    ],
});

// Add file transport in production
if (env.NODE_ENV === 'production') {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), winston.format.json()),
        })
    );
    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: combine(timestamp(), winston.format.json()),
        })
    );
}
