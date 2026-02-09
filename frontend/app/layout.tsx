import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
    title: 'BandPulse — Your Live Music Radar',
    description:
        'Follow an artist once. Never miss their concerts again. BandPulse monitors the live music scene and alerts you when something matters.',
    keywords: 'concerts, live music, tour dates, artist tracking, music events, concert alerts',
    openGraph: {
        title: 'BandPulse — Your Live Music Radar',
        description: 'Follow an artist once. Never miss their concerts again.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="flex flex-col min-h-screen">
                <Providers>
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
