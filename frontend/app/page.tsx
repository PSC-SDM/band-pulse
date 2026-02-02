'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function Home() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-deep-space-950">
            {/* Animated background gradients */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-glow" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-apricot-500/20 rounded-full blur-[120px] animate-pulse-glow"
                    style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-deep-space-600/30 rounded-full blur-[100px] animate-pulse-glow"
                    style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Diagonal accent line */}
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-cyan-500 via-apricot-500 to-transparent opacity-40 transform rotate-12 origin-top-right" />

            <div className="relative z-10 flex min-h-screen flex-col">
                {/* Header */}
                <header className="px-6 py-6 md:px-12 animate-slide-up">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-apricot-500 rounded-lg border-glow-cyan flex items-center justify-center">
                                <Icon icon="mdi:guitar-electric" className="text-3xl text-deep-space-950" />
                            </div>
                            <span className="font-display text-2xl text-cyan-400 tracking-tight">BANDPULSE</span>
                        </div>
                        <Link
                            href="/login"
                            className="px-6 py-2 border-2 border-cyan-500 text-cyan-400 font-button font-semibold hover:bg-cyan-500 hover:text-deep-space-950 transition-all duration-300 border-glow-cyan tracking-wide"
                        >
                            Sign In
                        </Link>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="flex-1 flex items-center px-6 md:px-12 pb-20">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left Column - Main Content */}
                            <div className="space-y-8 animate-slide-in">
                                <div className="space-y-4">
                                    <h1 className="font-display text-7xl md:text-8xl lg:text-9xl leading-none text-cyan-400 text-glow-cyan uppercase tracking-tighter">
                                        NEVER<br />
                                        MISS A<br />
                                        SHOW
                                    </h1>
                                    <div className="h-1 w-32 bg-gradient-to-r from-apricot-500 to-transparent border-glow-apricot" />
                                </div>

                                <p className="font-body text-xl md:text-2xl text-ash-200 leading-relaxed max-w-xl">
                                    Track your favorite bands. Get instant alerts when they announce tours near you.
                                    From underground gigs to stadium shows — <span className="text-apricot-400 font-semibold">all in one place</span>.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Link
                                        href="/login"
                                        className="group px-10 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-deep-space-950 font-button font-bold text-lg hover:from-cyan-400 hover:to-cyan-500 transition-all duration-300 border-glow-cyan relative overflow-hidden tracking-wide"
                                    >
                                        <span className="relative z-10">START TRACKING</span>
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </Link>
                                    <button className="px-10 py-4 border-2 border-ash-600 text-ash-200 font-button font-semibold text-lg hover:border-ash-400 hover:text-ash-100 transition-all duration-300 tracking-wide">
                                        HOW IT WORKS
                                    </button>
                                </div>

                                <p className="text-ash-500 text-sm font-body">
                                    Free forever • No credit card required
                                </p>
                            </div>

                            {/* Right Column - Feature Cards */}
                            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                {/* Card 1 */}
                                <div className="group bg-deep-space-900/80 backdrop-blur-sm border-l-4 border-cyan-500 p-6 hover:bg-deep-space-800/80 transition-all duration-300 hover:translate-x-2">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 group-hover:border-glow-cyan transition-all">
                                            <Icon icon="mdi:target" className="text-3xl text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-display text-2xl text-cyan-400 mb-2 uppercase tracking-tight">FOLLOW ARTISTS</h3>
                                            <p className="font-body text-ash-300 leading-relaxed">
                                                Add your favorite bands and we'll monitor their every move — new tour dates, venue changes, everything.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2 */}
                                <div className="group bg-deep-space-900/80 backdrop-blur-sm border-l-4 border-apricot-500 p-6 hover:bg-deep-space-800/80 transition-all duration-300 hover:translate-x-2"
                                    style={{ animationDelay: '0.4s' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-apricot-500/20 flex items-center justify-center border border-apricot-500/50 group-hover:border-glow-apricot transition-all">
                                            <Icon icon="mdi:map-marker-radius" className="text-3xl text-apricot-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-display text-2xl text-apricot-400 mb-2 uppercase tracking-tight">SET YOUR RADIUS</h3>
                                            <p className="font-body text-ash-300 leading-relaxed">
                                                Drop a pin, set your range. We'll only notify you about shows you can actually get to.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3 */}
                                <div className="group bg-deep-space-900/80 backdrop-blur-sm border-l-4 border-deep-space-500 p-6 hover:bg-deep-space-800/80 transition-all duration-300 hover:translate-x-2"
                                    style={{ animationDelay: '0.5s' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-deep-space-500/20 flex items-center justify-center border border-deep-space-500/50">
                                            <Icon icon="mdi:bell-ring" className="text-3xl text-deep-space-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-display text-2xl text-deep-space-400 mb-2 uppercase tracking-tight">INSTANT ALERTS</h3>
                                            <p className="font-body text-ash-300 leading-relaxed">
                                                The second a show drops, you'll know. Beat the bots, grab your tickets, secure the spot.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="px-6 py-6 border-t border-deep-space-800">
                    <div className="max-w-7xl mx-auto flex justify-between items-center text-ash-600 font-body text-sm">
                        <p>© 2026 BandPulse. Built for the live music obsessed.</p>
                        <div className="flex gap-6">
                            <button className="hover:text-cyan-400 transition-colors">Privacy</button>
                            <button className="hover:text-cyan-400 transition-colors">Terms</button>
                            <button className="hover:text-cyan-400 transition-colors">Contact</button>
                        </div>
                    </div>
                </footer>
            </div>
        </main>
    );
}
