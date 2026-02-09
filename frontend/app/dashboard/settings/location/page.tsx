'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Importar dinámicamente para evitar SSR issues con Leaflet
const LocationPicker = dynamic(
    () => import('@/components/Map/LocationPicker'),
    {
        ssr: false,
        loading: () => (
            <div className="h-[500px] w-full rounded-lg bg-prussian-light border border-alabaster/20 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
                    <p className="mt-3 text-alabaster/60 font-body text-sm">Loading map...</p>
                </div>
            </div>
        ),
    }
);

export default function LocationSettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        async function fetchUserData() {
            try {
                const response = await fetch('/api/user/me');
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        }

        if (status === 'authenticated') {
            fetchUserData();
        }
    }, [status]);

    const handleLocationChange = useCallback((lat: number, lng: number, radius: number) => {
        setUserData((prev: any) => ({
            ...prev,
            location: { type: 'Point', coordinates: [lng, lat] },
            radiusKm: radius,
        }));
    }, []);

    const handleSave = async () => {
        if (!userData) return;

        setSaving(true);
        setMessage('');

        try {
            const response = await fetch('/api/user/location', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    longitude: userData.location.coordinates[0],
                    latitude: userData.location.coordinates[1],
                    radiusKm: userData.radiusKm,
                }),
            });

            if (response.ok) {
                setMessage('Location saved successfully!');
                setMessageType('success');
                setTimeout(() => router.push('/dashboard'), 2000);
            } else {
                setMessage('Error saving location. Please try again.');
                setMessageType('error');
            }
        } catch (error) {
            setMessage('Error saving location. Please try again.');
            setMessageType('error');
        } finally {
            setSaving(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-night">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
                    <p className="mt-4 text-alabaster font-body">Loading...</p>
                </div>
            </div>
        );
    }

    const currentPosition: [number, number] = userData?.location
        ? [userData.location.coordinates[1], userData.location.coordinates[0]]
        : [40.4168, -3.7038];

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-4xl px-6 py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm font-body mb-8">
                    <Link href="/dashboard" className="text-alabaster/50 hover:text-orange transition-colors">
                        Dashboard
                    </Link>
                    <span className="text-alabaster/30">/</span>
                    <span className="text-alabaster">Set Location</span>
                </nav>

                <div className="mb-8">
                    <h1 className="text-3xl font-accent text-white">Set Your Location</h1>
                    <p className="mt-2 text-alabaster/60 font-body">
                        Choose your location and search radius to discover concerts near you
                    </p>
                </div>

                <div className="bg-prussian rounded-xl border border-alabaster/10 p-6">
                    <LocationPicker
                        initialPosition={currentPosition}
                        initialRadius={userData?.radiusKm || 50}
                        onLocationChange={handleLocationChange}
                    />

                    {/* Mensaje de estado */}
                    {message && (
                        <div
                            className={`mt-5 p-4 rounded-lg font-body text-sm border ${
                                messageType === 'success'
                                    ? 'bg-green-900/20 text-green-400 border-green-500/30'
                                    : 'bg-red-900/20 text-red-400 border-red-500/30'
                            }`}
                        >
                            {message}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-orange text-night px-6 py-3.5 rounded-lg font-body font-semibold hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-night border-r-transparent" />
                                    Saving...
                                </span>
                            ) : (
                                'Save Location'
                            )}
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3.5 rounded-lg font-body font-semibold border border-alabaster/20 text-alabaster hover:border-alabaster/40 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
