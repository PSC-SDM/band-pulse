'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
                return;
            }

            // Login exitoso, redirigir al dashboard
            router.push('/dashboard');
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-night">
            <div className="w-full max-w-md rounded-lg bg-prussian p-8 shadow-2xl border border-alabaster/10">
                <h1 className="mb-2 text-center text-3xl font-accent text-white">
                    BandPulse
                </h1>
                <p className="mb-8 text-center text-alabaster/80 font-body">
                    Never miss a concert again
                </p>

                {/* Email/Password Login */}
                <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-body text-alabaster/80 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-night text-white border border-alabaster/20 focus:border-orange focus:outline-none font-body"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-body text-alabaster/80 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 rounded-lg bg-night text-white border border-alabaster/20 focus:border-orange focus:outline-none font-body"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-orange text-sm font-body flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 rounded-lg bg-orange text-night font-body font-semibold hover:bg-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-alabaster/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-prussian text-alabaster/60 font-body">Or continue with</span>
                    </div>
                </div>

                {/* Google OAuth */}
                <button
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-body font-semibold text-night hover:bg-alabaster transition-colors"
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>

                {/* Links */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-sm text-alabaster/60 font-body">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-orange hover:text-orange/80 transition-colors">
                            Sign up
                        </Link>
                    </p>
                    <Link href="/" className="block text-sm text-alabaster/60 hover:text-alabaster transition-colors font-body">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
