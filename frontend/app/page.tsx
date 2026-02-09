'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';

export default function Home() {
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';

    return (
        <main className="min-h-screen bg-night">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-night/90 backdrop-blur-sm border-b border-prussian">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-prussian rounded flex items-center justify-center">
                            <Icon icon="mdi:pulse" className="text-lg text-orange" />
                        </div>
                        <span className="font-display text-sm tracking-wider text-white">
                            BANDPULSE
                        </span>
                    </div>
                    {isAuthenticated ? (
                        <Link
                            href="/dashboard"
                            className="font-body text-sm px-4 py-2 bg-orange text-night font-semibold rounded hover:bg-orange-light transition-colors"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <Link
                            href="/login"
                            className="font-body text-sm text-alabaster hover:text-white transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center bg-gradient-to-b from-night via-prussian/20 to-night">
                <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Core Message */}
                        <div className="space-y-8 opacity-0 animate-fade-up">
                            <div className="space-y-4">
                                <p className="font-display text-xs tracking-[0.3em] text-alabaster uppercase">
                                    Your live music radar
                                </p>
                                <h1 className="font-accent text-5xl md:text-6xl lg:text-7xl text-white leading-[0.95]">
                                    Follow once.<br />
                                    <span className="text-alabaster">Never miss</span><br />
                                    a show.
                                </h1>
                            </div>

                            <p className="font-body text-lg text-alabaster leading-relaxed max-w-md">
                                BandPulse watches the live music scene so you don't have to.
                                Add your favorite artists and we'll tap you on the shoulder
                                when something matters.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <Link
                                    href={isAuthenticated ? '/dashboard' : '/register'}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-orange text-night font-body font-semibold hover:bg-orange-light transition-colors"
                                >
                                    {isAuthenticated ? 'Go to Dashboard' : 'Start tracking'}
                                    <Icon icon="mdi:arrow-right" className="text-lg" />
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-alabaster/30 text-white font-body hover:border-alabaster/60 transition-colors"
                                >
                                    How it works
                                </Link>
                            </div>

                            <p className="font-body text-sm text-alabaster/60">
                                Free to use · No credit card required
                            </p>
                        </div>

                        {/* Right: Visual Element */}
                        <div className="hidden lg:block opacity-0 animate-fade-up stagger-2">
                            <div className="relative">
                                {/* Notification Preview Cards */}
                                <div className="space-y-4">
                                    <NotificationCard
                                        type="new"
                                        artist="Radiohead"
                                        message="New tour announced · 12 dates in Europe"
                                        time="Just now"
                                    />
                                    <NotificationCard
                                        type="reminder"
                                        artist="The National"
                                        message="Concert in Barcelona · 3 days away"
                                        time="2h ago"
                                        className="translate-x-8"
                                    />
                                    <NotificationCard
                                        type="alert"
                                        artist="Arcade Fire"
                                        message="New date added near you · Madrid"
                                        time="Yesterday"
                                        className="translate-x-4"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 bg-prussian">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="max-w-2xl mb-16 opacity-0 animate-fade-up">
                        <p className="font-display text-xs tracking-[0.3em] text-alabaster/60 uppercase mb-4">
                            How it works
                        </p>
                        <h2 className="font-accent text-4xl md:text-5xl text-white leading-tight">
                            Set it and forget it
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <StepCard
                            number="01"
                            title="Follow artists"
                            description="Search for your favorite bands and artists. Add them to your watchlist with a single tap."
                        />
                        <StepCard
                            number="02"
                            title="Set your location"
                            description="Tell us where you are. We'll focus on concerts you can actually get to—local, national, or across Europe."
                        />
                        <StepCard
                            number="03"
                            title="Get notified"
                            description="When something happens—a new tour, a date near you, a show approaching—we'll let you know."
                        />
                    </div>
                </div>
            </section>

            {/* Value Props */}
            <section className="py-24 bg-night">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        <div className="opacity-0 animate-fade-up">
                            <p className="font-display text-xs tracking-[0.3em] text-alabaster/60 uppercase mb-4">
                                The problem
                            </p>
                            <h2 className="font-accent text-3xl md:text-4xl text-white leading-tight mb-6">
                                Live music is fragmented
                            </h2>
                            <p className="font-body text-lg text-alabaster leading-relaxed">
                                Tour announcements scattered across platforms. Dates you discover
                                too late. Shows you didn't know existed until they sold out.
                                The scene moves fast and information is everywhere—except where
                                you need it.
                            </p>
                        </div>

                        <div className="opacity-0 animate-fade-up stagger-2">
                            <p className="font-display text-xs tracking-[0.3em] text-alabaster/60 uppercase mb-4">
                                The solution
                            </p>
                            <h2 className="font-accent text-3xl md:text-4xl text-white leading-tight mb-6">
                                One place. Always watching.
                            </h2>
                            <p className="font-body text-lg text-alabaster leading-relaxed">
                                BandPulse aggregates concert data continuously. We monitor your
                                artists, track changes, and surface what's relevant. No more
                                manual searching. No more FOMO. Just a quiet radar that speaks
                                up when it matters.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-prussian/50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16 opacity-0 animate-fade-up">
                        <h2 className="font-accent text-4xl md:text-5xl text-white leading-tight mb-4">
                            Built for music fans
                        </h2>
                        <p className="font-body text-lg text-alabaster">
                            Everything you need to stay connected to the live scene.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon="mdi:account-music"
                            title="Artist tracking"
                            description="Follow unlimited artists. From stadium headliners to underground acts."
                        />
                        <FeatureCard
                            icon="mdi:map-marker-radius"
                            title="Geographic filtering"
                            description="Local shows, national tours, European dates—you decide what's relevant."
                        />
                        <FeatureCard
                            icon="mdi:bell-outline"
                            title="Smart notifications"
                            description="Alerts for new tours, added dates, approaching shows, and status changes."
                        />
                        <FeatureCard
                            icon="mdi:refresh"
                            title="Continuous monitoring"
                            description="We check sources regularly. New information surfaces automatically."
                        />
                        <FeatureCard
                            icon="mdi:calendar-check"
                            title="Event details"
                            description="Date, venue, city, availability status—all the info you need at a glance."
                        />
                        <FeatureCard
                            icon="mdi:lightning-bolt"
                            title="Instant updates"
                            description="The moment something changes, you'll know. Beat the rush."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-night">
                <div className="max-w-3xl mx-auto px-6 text-center opacity-0 animate-fade-up">
                    <h2 className="font-accent text-4xl md:text-5xl text-white leading-tight mb-6">
                        Ready to stop missing shows?
                    </h2>
                    <p className="font-body text-lg text-alabaster mb-8 max-w-xl mx-auto">
                        Join BandPulse and let your live music radar do the work.
                        Follow your first artist in seconds.
                    </p>
                    <Link
                        href={isAuthenticated ? '/dashboard' : '/register'}
                        className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-orange text-night font-body font-semibold text-lg hover:bg-orange-light transition-colors"
                    >
                        {isAuthenticated ? 'Go to Dashboard' : 'Get started free'}
                        <Icon icon="mdi:arrow-right" className="text-xl" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 bg-prussian border-t border-prussian-light">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-night rounded flex items-center justify-center">
                                <Icon icon="mdi:pulse" className="text-xs text-orange" />
                            </div>
                            <span className="font-display text-xs tracking-wider text-alabaster">
                                BANDPULSE
                            </span>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link href="/privacy" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                                Privacy
                            </Link>
                            <Link href="/terms" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                                Terms
                            </Link>
                            <Link href="/contact" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                                Contact
                            </Link>
                        </nav>
                        <p className="font-body text-sm text-alabaster/40">
                            © 2026 BandPulse
                        </p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

// Components

function NotificationCard({
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
        <div className={`bg-prussian border border-prussian-light p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${isUrgent ? 'bg-orange animate-pulse-subtle' : 'bg-alabaster/40'}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-body font-semibold text-white truncate">
                            {artist}
                        </span>
                        <span className="font-display text-[10px] tracking-wider text-alabaster/40 uppercase whitespace-nowrap">
                            {time}
                        </span>
                    </div>
                    <p className="font-body text-sm text-alabaster">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}

function StepCard({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="opacity-0 animate-fade-up stagger-2">
            <div className="mb-4">
                <span className="font-display text-xs tracking-[0.2em] text-orange">
                    {number}
                </span>
            </div>
            <h3 className="font-body font-semibold text-xl text-white mb-3">
                {title}
            </h3>
            <p className="font-body text-alabaster leading-relaxed">
                {description}
            </p>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="bg-prussian border border-prussian-light p-6 hover:border-alabaster/20 transition-colors">
            <div className="w-10 h-10 bg-night rounded flex items-center justify-center mb-4">
                <Icon icon={icon} className="text-xl text-white" />
            </div>
            <h3 className="font-body font-semibold text-lg text-white mb-2">
                {title}
            </h3>
            <p className="font-body text-sm text-alabaster leading-relaxed">
                {description}
            </p>
        </div>
    );
}
