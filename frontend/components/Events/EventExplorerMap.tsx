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

// Logarithmic slider helpers — 5 km (min) to 5000 km (max), internal 0-1000 range
const LOG_MIN = 5;
const LOG_MAX = 5000;

function sliderToRadius(s: number): number {
    const t = s / 1000;
    return Math.round(LOG_MIN * Math.pow(LOG_MAX / LOG_MIN, t));
}

function radiusToSlider(r: number): number {
    return Math.round((Math.log(r / LOG_MIN) / Math.log(LOG_MAX / LOG_MIN)) * 1000);
}

const MAP_STYLES = `
    @keyframes bp-pulse {
        0%   { transform: scale(0.8); opacity: 0.8; }
        70%  { transform: scale(2.4); opacity: 0;   }
        100% { transform: scale(0.8); opacity: 0;   }
    }
    @keyframes bp-pulse-inner {
        0%, 100% { box-shadow: 0 0 0 0 rgba(252,163,17,0.6); }
        50%      { box-shadow: 0 0 0 6px rgba(252,163,17,0); }
    }
    .bp-user-marker-ring {
        animation: bp-pulse 2.2s ease-out infinite;
    }
    .bp-user-marker-dot {
        animation: bp-pulse-inner 2.2s ease-in-out infinite;
    }
    .bp-popup .leaflet-popup-content-wrapper {
        background: #14213D;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px !important;
        box-shadow: 0 24px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(252,163,17,0.06);
        padding: 0;
    }
    .bp-popup .leaflet-popup-content {
        margin: 0;
        padding: 16px 18px;
    }
    .bp-popup .leaflet-popup-tip-container {
        display: none;
    }
    .bp-popup .leaflet-popup-close-button {
        color: rgba(229,229,229,0.3) !important;
        top: 10px !important;
        right: 12px !important;
        font-size: 18px !important;
        font-weight: 300 !important;
        transition: color 0.15s;
    }
    .bp-popup .leaflet-popup-close-button:hover {
        color: rgba(252,163,17,0.8) !important;
    }
    .leaflet-container {
        font-family: 'Instrument Sans', system-ui, sans-serif;
    }
    .leaflet-control-zoom {
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 12px !important;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
    }
    .leaflet-control-zoom a {
        background: rgba(20,33,61,0.9) !important;
        backdrop-filter: blur(8px);
        color: rgba(229,229,229,0.7) !important;
        border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        width: 32px !important;
        height: 32px !important;
        line-height: 32px !important;
        font-size: 16px !important;
        transition: all 0.15s;
    }
    .leaflet-control-zoom a:hover {
        background: rgba(252,163,17,0.15) !important;
        color: #FCA311 !important;
    }
    .leaflet-attribution-flag { display: none !important; }
    .leaflet-control-attribution {
        background: rgba(10,10,10,0.6) !important;
        backdrop-filter: blur(4px);
        border-radius: 8px 0 0 0 !important;
        font-size: 9px !important;
        color: rgba(229,229,229,0.3) !important;
        padding: 2px 6px !important;
    }
    .leaflet-control-attribution a { color: rgba(252,163,17,0.5) !important; }
    .leaflet-bottom.leaflet-right {
        bottom: auto !important;
        top: 50% !important;
        transform: translateY(-50%);
    }
`;

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
    const stylesInjectedRef = useRef(false);

    const [position, setPosition] = useState<[number, number]>(initialPosition);
    const [radius, setRadius] = useState(initialRadius);
    const [geolocating, setGeolocating] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Fix stale closure: always call the latest version of onLocationChange
    const onLocationChangeRef = useRef(onLocationChange);
    useEffect(() => { onLocationChangeRef.current = onLocationChange; }, [onLocationChange]);
    const stableOnLocationChange = useCallback(
        (lat: number, lng: number, r: number) => onLocationChangeRef.current(lat, lng, r),
        []
    );

    // Notify parent on position / radius changes
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

            // Inject BandPulse map styles once
            if (!stylesInjectedRef.current) {
                const styleEl = document.createElement('style');
                styleEl.textContent = MAP_STYLES;
                document.head.appendChild(styleEl);
                stylesInjectedRef.current = true;
            }

            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(initialPosition, 10);
            mapRef.current = map;

            // Zoom control — repositioned to bottom-right
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19,
            }).addTo(map);

            // Pulsing user marker (SVG DivIcon)
            const userIcon = L.divIcon({
                html: `
                    <div style="position:relative; width:20px; height:20px;">
                        <div class="bp-user-marker-ring" style="
                            position:absolute; width:20px; height:20px; border-radius:50%;
                            background:rgba(252,163,17,0.35); top:0; left:0; pointer-events:none;
                        "></div>
                        <div class="bp-user-marker-dot" style="
                            position:absolute; width:14px; height:14px; border-radius:50%;
                            background:#FCA311; border:2.5px solid #0A0A0A;
                            top:3px; left:3px;
                        "></div>
                    </div>`,
                className: '',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -16],
            });

            const marker = L.marker(initialPosition, { draggable: true, icon: userIcon }).addTo(map);
            markerRef.current = marker;

            marker.on('dragend', () => {
                const p = marker.getLatLng();
                setPosition([p.lat, p.lng]);
            });

            // Radius circle
            const circle = L.circle(initialPosition, {
                radius: initialRadius * 1000,
                color: '#FCA311',
                fillColor: '#FCA311',
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: '6 5',
                opacity: 0.5,
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
        mapRef.current.setView(position, mapRef.current.getZoom(), { animate: true, duration: 0.4 });
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

        for (const m of eventMarkersRef.current) map.removeLayer(m);
        eventMarkersRef.current = [];

        if (events.length === 0) return;

        const makeEventIcon = (soldOut: boolean) => L.divIcon({
            html: `<div style="
                width:10px; height:10px; border-radius:50%;
                background:${soldOut ? '#4B5563' : '#FCA311'};
                border:2px solid ${soldOut ? '#1F2937' : '#0A0A0A'};
                box-shadow:${soldOut ? 'none' : '0 0 8px rgba(252,163,17,0.5)'};
            "></div>`,
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5],
            popupAnchor: [0, -10],
        });

        const markers: any[] = [];
        for (const event of events) {
            const [lng, lat] = event.venue.location.coordinates;
            const eventDate = new Date(event.date);
            const isSoldOut = event.soldOut === true;

            const m = L.marker([lat, lng], { icon: makeEventIcon(isSoldOut) }).addTo(map);

            const statusBadge = isSoldOut
                ? `<span style="display:inline-block;padding:2px 7px;background:rgba(107,114,128,0.25);color:#9CA3AF;
                               font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
                               border-radius:6px;border:1px solid rgba(107,114,128,0.3);">Sold Out</span>`
                : event.inventoryStatus === 'few'
                    ? `<span style="display:inline-block;padding:2px 7px;background:rgba(252,163,17,0.15);color:#FCA311;
                                   font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
                                   border-radius:6px;border:1px solid rgba(252,163,17,0.25);">Few Left</span>`
                    : '';

            const ticketButton = event.ticketUrl
                ? `<a href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer" style="
                       display:inline-block;margin-top:10px;padding:5px 12px;
                       background:${isSoldOut ? 'rgba(75,85,99,0.3)' : 'rgba(252,163,17,0.15)'};
                       color:${isSoldOut ? '#6B7280' : '#FCA311'};
                       font-size:10px;font-weight:700;text-decoration:none;
                       border-radius:8px;letter-spacing:0.05em;text-transform:uppercase;
                       border:1px solid ${isSoldOut ? 'rgba(75,85,99,0.3)' : 'rgba(252,163,17,0.25)'};
                       transition:all 0.15s;">
                       ${isSoldOut ? 'View' : 'Tickets →'}
                   </a>`
                : '';

            m.bindPopup(`
                <div style="font-family:'Instrument Sans',system-ui,sans-serif; min-width:190px;">
                    ${statusBadge ? `<div style="margin-bottom:10px;">${statusBadge}</div>` : ''}
                    <div style="font-family:'Archivo Black',sans-serif;font-size:13px;color:#E5E5E5;
                                line-height:1.3;margin-bottom:5px;">
                        ${event.artistName}
                    </div>
                    <div style="font-size:11px;color:rgba(229,229,229,0.55);margin-bottom:2px;">
                        ${event.venue.name}
                    </div>
                    <div style="font-size:10px;color:rgba(229,229,229,0.35);margin-bottom:8px;">
                        ${event.venue.city}, ${event.venue.country}
                    </div>
                    <div style="display:flex;align-items:center;gap:5px;">
                        <div style="width:4px;height:4px;border-radius:50%;
                                    background:${isSoldOut ? '#6B7280' : '#FCA311'};flex-shrink:0;"></div>
                        <span style="font-size:10px;color:${isSoldOut ? '#6B7280' : '#FCA311'};font-weight:600;
                                     letter-spacing:0.03em;">
                            ${eventDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    ${ticketButton}
                </div>
            `, { className: 'bp-popup' });

            markers.push(m);
        }
        eventMarkersRef.current = markers;
    }, [events]);

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
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
            );
            setSearchResults(await res.json());
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

    const sliderVal = radiusToSlider(radius);
    const radiusFillPct = sliderVal / 10; // 0-100% for the track fill

    return (
        <div className="space-y-3">
            {/* ── Map block ───────────────────────────────────────────── */}
            {/*
             * Outer wrapper: relative + border-radius (no overflow-hidden)
             * so the search dropdown can escape the container.
             * Inner map div: overflow-hidden so tiles are clipped to the radius.
             */}
            <div className="relative" style={{ borderRadius: '32px' }}>
                {/* Map canvas */}
                <div
                    className="overflow-hidden border border-white/[0.06]"
                    style={{ borderRadius: '32px' }}
                >
                    <div ref={mapContainerRef} style={{ height: '520px', width: '100%' }} />

                    {/* Loading state */}
                    {!mapReady && (
                        <div className="absolute inset-0 flex items-center justify-center"
                            style={{ background: '#14213D', borderRadius: '32px' }}>
                            <div className="text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-orange border-r-transparent" />
                                <p className="mt-3 text-alabaster/40 font-body text-xs tracking-widest uppercase">
                                    Loading map
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Bottom: legend + event count in one pill */}
                    {mapReady && (
                        <div className="absolute bottom-4 left-4 right-4 z-[400] flex items-center justify-between gap-3">
                            {/* Legend */}
                            <div className="flex items-center gap-4 px-3 py-2 bg-night/75 backdrop-blur-md
                                            border border-white/[0.08]"
                                style={{ borderRadius: '10px' }}>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange
                                                    shadow-[0_0_6px_rgba(252,163,17,0.6)]" />
                                    <span className="text-[10px] font-body text-alabaster/50">You</span>
                                </div>
                                <div className="w-px h-3 bg-white/10" />
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange/70" />
                                    <span className="text-[10px] font-body text-alabaster/50">Available</span>
                                </div>
                                <div className="w-px h-3 bg-white/10" />
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                                    <span className="text-[10px] font-body text-alabaster/50">Sold out</span>
                                </div>
                            </div>
                            {/* Event counter — right side, no collision */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-night/75 backdrop-blur-md
                                            border border-white/[0.08]"
                                style={{ borderRadius: '10px' }}>
                                <div className="w-1.5 h-1.5 bg-orange rounded-full" />
                                <span className="text-[10px] font-display tracking-[0.15em] text-alabaster/60 uppercase">
                                    {events.length} event{events.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Bottom gradient for depth */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, rgba(10,10,10,0.35) 0%, transparent 100%)',
                            borderRadius: '0 0 32px 32px',
                        }} />
                </div>

                {/* ── Search overlay (outside overflow-hidden so dropdown isn't clipped) */}
                <div className="absolute top-4 left-4 right-4 z-[500]">
                    <div className="flex gap-2">
                        {/* Input */}
                        <div className="relative flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-alabaster/30 pointer-events-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-3 py-2.5 text-sm text-white font-body
                                           bg-night/80 backdrop-blur-md border border-white/[0.1]
                                           placeholder-alabaster/30
                                           focus:border-orange/40 focus:outline-none focus:bg-night/90
                                           transition-all duration-200"
                                style={{ borderRadius: '14px' }}
                            />

                            {/* Search results dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1.5 z-[600]
                                                bg-prussian border border-white/[0.08]
                                                shadow-2xl shadow-black/60 overflow-hidden"
                                    style={{ borderRadius: '16px' }}>
                                    {searchResults.map((result, i) => (
                                        <button
                                            key={i}
                                            onClick={() => selectSearchResult(result)}
                                            className="w-full text-left px-4 py-3 text-xs text-alabaster/80
                                                       hover:bg-white/[0.04] hover:text-orange
                                                       border-b border-white/[0.04] last:border-0
                                                       font-body transition-colors duration-150"
                                        >
                                            {result.display_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search button */}
                        <button
                            onClick={handleSearch}
                            disabled={searching || !searchQuery.trim()}
                            className="px-4 py-2.5 bg-orange/90 text-night font-display font-semibold text-xs
                                       uppercase tracking-wider backdrop-blur-md
                                       hover:bg-orange disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{ borderRadius: '14px' }}
                        >
                            {searching ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full
                                                 border-2 border-solid border-night border-r-transparent" />
                            ) : 'Go'}
                        </button>

                        {/* GPS button */}
                        <button
                            onClick={handleUseCurrentLocation}
                            disabled={geolocating}
                            title="Use my current location"
                            className="px-3 py-2.5 bg-night/80 backdrop-blur-md border border-white/[0.1]
                                       text-alabaster/60 hover:text-orange hover:border-orange/40
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-all duration-200"
                            style={{ borderRadius: '14px' }}
                        >
                            {geolocating ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full
                                                 border-2 border-solid border-orange border-r-transparent" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Radius control panel ─────────────────────────────────── */}
            <div className="relative overflow-hidden bg-prussian border border-white/[0.04] px-6 py-5"
                style={{ borderRadius: '28px' }}>

                {/* Depth overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent
                                pointer-events-none"
                    style={{ borderRadius: '28px' }} />

                <div className="relative">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <p className="text-[10px] tracking-[0.25em] text-alabaster/30 uppercase font-display mb-1">
                                Search Radius
                            </p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-display text-orange leading-none">{radius}</span>
                                <span className="text-xs text-alabaster/40 font-body">km</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] tracking-[0.25em] text-alabaster/30 uppercase font-display mb-1">
                                Position
                            </p>
                            <p className="text-xs text-alabaster/50 font-display tabular-nums">
                                {position[0].toFixed(4)}
                            </p>
                            <p className="text-xs text-alabaster/50 font-display tabular-nums">
                                {position[1].toFixed(4)}
                            </p>
                        </div>
                    </div>

                    {/* Custom slider track — logarithmic scale */}
                    <div className="relative mb-2">
                        {/* Track fill */}
                        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 pointer-events-none transition-all duration-100"
                            style={{
                                width: `${radiusFillPct}%`,
                                background: 'linear-gradient(to right, rgba(252,163,17,0.6), #FCA311)',
                                borderRadius: '4px',
                            }} />
                        <input
                            type="range"
                            min="0"
                            max="1000"
                            step="1"
                            value={sliderVal}
                            onChange={(e) => setRadius(sliderToRadius(Number(e.target.value)))}
                            className="w-full h-1 appearance-none cursor-pointer relative z-10"
                            style={{
                                background: 'transparent',
                                accentColor: '#FCA311',
                            }}
                        />
                    </div>

                    {/* Tick labels — log-spaced landmarks */}
                    <div className="relative h-4 mt-1">
                        {([
                            { label: '5 km',    pct: 0   },
                            { label: '50 km',   pct: 33  },
                            { label: '200 km',  pct: 53  },
                            { label: '1000 km', pct: 77  },
                            { label: '5000 km', pct: 100 },
                        ] as { label: string; pct: number }[]).map(({ label, pct }) => (
                            <span
                                key={label}
                                className="absolute text-[9px] text-alabaster/25 font-body"
                                style={{
                                    left: `${pct}%`,
                                    transform: pct === 0 ? 'none' : pct === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                                }}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Hint */}
                    <p className="text-[10px] text-alabaster/25 font-body mt-4 tracking-wide">
                        Drag the pin on the map to change position
                    </p>
                </div>
            </div>
        </div>
    );
}
