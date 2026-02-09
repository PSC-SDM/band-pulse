'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface LocationPickerProps {
    initialPosition?: [number, number]; // [lat, lng]
    initialRadius?: number; // en km
    onLocationChange: (lat: number, lng: number, radius: number) => void;
}

export default function LocationPicker({
    initialPosition = [40.4168, -3.7038],
    initialRadius = 50,
    onLocationChange,
}: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const circleRef = useRef<any>(null);

    const [position, setPosition] = useState<[number, number]>(initialPosition);
    const [radius, setRadius] = useState(initialRadius);
    const [geolocating, setGeolocating] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // Búsqueda de ciudades
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const stableOnLocationChange = useCallback(onLocationChange, []);

    useEffect(() => {
        stableOnLocationChange(position[0], position[1], radius);
    }, [position, radius, stableOnLocationChange]);

    // Inicializar mapa con Leaflet vanilla (evita problemas con react-leaflet + Turbopack)
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

        let mounted = true;

        async function initMap() {
            const L = (await import('leaflet')).default;
            await import('leaflet/dist/leaflet.css');

            if (!mounted || !mapContainerRef.current) return;

            // Fix iconos
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Crear mapa
            const map = L.map(mapContainerRef.current).setView(initialPosition, 10);
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);

            // Marcador draggable
            const marker = L.marker(initialPosition, { draggable: true }).addTo(map);
            markerRef.current = marker;

            marker.on('dragend', () => {
                const newPos = marker.getLatLng();
                setPosition([newPos.lat, newPos.lng]);
            });

            // Círculo de radio
            const circle = L.circle(initialPosition, {
                radius: initialRadius * 1000,
                color: '#FCA311',
                fillColor: '#FCA311',
                fillOpacity: 0.15,
                weight: 2,
            }).addTo(map);
            circleRef.current = circle;

            setMapReady(true);
        }

        initMap();

        return () => {
            mounted = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
                circleRef.current = null;
            }
        };
    }, []);

    // Actualizar marcador y círculo cuando cambia la posición
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !circleRef.current) return;

        markerRef.current.setLatLng(position);
        circleRef.current.setLatLng(position);
        mapRef.current.setView(position, mapRef.current.getZoom());
    }, [position]);

    // Actualizar círculo cuando cambia el radio
    useEffect(() => {
        if (!circleRef.current) return;
        circleRef.current.setRadius(radius * 1000);
    }, [radius]);

    const handleUseCurrentLocation = () => {
        if (!('geolocation' in navigator)) return;
        setGeolocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition([pos.coords.latitude, pos.coords.longitude]);
                setGeolocating(false);
            },
            () => setGeolocating(false)
        );
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
            );
            setSearchResults(await response.json());
        } catch {
            // silently fail
        } finally {
            setSearching(false);
        }
    };

    const selectSearchResult = (result: any) => {
        setPosition([parseFloat(result.lat), parseFloat(result.lon)]);
        setSearchResults([]);
        setSearchQuery('');
    };

    return (
        <div className="space-y-5">
            {/* Barra de búsqueda + geolocalización */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search for a city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-4 py-3 bg-prussian-light border border-alabaster/20 rounded-lg text-white placeholder-alabaster/40 font-body text-sm focus:border-orange focus:outline-none transition-colors"
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-prussian border border-alabaster/20 rounded-lg overflow-hidden z-[1000] shadow-xl">
                            {searchResults.map((result, index) => (
                                <button
                                    key={index}
                                    onClick={() => selectSearchResult(result)}
                                    className="w-full text-left px-4 py-3 text-sm text-alabaster hover:bg-prussian-light hover:text-orange transition-colors border-b border-alabaster/10 last:border-0 font-body"
                                >
                                    {result.display_name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-5 py-3 bg-orange text-night font-body font-semibold rounded-lg hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                    {searching ? '...' : 'Search'}
                </button>
                <button
                    onClick={handleUseCurrentLocation}
                    disabled={geolocating}
                    className="px-4 py-3 border border-alabaster/20 text-alabaster rounded-lg hover:border-orange hover:text-orange disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Use my current location"
                >
                    {geolocating ? (
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-orange border-r-transparent" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mapa */}
            <div className="relative h-[500px] w-full rounded-lg overflow-hidden border border-alabaster/20">
                <div ref={mapContainerRef} className="h-full w-full" />
                {!mapReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-prussian-light">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
                            <p className="mt-3 text-alabaster/60 font-body text-sm">Loading map...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controles */}
            <div className="space-y-4">
                <div>
                    <label className="flex items-center justify-between text-sm font-body mb-3">
                        <span className="text-alabaster">Search Radius</span>
                        <span className="text-orange font-semibold text-lg font-display">{radius} km</span>
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="500"
                        step="5"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full h-2 bg-prussian-light rounded-lg appearance-none cursor-pointer accent-orange"
                    />
                    <div className="flex justify-between text-xs text-alabaster/50 mt-1 font-body">
                        <span>5 km</span>
                        <span>250 km</span>
                        <span>500 km</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-alabaster/60 font-body mb-1 block">Latitude</label>
                        <input
                            type="number"
                            value={position[0].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2.5 text-sm border border-alabaster/20 rounded-lg bg-prussian-light text-alabaster font-display"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-alabaster/60 font-body mb-1 block">Longitude</label>
                        <input
                            type="number"
                            value={position[1].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2.5 text-sm border border-alabaster/20 rounded-lg bg-prussian-light text-alabaster font-display"
                        />
                    </div>
                </div>

                <p className="text-sm text-alabaster/50 font-body">
                    Drag the pin on the map to change your location
                </p>
            </div>
        </div>
    );
}
