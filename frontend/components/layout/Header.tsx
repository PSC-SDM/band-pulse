'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';

export default function Header() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const isAuthenticated = status === 'authenticated';
    const isLoading = status === 'loading';

    // No mostrar header en login/register (tienen su propio layout)
    const hideOnRoutes = ['/login', '/register'];
    if (hideOnRoutes.includes(pathname)) return null;

    return (
        <header className="sticky top-0 z-50 bg-night/90 backdrop-blur-sm border-b border-prussian-light/50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 bg-prussian rounded flex items-center justify-center group-hover:bg-prussian-light transition-colors">
                        <Icon icon="mdi:pulse" className="text-lg text-orange" />
                    </div>
                    <span className="font-display text-sm tracking-wider text-white">
                        BANDPULSE
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-5">
                    {isLoading ? (
                        <div className="h-5 w-20 bg-prussian-light rounded animate-pulse" />
                    ) : isAuthenticated ? (
                        <>
                            {/* Link al dashboard (solo si NO estamos ya en dashboard) */}
                            {!pathname.startsWith('/dashboard') && (
                                <Link
                                    href="/dashboard"
                                    className="font-body text-sm text-alabaster/70 hover:text-white transition-colors"
                                >
                                    Dashboard
                                </Link>
                            )}

                            {/* Email del usuario */}
                            <span className="hidden sm:block font-body text-sm text-alabaster/50">
                                {session?.user?.email}
                            </span>

                            {/* Logout */}
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="font-body text-sm px-4 py-2 rounded bg-prussian-light text-alabaster hover:text-white hover:bg-prussian border border-alabaster/10 hover:border-alabaster/20 transition-colors"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="font-body text-sm text-alabaster hover:text-white transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
