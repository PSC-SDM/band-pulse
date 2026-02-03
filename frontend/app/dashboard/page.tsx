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
                <h2 className="text-2xl font-accent text-white mb-4">
                    Welcome, {session?.user?.name}!
                </h2>
                <p className="text-alabaster/80 font-body">
                    Dashboard content coming soon...
                </p>
            </main>
        </div>
    );
}
