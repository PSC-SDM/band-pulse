'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@iconify/react';

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
            <div className="flex min-h-[60vh] items-center justify-center bg-night">
                <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto">
                        <div className="absolute inset-0 border-2 border-orange/20 rounded-full" />
                        <div className="absolute inset-0 border-2 border-transparent border-t-orange rounded-full animate-spin" />
                    </div>
                    <p className="mt-6 text-alabaster/60 font-body text-sm tracking-wide">Loading your radar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-7xl px-6 py-12">
                {/* Header with dynamic greeting */}
                <div className="mb-12 opacity-0 animate-fade-up">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px w-8 bg-orange" />
                        <span className="font-display text-xs tracking-[0.3em] text-orange uppercase">Dashboard</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-accent text-white leading-tight">
                        Welcome back,<br />
                        <span className="text-alabaster/70">{session?.user?.name || 'Music Fan'}</span>
                    </h1>
                </div>

                {/* Action Grid - Asymmetric layout */}
                <div className="grid md:grid-cols-12 gap-4 md:gap-6">
                    {/* Artists - Large card */}
                    <a
                        href="/dashboard/artists"
                        className="group md:col-span-7 relative overflow-hidden bg-prussian/80 backdrop-blur-sm p-8 md:p-10
                                   border-l-2 border-transparent hover:border-orange
                                   transition-all duration-500 opacity-0 animate-fade-up stagger-1"
                    >
                        {/* Background accent */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute -right-32 -top-32 w-64 h-64 bg-orange/5 rotate-45" />
                            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-prussian-light/30 rounded-full blur-2xl" />
                        </div>

                        <div className="relative">
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-14 h-14 bg-night/60 flex items-center justify-center
                                              group-hover:bg-orange/10 transition-colors duration-300">
                                    <Icon icon="mdi:account-music" className="text-2xl text-alabaster/60 group-hover:text-orange transition-colors" />
                                </div>
                                <Icon icon="mdi:arrow-right" className="text-xl text-alabaster/30 group-hover:text-orange group-hover:translate-x-2 transition-all duration-300" />
                            </div>

                            <h3 className="text-2xl md:text-3xl font-accent text-white mb-3 group-hover:text-orange transition-colors duration-300">
                                Artists
                            </h3>
                            <p className="text-alabaster/60 font-body leading-relaxed max-w-md">
                                Search and follow your favorite artists to discover their concerts. Build your personal music radar.
                            </p>

                            {/* Stats placeholder */}
                            <div className="mt-8 pt-6 border-t border-alabaster/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange/50 rounded-full" />
                                    <span className="font-display text-xs tracking-wider text-alabaster/40 uppercase">
                                        Start following artists
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom progress bar */}
                        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-700" />
                    </a>

                    {/* Right column - Stacked cards */}
                    <div className="md:col-span-5 flex flex-col gap-4 md:gap-6">
                        {/* Your Pulse card */}
                        <a
                            href="/dashboard/your-pulse"
                            className="group relative overflow-hidden bg-prussian/70 backdrop-blur-sm p-6 md:p-8
                                       border-l-2 border-transparent hover:border-orange
                                       transition-all duration-500 opacity-0 animate-fade-up stagger-2"
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute -right-16 -top-16 w-32 h-32 bg-orange/5 rotate-12" />
                            </div>

                            <div className="relative flex items-start gap-5">
                                <div className="w-12 h-12 bg-night/60 flex items-center justify-center flex-shrink-0
                                              group-hover:bg-orange/10 transition-colors duration-300">
                                    <Icon icon="mdi:map-marker-radius" className="text-xl text-alabaster/60 group-hover:text-orange transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-accent text-white group-hover:text-orange transition-colors">
                                            Your Pulse
                                        </h3>
                                        <Icon icon="mdi:chevron-right" className="text-lg text-alabaster/30 group-hover:text-orange group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <p className="text-sm text-alabaster/50 font-body">
                                        Discover concerts on the map, set your location, and explore events near you
                                    </p>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-500" />
                        </a>

                        {/* Explore card */}
                        <a
                            href="/dashboard/explore"
                            className="group relative overflow-hidden bg-prussian/60 backdrop-blur-sm p-6 md:p-8
                                       border-l-2 border-transparent hover:border-orange
                                       transition-all duration-500 opacity-0 animate-fade-up stagger-3"
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-orange/5 rotate-12" />
                            </div>

                            <div className="relative flex items-start gap-5">
                                <div className="w-12 h-12 bg-night/60 flex items-center justify-center flex-shrink-0
                                              group-hover:bg-orange/10 transition-colors duration-300">
                                    <Icon icon="mdi:compass-outline" className="text-xl text-alabaster/60 group-hover:text-orange transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-accent text-white group-hover:text-orange transition-colors">
                                            Explore
                                        </h3>
                                        <Icon icon="mdi:chevron-right" className="text-lg text-alabaster/30 group-hover:text-orange group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <p className="text-sm text-alabaster/50 font-body">
                                        Browse all upcoming concerts in any area, from any artist
                                    </p>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-500" />
                        </a>

                        {/* Notifications card */}
                        <a
                            href="/dashboard/settings"
                            className="group relative overflow-hidden bg-prussian/40 backdrop-blur-sm p-6 md:p-8
                                       border-l-2 border-transparent hover:border-alabaster/30
                                       transition-all duration-500 opacity-0 animate-fade-up stagger-4"
                        >
                            <div className="relative flex items-start gap-5">
                                <div className="w-12 h-12 bg-night/40 flex items-center justify-center flex-shrink-0
                                              group-hover:bg-night/60 transition-colors duration-300">
                                    <Icon icon="mdi:bell-outline" className="text-xl text-alabaster/40 group-hover:text-alabaster/70 transition-colors" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-accent text-alabaster/70 group-hover:text-white transition-colors">
                                            Notifications
                                        </h3>
                                        <Icon icon="mdi:chevron-right" className="text-lg text-alabaster/20 group-hover:text-alabaster/50 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <p className="text-sm text-alabaster/40 font-body">
                                        Configure how you want to be notified about concerts
                                    </p>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>

                {/* Quick stats or recent activity section */}
                <div className="mt-12 pt-8 border-t border-prussian-light/30 opacity-0 animate-fade-up stagger-4">
                    <div className="flex items-center justify-between">
                        <p className="font-display text-xs tracking-[0.2em] text-alabaster/40 uppercase">
                            Your music radar is active
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500/80 rounded-full animate-pulse" />
                            <span className="font-body text-xs text-alabaster/40">Monitoring</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
