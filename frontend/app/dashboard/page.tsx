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
            <div className="mx-auto max-w-7xl px-6 py-10 md:py-14">

                {/* Top bar: greeting + status */}
                <div className="flex items-center justify-between mb-10 opacity-0 animate-fade-up">
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-orange/60" />
                        <span className="font-body text-sm text-alabaster/50">
                            Hi, <span className="text-alabaster/80">{session?.user?.name || 'Music Fan'}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500/80 rounded-full animate-pulse" />
                        <span className="font-display text-xs tracking-[0.2em] text-alabaster/40 uppercase">Radar active</span>
                    </div>
                </div>

                {/* Hero: Your Bands + Your Pulse */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">

                    {/* YOUR BANDS */}
                    <a
                        href="/dashboard/artists"
                        className="group relative overflow-hidden bg-prussian/80 backdrop-blur-sm
                                   border-l-2 border-orange p-8 md:p-10
                                   hover:bg-prussian transition-all duration-500
                                   opacity-0 animate-fade-up stagger-1"
                    >
                        {/* Decorative background */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-orange/5 rotate-45
                                          group-hover:bg-orange/8 transition-colors duration-700" />
                            <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-orange/20 via-transparent to-transparent" />
                        </div>

                        <div className="relative">
                            {/* Label */}
                            <div className="flex items-center gap-2 mb-6">
                                <span className="font-display text-xs tracking-[0.3em] text-orange uppercase">Your Bands</span>
                                <div className="flex-1 h-px bg-orange/20" />
                            </div>

                            {/* Icon */}
                            <div className="w-12 h-12 bg-orange/10 flex items-center justify-center mb-6
                                          group-hover:bg-orange/20 transition-colors duration-300">
                                <Icon icon="mdi:account-music" className="text-2xl text-orange" />
                            </div>

                            {/* Copy */}
                            <h2 className="text-3xl md:text-4xl font-accent text-white leading-tight mb-3
                                         group-hover:text-orange transition-colors duration-300">
                                Follow artists.<br />
                                <span className="text-alabaster/70 group-hover:text-orange/70">Fuel your radar.</span>
                            </h2>
                            <p className="font-body text-alabaster/50 leading-relaxed mb-8 max-w-sm">
                                Every artist you follow feeds your pulse. The more you follow, the sharper your radar gets.
                            </p>

                            {/* CTA */}
                            <div className="flex items-center gap-3">
                                <span className="font-display text-xs tracking-[0.2em] text-orange uppercase">
                                    Manage Bands
                                </span>
                                <Icon icon="mdi:arrow-right"
                                    className="text-orange group-hover:translate-x-2 transition-transform duration-300" />
                            </div>
                        </div>

                        {/* Bottom progress bar */}
                        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-orange to-transparent opacity-30
                                      group-hover:opacity-60 transition-opacity duration-500" />
                    </a>

                    {/* YOUR PULSE */}
                    <a
                        href="/dashboard/your-pulse"
                        className="group relative overflow-hidden bg-prussian/60 backdrop-blur-sm
                                   border-l-2 border-transparent hover:border-orange p-8 md:p-10
                                   transition-all duration-500
                                   opacity-0 animate-fade-up stagger-2"
                    >
                        {/* Animated pulse rings (decorative) */}
                        <div className="absolute right-8 top-8 pointer-events-none">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border border-orange/10 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-2 border border-orange/15 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                                <div className="absolute inset-4 border border-orange/20 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                                <div className="absolute inset-6 bg-orange/30 rounded-full" />
                            </div>
                        </div>

                        <div className="relative">
                            {/* Label */}
                            <div className="flex items-center gap-2 mb-6">
                                <span className="font-display text-xs tracking-[0.3em] text-alabaster/50 uppercase group-hover:text-orange transition-colors duration-300">Your Pulse</span>
                                <div className="flex-1 h-px bg-alabaster/10 group-hover:bg-orange/20 transition-colors duration-300" />
                            </div>

                            {/* Icon */}
                            <div className="w-12 h-12 bg-night/60 flex items-center justify-center mb-6
                                          group-hover:bg-orange/10 transition-colors duration-300">
                                <Icon icon="mdi:map-marker-radius" className="text-2xl text-alabaster/50 group-hover:text-orange transition-colors duration-300" />
                            </div>

                            {/* Copy */}
                            <h2 className="text-3xl md:text-4xl font-accent text-white leading-tight mb-3">
                                Your concerts.<br />
                                <span className="text-orange">Your zone.</span>
                            </h2>
                            <p className="font-body text-alabaster/50 leading-relaxed mb-8 max-w-sm">
                                Set your location and discover live shows from the artists you follow, right where you are.
                            </p>

                            {/* CTA */}
                            <div className="flex items-center gap-3">
                                <span className="font-display text-xs tracking-[0.2em] text-alabaster/50 uppercase
                                               group-hover:text-orange transition-colors duration-300">
                                    Check Your Pulse
                                </span>
                                <Icon icon="mdi:arrow-right"
                                    className="text-alabaster/50 group-hover:text-orange group-hover:translate-x-2 transition-all duration-300" />
                            </div>
                        </div>

                        {/* Bottom progress bar */}
                        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-700" />
                    </a>
                </div>

                {/* Secondary row: Explore + Notifications */}
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                    <a
                        href="/dashboard/explore"
                        className="group relative overflow-hidden bg-prussian/30 backdrop-blur-sm p-5 md:p-6
                                   border-l-2 border-transparent hover:border-orange/60
                                   transition-all duration-400 opacity-0 animate-fade-up stagger-3"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-night/40 flex items-center justify-center flex-shrink-0
                                          group-hover:bg-orange/10 transition-colors duration-300">
                                <Icon icon="mdi:compass-outline" className="text-lg text-alabaster/40 group-hover:text-orange transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-accent text-base text-alabaster/70 group-hover:text-white transition-colors">
                                        Explore All Concerts
                                    </h3>
                                    <Icon icon="mdi:chevron-right"
                                        className="text-base text-alabaster/30 group-hover:text-orange group-hover:translate-x-1 transition-all flex-shrink-0" />
                                </div>
                                <p className="font-body text-xs text-alabaster/40 mt-0.5">
                                    Browse all upcoming shows in any area
                                </p>
                            </div>
                        </div>
                    </a>

                    <a
                        href="/dashboard/settings"
                        className="group relative overflow-hidden bg-prussian/20 backdrop-blur-sm p-5 md:p-6
                                   border-l-2 border-transparent hover:border-alabaster/30
                                   transition-all duration-400 opacity-0 animate-fade-up stagger-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-night/40 flex items-center justify-center flex-shrink-0
                                          group-hover:bg-night/60 transition-colors duration-300">
                                <Icon icon="mdi:bell-outline" className="text-lg text-alabaster/30 group-hover:text-alabaster/60 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-accent text-base text-alabaster/50 group-hover:text-alabaster/80 transition-colors">
                                        Notification Settings
                                    </h3>
                                    <Icon icon="mdi:chevron-right"
                                        className="text-base text-alabaster/20 group-hover:text-alabaster/50 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                </div>
                                <p className="font-body text-xs text-alabaster/30 mt-0.5">
                                    Configure how you get notified
                                </p>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
