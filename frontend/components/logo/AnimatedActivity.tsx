'use client';

import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface AnimatedActivityHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface AnimatedActivityProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

const PATH_VARIANTS: Variants = {
    initial: {
        opacity: 0.71,
        pathLength: 1,
        pathOffset: 0,
    },
    animate: {
        opacity: [0.58, 0.87, 0.79],
        pathLength: [0.67, 0.95, 0.88],
        pathOffset: [1, 0],
        transition: {
            duration: 1.3,
            ease: 'circOut',
            repeat: Infinity,
            repeatType: 'reverse',
        },
    },
};

const AnimatedActivity = forwardRef<AnimatedActivityHandle, AnimatedActivityProps>(
    ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
        const controls = useAnimation();
        const isControlledRef = useRef(false);

        useImperativeHandle(ref, () => {
            isControlledRef.current = true;
            return {
                startAnimation: () => controls.start('animate'),
                stopAnimation: () => controls.start('initial'),
            };
        });

        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (isControlledRef.current) {
                    onMouseEnter?.(e);
                } else {
                    controls.start('animate');
                }
            },
            [controls, onMouseEnter]
        );

        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (isControlledRef.current) {
                    onMouseLeave?.(e);
                } else {
                    controls.start('initial');
                }
            },
            [controls, onMouseLeave]
        );

        return (
            <div
                className={cn('text-orange', className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                <svg
                    fill="none"
                    height={size}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width={size}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <motion.path
                        d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
                        pathLength={1}
                        variants={PATH_VARIANTS}
                        animate={controls}
                        initial="initial"
                    />
                </svg>
            </div>
        );
    }
);

AnimatedActivity.displayName = 'AnimatedActivity';

export { AnimatedActivity };
