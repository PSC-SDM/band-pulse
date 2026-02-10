'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';

export default function Home() {
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';

    return (
        <div className="bg-night overflow-hidden">
            {/* Hero Section - Asymmetric Layout */}
            <section className="relative min-h-[calc(100vh-73px)] grain-overlay">
                {/* Background Elements - Dynamic shapes */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-20 -right-32 w-[600px] h-[600px] bg-prussian/30 rounded-full blur-3xl animate-float" />
                    <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] bg-prussian/20 rounded-full blur-2xl" />
                    {/* Diagonal line accent */}
                    <svg className="absolute top-0 right-0 w-full h-full opacity-5" preserveAspectRatio="none">
                        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#FCA311" strokeWidth="1" />
                        <line x1="80%" y1="0" x2="0" y2="80%" stroke="#E5E5E5" strokeWidth="0.5" />
                    </svg>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        {/* Left: Core Message - Offset positioning */}
                        <div className="lg:col-span-7 space-y-10 opacity-0 animate-fade-up">
                            {/* Eyebrow with accent */}
                            <div className="flex items-center gap-4">
                                <div className="h-px w-12 bg-orange" />
                                <p className="font-display text-xs tracking-[0.4em] text-alabaster/80 uppercase">
                                    Your live music radar
                                </p>
                            </div>

                            {/* Headline - Staggered, dynamic typography */}
                            <div className="space-y-2">
                                <h1 className="font-accent text-5xl md:text-7xl lg:text-8xl text-white leading-[0.9] tracking-tight">
                                    Follow once.
                                </h1>
                                <h1 className="font-accent text-5xl md:text-7xl lg:text-8xl text-alabaster/60 leading-[0.9] tracking-tight lg:translate-x-8">
                                    Never miss
                                </h1>
                                <div className="flex items-baseline gap-4">
                                    <h1 className="font-accent text-5xl md:text-7xl lg:text-8xl text-white leading-[0.9] tracking-tight">
                                        a show
                                    </h1>
                                    <span className="text-orange text-6xl md:text-8xl lg:text-9xl leading-none">.</span>
                                </div>
                            </div>

                            <p className="font-body text-lg md:text-xl text-alabaster/80 leading-relaxed max-w-lg border-l-2 border-alabaster/20 pl-6">
                                BandPulse watches the live music scene so you don&apos;t have to.
                                Add your favorite artists and we&apos;ll tap you on the shoulder
                                when something matters.
                            </p>

                            {/* CTAs - Asymmetric layout */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href={isAuthenticated ? '/dashboard' : '/register'}
                                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-orange text-night font-body font-semibold overflow-hidden transition-all hover:pr-12"
                                >
                                    <span className="relative z-10">
                                        {isAuthenticated ? 'Go to Dashboard' : 'Start tracking'}
                                    </span>
                                    <Icon 
                                        icon="mdi:arrow-right" 
                                        className="absolute right-4 text-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" 
                                    />
                                    <div className="absolute inset-0 bg-orange-light transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-body hover:text-orange transition-colors"
                                >
                                    <span>How it works</span>
                                    <Icon icon="mdi:chevron-down" className="text-lg group-hover:translate-y-1 transition-transform" />
                                </Link>
                            </div>

                            <p className="font-display text-xs tracking-wider text-alabaster/40 uppercase">
                                Free to use · No credit card required
                            </p>
                        </div>

                        {/* Right: Visual Element - Stacked, dynamic notifications */}
                        <div className="hidden lg:block lg:col-span-5 opacity-0 animate-slide-in-right stagger-2">
                            <div className="relative">
                                {/* Floating notification stack */}
                                <div className="relative space-y-3">
                                    <NotificationPulse
                                        type="new"
                                        artist="Radiohead"
                                        message="New tour announced · 12 dates in Europe"
                                        time="Just now"
                                        className="transform rotate-[-1deg] hover:rotate-0 transition-transform"
                                    />
                                    <NotificationPulse
                                        type="reminder"
                                        artist="The National"
                                        message="Concert in Barcelona · 3 days away"
                                        time="2h ago"
                                        className="transform translate-x-6 rotate-[0.5deg] hover:rotate-0 transition-transform"
                                    />
                                    <NotificationPulse
                                        type="alert"
                                        artist="Arcade Fire"
                                        message="New date added near you · Madrid"
                                        time="Yesterday"
                                        className="transform translate-x-3 rotate-[-0.5deg] hover:rotate-0 transition-transform"
                                    />
                                </div>

                                {/* Decorative elements */}
                                <div className="absolute -top-8 -right-8 w-16 h-16 border border-alabaster/10 transform rotate-45" />
                                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-orange/20 rounded-full blur-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom scroll indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 animate-fade-in stagger-5">
                    <div className="flex flex-col items-center gap-2 text-alabaster/40">
                        <span className="font-display text-[10px] tracking-widest uppercase">Scroll</span>
                        <div className="w-px h-8 bg-gradient-to-b from-alabaster/40 to-transparent" />
                    </div>
                </div>
            </section>

            {/* How It Works - Diagonal Section */}
            <section id="how-it-works" className="relative py-32 clip-diagonal bg-prussian">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Section Header - Left aligned with accent */}
                    <div className="max-w-xl mb-20 opacity-0 animate-fade-up">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="font-display text-xs tracking-[0.3em] text-orange uppercase">
                                How it works
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-orange/50 to-transparent" />
                        </div>
                        <h2 className="font-accent text-4xl md:text-6xl text-white leading-[0.95]">
                            Set it and<br />forget it.
                        </h2>
                    </div>

                    {/* Steps - Asymmetric grid */}
                    <div className="grid md:grid-cols-3 gap-6 md:gap-4">
                        <StepBlock
                            number="01"
                            title="Follow artists"
                            description="Search for your favorite bands and artists. Add them to your watchlist with a single tap."
                            align="top"
                        />
                        <StepBlock
                            number="02"
                            title="Set your location"
                            description="Tell us where you are. We'll focus on concerts you can actually get to—local, national, or across Europe."
                            align="middle"
                        />
                        <StepBlock
                            number="03"
                            title="Get notified"
                            description="When something happens—a new tour, a date near you, a show approaching—we'll let you know."
                            align="bottom"
                        />
                    </div>
                </div>
            </section>

            {/* Value Props - Split Section */}
            <section className="relative py-24 bg-night">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-0">
                        {/* Problem - Dark side */}
                        <div className="relative p-8 md:p-12 lg:p-16 bg-night opacity-0 animate-fade-up">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-alabaster/20 to-transparent" />
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-2 h-2 bg-alabaster/40" />
                                <span className="font-display text-xs tracking-[0.3em] text-alabaster/60 uppercase">
                                    The problem
                                </span>
                            </div>
                            
                            <h2 className="font-accent text-3xl md:text-4xl lg:text-5xl text-white leading-[0.95] mb-8">
                                Live music is<br />
                                <span className="text-alabaster/50">fragmented</span>
                            </h2>
                            
                            <p className="font-body text-lg text-alabaster/70 leading-relaxed max-w-md">
                                Tour announcements scattered across platforms. Dates you discover
                                too late. Shows you didn&apos;t know existed until they sold out.
                                The scene moves fast and information is everywhere—except where
                                you need it.
                            </p>

                            {/* Visual representation - scattered dots */}
                            <div className="absolute bottom-8 right-8 opacity-20">
                                <div className="relative w-24 h-24">
                                    <div className="absolute top-0 left-4 w-2 h-2 bg-white rounded-full" />
                                    <div className="absolute top-6 right-2 w-1.5 h-1.5 bg-white rounded-full" />
                                    <div className="absolute bottom-4 left-0 w-1 h-1 bg-white rounded-full" />
                                    <div className="absolute bottom-0 right-6 w-2.5 h-2.5 bg-white rounded-full" />
                                    <div className="absolute top-10 left-10 w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>

                        {/* Solution - Elevated side */}
                        <div className="relative p-8 md:p-12 lg:p-16 bg-prussian opacity-0 animate-fade-up stagger-2">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange" />
                            
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-2 h-2 bg-orange" />
                                <span className="font-display text-xs tracking-[0.3em] text-orange uppercase">
                                    The solution
                                </span>
                            </div>
                            
                            <h2 className="font-accent text-3xl md:text-4xl lg:text-5xl text-white leading-[0.95] mb-8">
                                One place.<br />
                                <span className="text-orange">Always watching.</span>
                            </h2>
                            
                            <p className="font-body text-lg text-alabaster leading-relaxed max-w-md">
                                BandPulse aggregates concert data continuously. We monitor your
                                artists, track changes, and surface what&apos;s relevant. No more
                                manual searching. No more FOMO. Just a quiet radar that speaks
                                up when it matters.
                            </p>

                            {/* Visual representation - unified pulse */}
                            <div className="absolute bottom-8 right-8">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <div className="absolute w-16 h-16 border border-orange/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                    <div className="absolute w-12 h-12 border border-orange/30 rounded-full" />
                                    <div className="w-4 h-4 bg-orange rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features - Dynamic Bento Grid */}
            <section className="py-32 clip-diagonal-reverse bg-prussian/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-20 opacity-0 animate-fade-up">
                        <h2 className="font-accent text-4xl md:text-6xl text-white leading-tight mb-6">
                            Built for<br />music fans
                        </h2>
                        <p className="font-body text-lg text-alabaster/70">
                            Everything you need to stay connected to the live scene.
                        </p>
                    </div>

                    {/* Bento Grid - Varied sizes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <FeatureBlock
                            icon="mdi:account-music"
                            title="Artist tracking"
                            description="Follow unlimited artists. From stadium headliners to underground acts."
                            size="large"
                            className="col-span-2 row-span-2"
                        />
                        <FeatureBlock
                            icon="mdi:map-marker-radius"
                            title="Geographic filtering"
                            description="Local, national, European—you decide."
                            size="medium"
                            className="col-span-2 md:col-span-1"
                        />
                        <FeatureBlock
                            icon="mdi:bell-outline"
                            title="Smart alerts"
                            description="New tours, dates, changes."
                            size="small"
                            className="col-span-1"
                        />
                        <FeatureBlock
                            icon="mdi:refresh"
                            title="24/7 monitoring"
                            description="We check. You relax."
                            size="small"
                            className="col-span-1"
                        />
                        <FeatureBlock
                            icon="mdi:calendar-check"
                            title="Event details"
                            description="Date, venue, city, status—at a glance."
                            size="medium"
                            className="col-span-2 md:col-span-1"
                        />
                        <FeatureBlock
                            icon="mdi:lightning-bolt"
                            title="Beat the rush"
                            description="Know first. Act fast."
                            size="small"
                            accent
                            className="col-span-1"
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section - Bold, minimal */}
            <section className="relative py-32 bg-night overflow-hidden">
                {/* Background accent */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-prussian/20 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-4xl mx-auto px-6 text-center opacity-0 animate-fade-up">
                    <h2 className="font-accent text-4xl md:text-6xl lg:text-7xl text-white leading-[0.95] mb-8">
                        Ready to stop<br />
                        <span className="inline-flex items-center gap-4">
                            missing shows
                            <span className="text-orange">?</span>
                        </span>
                    </h2>
                    
                    <p className="font-body text-xl text-alabaster/70 mb-12 max-w-xl mx-auto">
                        Join BandPulse and let your live music radar do the work.
                    </p>

                    <Link
                        href={isAuthenticated ? '/dashboard' : '/register'}
                        className="group relative inline-flex items-center justify-center gap-3 px-12 py-5 bg-orange text-night font-body font-semibold text-lg overflow-hidden"
                    >
                        <span className="relative z-10">
                            {isAuthenticated ? 'Go to Dashboard' : 'Get started free'}
                        </span>
                        <Icon icon="mdi:arrow-right" className="relative z-10 text-xl group-hover:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-white transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
                    </Link>

                    {/* Trust indicator */}
                    <div className="mt-16 flex items-center justify-center gap-8 text-alabaster/40">
                        <div className="flex items-center gap-2">
                            <Icon icon="mdi:shield-check" className="text-lg" />
                            <span className="font-display text-xs tracking-wider uppercase">Secure</span>
                        </div>
                        <div className="w-px h-4 bg-alabaster/20" />
                        <div className="flex items-center gap-2">
                            <Icon icon="mdi:clock-outline" className="text-lg" />
                            <span className="font-display text-xs tracking-wider uppercase">Real-time</span>
                        </div>
                        <div className="w-px h-4 bg-alabaster/20" />
                        <div className="flex items-center gap-2">
                            <Icon icon="mdi:heart-outline" className="text-lg" />
                            <span className="font-display text-xs tracking-wider uppercase">Free</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Components

function NotificationPulse({
    type,
    artist,
    message,
    time,
    className = '',
}: {
    type: 'new' | 'reminder' | 'alert';
    artist: string;
    message: string;
    time: string;
    className?: string;
}) {
    const isUrgent = type === 'new' || type === 'alert';

    return (
        <div className={`group relative bg-prussian/90 backdrop-blur-sm p-5 border-l-2 ${isUrgent ? 'border-orange' : 'border-alabaster/20'} hover:bg-prussian transition-all duration-300 ${className}`}>
            <div className="flex items-start gap-4">
                {/* Pulse indicator */}
                <div className="relative flex-shrink-0 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${isUrgent ? 'bg-orange' : 'bg-alabaster/40'}`} />
                    {isUrgent && (
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-orange animate-ping opacity-75" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                        <span className="font-accent text-base text-white group-hover:text-orange transition-colors">
                            {artist}
                        </span>
                        <span className="font-display text-[10px] tracking-wider text-alabaster/40 uppercase whitespace-nowrap">
                            {time}
                        </span>
                    </div>
                    <p className="font-body text-sm text-alabaster/80">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}

function StepBlock({
    number,
    title,
    description,
    align = 'top',
}: {
    number: string;
    title: string;
    description: string;
    align?: 'top' | 'middle' | 'bottom';
}) {
    const marginTop = align === 'middle' ? 'md:mt-12' : align === 'bottom' ? 'md:mt-24' : '';

    return (
        <div className={`opacity-0 animate-fade-up stagger-${parseInt(number)} ${marginTop}`}>
            <div className="relative p-6 md:p-8 bg-night/50 backdrop-blur-sm group hover:bg-night/80 transition-all duration-300">
                {/* Number accent */}
                <div className="absolute -top-4 -left-2 md:-left-4">
                    <span className="font-accent text-6xl md:text-7xl text-prussian-light/30 group-hover:text-orange/20 transition-colors">
                        {number}
                    </span>
                </div>

                <div className="relative pt-8">
                    <h3 className="font-accent text-xl md:text-2xl text-white mb-4 group-hover:text-orange transition-colors">
                        {title}
                    </h3>
                    <p className="font-body text-alabaster/70 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange group-hover:w-full transition-all duration-500" />
            </div>
        </div>
    );
}

function FeatureBlock({
    icon,
    title,
    description,
    size = 'medium',
    accent = false,
    className = '',
}: {
    icon: string;
    title: string;
    description: string;
    size?: 'small' | 'medium' | 'large';
    accent?: boolean;
    className?: string;
}) {
    const sizeClasses = {
        small: 'p-4 md:p-5',
        medium: 'p-5 md:p-6',
        large: 'p-6 md:p-8',
    };

    const iconSizes = {
        small: 'text-xl',
        medium: 'text-2xl',
        large: 'text-3xl',
    };

    const titleSizes = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-xl md:text-2xl',
    };

    return (
        <div className={`group relative ${sizeClasses[size]} bg-night/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:bg-night/80 ${className}`}>
            {/* Accent border */}
            {accent && <div className="absolute top-0 left-0 w-full h-1 bg-orange" />}
            
            {/* Corner accent on hover */}
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-r-[40px] border-t-transparent border-r-orange/0 group-hover:border-r-orange/20 transition-all duration-300" />

            <div className="relative h-full flex flex-col">
                <div className={`mb-4 ${accent ? 'text-orange' : 'text-alabaster/60 group-hover:text-white'} transition-colors`}>
                    <Icon icon={icon} className={iconSizes[size]} />
                </div>
                
                <h3 className={`font-accent ${titleSizes[size]} text-white mb-2 group-hover:text-orange transition-colors`}>
                    {title}
                </h3>
                
                {size !== 'small' && (
                    <p className="font-body text-sm text-alabaster/60 leading-relaxed mt-auto">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
