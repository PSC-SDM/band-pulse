/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.scdn.co',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.googleusercontent.com',
                pathname: '/**',
            },
        ],
    },
    async rewrites() {
        const apiUrl = process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        return {
            // Las rutas BFF (/bff/*) las maneja Next.js directamente (auth, user proxy).
            // Todo /api/* se redirige al backend.
            beforeFiles: [
                {
                    source: '/api/:path*',
                    destination: `${apiUrl}/:path*`,
                },
            ],
        };
    },
};

module.exports = nextConfig;
