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
        <div className="flex min-h-screen bg-night">
            {/* Left side - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-prussian">
                {/* Background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 -left-20 w-80 h-80 bg-night/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-40 right-10 w-60 h-60 bg-orange/5 rounded-full blur-2xl" />
                    <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none">
                        <line x1="0" y1="100%" x2="100%" y2="0" stroke="#FCA311" strokeWidth="1" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-16">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-orange/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                        <span className="font-display text-sm tracking-wider text-white">BANDPULSE</span>
                    </div>

                    <h2 className="font-accent text-4xl xl:text-5xl text-white leading-[0.95] mb-6">
                        Your live<br />
                        music radar<span className="text-orange">.</span>
                    </h2>

                    <p className="font-body text-lg text-alabaster/70 max-w-md border-l-2 border-alabaster/20 pl-6">
                        Follow your favorite artists and never miss a concert near you again.
                    </p>
                </div>
            </div>

            {/* Right side - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-12">
                        <div className="w-8 h-8 bg-prussian flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                        <span className="font-display text-sm tracking-wider text-white">BANDPULSE</span>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-accent text-white mb-3">
                            Welcome back
                        </h1>
                        <p className="text-alabaster/60 font-body">
                            Sign in to continue to your dashboard
                        </p>
                    </div>

                    {/* Email/Password Login */}
                    <form onSubmit={handleEmailLogin} className="space-y-5 mb-8">
                        <div>
                            <label htmlFor="email" className="block text-xs font-display tracking-wider text-alabaster/60 uppercase mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-prussian/50 text-white border-l-2 border-alabaster/20 
                                         focus:border-orange focus:bg-prussian focus:outline-none font-body
                                         transition-all duration-300"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-display tracking-wider text-alabaster/60 uppercase mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-prussian/50 text-white border-l-2 border-alabaster/20 
                                         focus:border-orange focus:bg-prussian focus:outline-none font-body
                                         transition-all duration-300"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-orange/10 border-l-2 border-orange">
                                <svg className="w-5 h-5 text-orange flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-orange text-sm font-body">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full px-6 py-4 bg-orange text-night font-body font-semibold 
                                     overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign in'}</span>
                            <div className="absolute inset-0 bg-orange-light transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-alabaster/20 to-transparent" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-night text-alabaster/40 font-display text-xs tracking-wider uppercase">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <button
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="group flex w-full items-center justify-center gap-3 px-6 py-4 
                                 bg-white/5 border border-alabaster/10 text-white font-body
                                 hover:bg-white hover:text-night transition-all duration-300"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Links */}
                    <div className="mt-10 pt-8 border-t border-prussian-light/30 text-center space-y-4">
                        <p className="text-sm text-alabaster/50 font-body">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-orange hover:text-orange-light transition-colors">
                                Sign up
                            </Link>
                        </p>
                        <Link 
                            href="/" 
                            className="inline-flex items-center gap-2 text-sm text-alabaster/40 hover:text-white transition-colors font-body"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
