import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_URL = process.env.API_URL_INTERNAL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const authOptions: NextAuthOptions = {
    providers: [
        // Email/Password login a través del backend
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const response = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Invalid credentials');
                    }

                    // Devolver usuario con el token del backend
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.name,
                        image: data.user.avatar,
                        backendToken: data.token,
                    };
                } catch (error) {
                    throw new Error(error instanceof Error ? error.message : 'Login failed');
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                // Sincronizar usuario de Google con el backend y obtener JWT
                try {
                    const response = await fetch(`${API_URL}/auth/social`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.name,
                            avatar: user.image,
                            provider: 'google',
                            providerId: account.providerAccountId,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Guardar el token del backend en el objeto user para usarlo en jwt callback
                        (user as any).backendToken = data.token;
                        (user as any).backendUserId = data.user.id;
                    }
                } catch (error) {
                    console.error('Error syncing Google user with backend:', error);
                    // Permitir login aunque falle el sync (experiencia degradada)
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            // Primera vez que se logea (tanto credentials como Google)
            if (user) {
                token.backendToken = (user as any).backendToken;
                token.backendUserId = (user as any).backendUserId || (user as any).id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session as any).accessToken = token.backendToken;
                (session as any).userId = token.backendUserId;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
