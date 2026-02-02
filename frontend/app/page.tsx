import Link from 'next/link';

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
            <div className="text-center">
                {/* Logo */}
                <div className="mb-8">
                    <h1 className="text-6xl font-bold text-white mb-2">
                        🎸 BandPulse
                    </h1>
                    <p className="text-xl text-purple-200">
                        Never miss a concert again
                    </p>
                </div>

                {/* Description */}
                <div className="max-w-2xl mx-auto mb-12">
                    <p className="text-lg text-purple-100 leading-relaxed">
                        Follow your favorite artists and get notified about concerts near you.
                        Discover live music events across Europe, from intimate club shows to
                        massive festivals.
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
                        <div className="text-3xl mb-3">🎯</div>
                        <h3 className="font-semibold mb-2">Track Artists</h3>
                        <p className="text-sm text-purple-200">
                            Follow artists you love and stay updated on their tours
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
                        <div className="text-3xl mb-3">📍</div>
                        <h3 className="font-semibold mb-2">Local Events</h3>
                        <p className="text-sm text-purple-200">
                            Set your location and discover concerts in your area
                        </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
                        <div className="text-3xl mb-3">🔔</div>
                        <h3 className="font-semibold mb-2">Smart Alerts</h3>
                        <p className="text-sm text-purple-200">
                            Get notified when new shows are announced
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <div className="space-y-4">
                    <Link
                        href="/login"
                        className="inline-block bg-white text-purple-700 font-semibold px-8 py-4 rounded-full text-lg hover:bg-purple-100 transition-colors shadow-lg hover:shadow-xl"
                    >
                        Get Started — It&apos;s Free
                    </Link>
                    <p className="text-purple-300 text-sm">
                        No credit card required
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-4 text-purple-300 text-sm">
                <p>© 2026 BandPulse. Made with ♥ for music fans.</p>
            </footer>
        </main>
    );
}
