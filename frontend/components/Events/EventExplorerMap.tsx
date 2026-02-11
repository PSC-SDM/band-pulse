'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { EventResponse } from '@/types/event.types';

interface EventExplorerMapProps {
    /** Initial map center [lat, lng] */
    initialPosition: [number, number];
    /** Initial search radius in km */
    initialRadius: number;
    /** Events to show as markers */
    events: EventResponse[];
    /** Fired when user changes position or radius */
    onLocationChange: (lat: number, lng: number, radius: number) => void;
}

/**
 * EventExplorerMap - Interactive map combining:
 *   - Draggable marker + radius circle (like LocationPicker)
 *   - Event markers with popups (like EventMap)
 *   - City search + geolocation + radius slider
 *
 * Uses vanilla Leaflet to avoid react-leaflet + Turbopack issues.
 * Styled with BandPulse Style Guide (Night/Prussian/Orange).
 */
export default function EventExplorerMap({
    initialPosition,
    initialRadius,
    events,
    onLocationChange,
}: EventExplorerMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const circleRef = useRef<any>(null);
    const eventMarkersRef = useRef<any[]>([]);
    const leafletRef = useRef<any>(null);

    const [position, setPosition] = useState<[number, number]>(initialPosition);
    const [radius, setRadius] = useState(initialRadius);
    const [geolocating, setGeolocating] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    // City search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const stableOnLocationChange = useCallback(onLocationChange, []);

    // Notify parent when position or radius changes
    useEffect(() => {
        stableOnLocationChange(position[0], position[1], radius);
    }, [position, radius, stableOnLocationChange]);

    // Initialize map
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

        let mounted = true;

        async function initMap() {
            const L = (await import('leaflet')).default;
            // @ts-ignore
            await import('leaflet/dist/leaflet.css');

            if (!mounted || !mapContainerRef.current) return;

            leafletRef.current = L;

            // Fix default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            // Create map with dark tiles
            const map = L.map(mapContainerRef.current).setView(initialPosition, 10);
            mapRef.current = map;

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19,
            }).addTo(map);

            // User position marker (blue, draggable)
            const userIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });

            const marker = L.marker(initialPosition, { draggable: true, icon: userIcon }).addTo(map);
            marker.bindTooltip('Your location', {
                permanent: false,
                direction: 'top',
                offset: [0, -42],
            });
            markerRef.current = marker;

            marker.on('dragend', () => {
                const newPos = marker.getLatLng();
                setPosition([newPos.lat, newPos.lng]);
            });

            // Radius circle
            const circle = L.circle(initialPosition, {
                radius: initialRadius * 1000,
                color: '#FCA311',
                fillColor: '#FCA311',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '8 4',
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
                eventMarkersRef.current = [];
                leafletRef.current = null;
            }
        };
    }, []);

    // Sync position → marker & circle
    useEffect(() => {
        if (!mapRef.current || !markerRef.current || !circleRef.current) return;
        markerRef.current.setLatLng(position);
        circleRef.current.setLatLng(position);
        mapRef.current.setView(position, mapRef.current.getZoom());
    }, [position]);

    // Sync radius → circle
    useEffect(() => {
        if (!circleRef.current) return;
        circleRef.current.setRadius(radius * 1000);
    }, [radius]);

    // Sync events → event markers
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        // Clear previous event markers
        for (const m of eventMarkersRef.current) {
            map.removeLayer(m);
        }
        eventMarkersRef.current = [];

        if (events.length === 0) return;

        const eventIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        const soldOutIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        const markers: any[] = [];

        for (const event of events) {
            const [lng, lat] = event.venue.location.coordinates;
            const eventDate = new Date(event.date);
            const isSoldOut = event.soldOut === true;

            const m = L.marker([lat, lng], { icon: isSoldOut ? soldOutIcon : eventIcon }).addTo(map);

            const soldOutBadge = isSoldOut
                ? `<div style="display: inline-block; margin-bottom: 6px; padding: 2px 8px; background: #dc2626; color: #fff;
                              font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 3px;">
                      Sold Out
                   </div>`
                : '';

            const fewLeftBadge = !isSoldOut && event.inventoryStatus === 'few'
                ? `<div style="display: inline-block; margin-bottom: 6px; padding: 2px 8px; background: #f59e0b; color: #000;
                              font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 3px;">
                      Few Tickets Left
                   </div>`
                : '';

            const ticketButton = event.ticketUrl
                ? isSoldOut
                    ? `<a href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer"
                        style="display: inline-block; margin-top: 8px; padding: 4px 10px; background: #555; color: #ccc;
                               font-size: 11px; font-weight: 600; text-decoration: none; border-radius: 4px;">
                        View Event
                    </a>`
                    : `<a href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer"
                        style="display: inline-block; margin-top: 8px; padding: 4px 10px; background: #FCA311; color: #000;
                               font-size: 11px; font-weight: 600; text-decoration: none; border-radius: 4px;">
                        Tickets
                    </a>`
                : '';

            m.bindPopup(`
                <div style="font-family: 'Instrument Sans', system-ui, sans-serif; min-width: 200px;">
                    ${soldOutBadge}${fewLeftBadge}
                    <div style="font-family: 'Archivo Black', sans-serif; font-size: 14px; color: #E5E5DB; margin-bottom: 4px;">
                        ${event.artistName}
                    </div>
                    <div style="font-size: 12px; color: #E5E5DB99; margin-bottom: 2px;">
                        ${event.venue.name}
                    </div>
                    <div style="font-size: 11px; color: #E5E5DB66; margin-bottom: 6px;">
                        ${event.venue.city}, ${event.venue.country}
                    </div>
                    <div style="font-size: 11px; color: ${isSoldOut ? '#dc2626' : '#FCA311'}; font-weight: 600;">
                        ${eventDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    ${ticketButton}
                </div>
            `, {
                className: 'event-popup-dark',
            });

            markers.push(m);
        }

        eventMarkersRef.current = markers;
    }, [events]);

    // Geolocation
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

    // City search via Nominatim
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
        <div className="space-y-4">
            {/* Search bar + geolocation */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search for a city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full px-4 py-3 bg-prussian-light border border-alabaster/20 rounded-lg text-white 
                                   placeholder-alabaster/40 font-body text-sm focus:border-orange focus:outline-none transition-colors"
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-prussian border border-alabaster/20 
                                        rounded-lg overflow-hidden z-[1000] shadow-xl">
                            {searchResults.map((result, index) => (
                                <button
                                    key={index}
                                    onClick={() => selectSearchResult(result)}
                                    className="w-full text-left px-4 py-3 text-sm text-alabaster hover:bg-prussian-light 
                                               hover:text-orange transition-colors border-b border-alabaster/10 last:border-0 font-body"
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
                    className="px-5 py-3 bg-orange text-night font-body font-semibold rounded-lg 
                               hover:bg-orange-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                    {searching ? '...' : 'Search'}
                </button>
                <button
                    onClick={handleUseCurrentLocation}
                    disabled={geolocating}
                    className="px-4 py-3 border border-alabaster/20 text-alabaster rounded-lg 
                               hover:border-orange hover:text-orange disabled:opacity-40 
                               disabled:cursor-not-allowed transition-colors"
                    title="Use my current location"
                >
                    {geolocating ? (
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-orange border-r-transparent" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Map */}
            <div className="relative h-[500px] w-full rounded-lg overflow-hidden border border-alabaster/20">
                <div ref={mapContainerRef} className="h-full w-full" />
                {!mapReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-prussian-dark">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
                            <p className="mt-3 text-alabaster/60 font-body text-sm">Loading map...</p>
                        </div>
                    </div>
                )}

                {/* Event count overlay */}
                {mapReady && (
                    <div className="absolute top-3 right-3 z-[400] bg-night/80 backdrop-blur-sm 
                                    border border-alabaster/10 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange rounded-full" />
                            <span className="text-xs font-display tracking-wider text-alabaster/70">
                                {events.length} event{events.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Legend overlay */}
                {mapReady && (
                    <div className="absolute bottom-3 left-3 z-[400] bg-night/80 backdrop-blur-sm 
                                    border border-alabaster/10 rounded-lg px-3 py-2 flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-body text-alabaster/60">You</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-orange" />
                            <span className="text-[10px] font-body text-alabaster/60">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-600" />
                            <span className="text-[10px] font-body text-alabaster/60">Sold Out</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Radius slider */}
            <div className="bg-prussian/60 border border-alabaster/10 rounded-lg p-4">
                <div>
                    <label className="flex items-center justify-between text-sm font-body mb-3">
                        <span className="text-alabaster">Search Radius</span>
                        <span className="text-orange font-semibold text-lg font-display">{radius} km</span>
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="5000"
                        step="10"
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full h-2 bg-prussian-light rounded-lg appearance-none cursor-pointer accent-orange"
                    />
                    <div className="flex justify-between text-xs text-alabaster/50 mt-1 font-body">
                        <span>5 km</span>
                        <span>2500 km</span>
                        <span>5000 km</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                        <label className="text-xs text-alabaster/60 font-body mb-1 block">Latitude</label>
                        <input
                            type="number"
                            value={position[0].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-alabaster/20 rounded-lg bg-prussian-light text-alabaster font-display"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-alabaster/60 font-body mb-1 block">Longitude</label>
                        <input
                            type="number"
                            value={position[1].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-alabaster/20 rounded-lg bg-prussian-light text-alabaster font-display"
                        />
                    </div>
                </div>

                <p className="text-xs text-alabaster/40 font-body mt-3">
                    Drag the blue pin to explore events in a different area
                </p>
            </div>
        </div>
    );
}
