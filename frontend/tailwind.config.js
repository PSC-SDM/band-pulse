/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Official BandPulse Palette - Style Guide Compliant
                'night': '#000000',
                'prussian': {
                    DEFAULT: '#14213D',
                    light: '#1C2D4F',
                    dark: '#0E1729',
                },
                'alabaster': {
                    DEFAULT: '#E5E5E5',
                    light: '#F2F2F2',
                    dark: '#D4D4D4',
                },
                'orange': {
                    DEFAULT: '#FCA311',
                    light: '#FDBA4B',
                    dark: '#D18A0D',
                },
            },
            fontFamily: {
                display: ['"Space Mono"', 'monospace'],
                body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
                accent: ['"Archivo Black"', 'Impact', 'sans-serif'],
            },
            animation: {
                'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'slide-in': 'slide-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'stagger': 'stagger 0.6s ease-out forwards',
                'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
            },
            keyframes: {
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(32px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-in': {
                    '0%': { opacity: '0', transform: 'translateX(-24px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                'stagger': {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'pulse-subtle': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
            },
        },
    },
    plugins: [],
};
