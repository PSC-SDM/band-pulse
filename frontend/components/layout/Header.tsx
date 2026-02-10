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
        <header className="sticky top-0 z-50 bg-night/95 backdrop-blur-md border-b border-prussian-light/30">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9 bg-prussian flex items-center justify-center overflow-hidden
                                  group-hover:bg-prussian-light transition-colors duration-300">
                        <Icon icon="mdi:pulse" className="text-lg text-orange relative z-10" />
                        {/* Hover effect */}
                        <div className="absolute bottom-0 left-0 w-full h-0 bg-orange/10 group-hover:h-full transition-all duration-300" />
                    </div>
                    <span className="font-display text-sm tracking-[0.15em] text-white">
                        BANDPULSE
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-6">
                    {isLoading ? (
                        <div className="h-5 w-20 bg-prussian-light/50 animate-pulse" />
                    ) : isAuthenticated ? (
                        <>
                            {/* Link al dashboard (solo si NO estamos ya en dashboard) */}
                            {!pathname.startsWith('/dashboard') && (
                                <Link
                                    href="/dashboard"
                                    className="group flex items-center gap-2 font-body text-sm text-alabaster/70 hover:text-white transition-colors"
                                >
                                    <span>Dashboard</span>
                                    <div className="w-0 h-px bg-orange group-hover:w-4 transition-all duration-300" />
                                </Link>
                            )}

                            {/* Email del usuario */}
                            <span className="hidden sm:block font-body text-xs text-alabaster/40 border-l border-prussian-light/50 pl-6">
                                {session?.user?.email}
                            </span>

                            {/* Logout */}
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="group flex items-center gap-2 font-body text-sm px-4 py-2 
                                         bg-prussian/50 text-alabaster/70 border-l-2 border-transparent
                                         hover:text-white hover:border-orange hover:bg-prussian
                                         transition-all duration-300"
                            >
                                <span>Logout</span>
                                <Icon icon="mdi:logout" className="text-base opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="group flex items-center gap-2 font-body text-sm text-alabaster hover:text-orange transition-colors"
                        >
                            <span>Sign in</span>
                            <Icon icon="mdi:arrow-right" className="text-base opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
