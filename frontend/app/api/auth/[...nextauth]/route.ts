import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // El backend maneja la creación/actualización del usuario
            return true;
        },
        async jwt({ token, account }) {
            if (account) {
                // Primera vez que se logea
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            // En una implementación completa, aquí obtendrías el JWT del backend
            // Por ahora, pasamos la información básica
            if (session.user) {
                (session as any).accessToken = token.accessToken;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
