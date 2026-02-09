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
            // fallback: solo se aplica si ninguna ruta de Next.js (API routes, pages) coincide.
            // Esto evita que intercepte /api/auth/* (NextAuth) y /api/user/* (nuestras API routes).
            fallback: [
                {
                    source: '/api/:path*',
                    destination: `${apiUrl}/:path*`,
                },
            ],
        };
    },
};

module.exports = nextConfig;
