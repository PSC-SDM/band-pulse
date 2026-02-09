'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-night">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
                    <p className="mt-4 text-alabaster font-body">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-night">
            <nav className="bg-prussian-blue border-b border-alabaster/10">
                <div className="mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-accent text-white">BandPulse</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-alabaster/80 font-body">{session?.user?.email}</span>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="rounded px-4 py-2 bg-orange text-night font-body font-semibold hover:bg-orange/90 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-8">
                <h2 className="text-2xl font-accent text-white mb-6">
                    Welcome, {session?.user?.name}!
                </h2>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Card de ubicación */}
                    <a
                        href="/dashboard/settings/location"
                        className="group block p-6 bg-prussian rounded-xl border border-alabaster/10 hover:border-orange/50 transition-all duration-300"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-orange/10 rounded-full flex items-center justify-center group-hover:bg-orange/20 transition-colors">
                                <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-accent text-white group-hover:text-orange transition-colors">
                                Set Location
                            </h3>
                        </div>
                        <p className="text-alabaster/60 text-sm font-body">
                            Choose your location and search radius to discover concerts near you
                        </p>
                    </a>
                </div>
            </main>
        </div>
    );
}
