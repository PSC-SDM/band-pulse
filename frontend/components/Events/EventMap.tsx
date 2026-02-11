'use client';

import { useEffect, useRef, useState } from 'react';
import { EventResponse } from '@/types/event.types';

interface EventMapProps {
    events: EventResponse[];
}

/**
 * EventMap - Displays events on a Leaflet map using vanilla Leaflet.
 *
 * Uses the same pattern as LocationPicker.tsx to avoid react-leaflet + Turbopack issues.
 * Orange markers and popups following the BandPulse Style Guide.
 */
export default function EventMap({ events }: EventMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [mapReady, setMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;
        if (events.length === 0) return;

        let mounted = true;

        async function initMap() {
            const L = (await import('leaflet')).default;
            // @ts-ignore
            await import('leaflet/dist/leaflet.css');

            if (!mounted || !mapContainerRef.current) return;

            // Custom orange marker icon
            const eventIcon = new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });

            // Calculate center from first event
            const center: [number, number] = [
                events[0].venue.location.coordinates[1],
                events[0].venue.location.coordinates[0],
            ];

            const map = L.map(mapContainerRef.current).setView(center, 5);
            mapRef.current = map;

            // Dark-tinted tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19,
            }).addTo(map);

            // Add markers for each event
            const markers: any[] = [];
            for (const event of events) {
                const [lng, lat] = event.venue.location.coordinates;
                const eventDate = new Date(event.date);

                const marker = L.marker([lat, lng], { icon: eventIcon }).addTo(map);

                marker.bindPopup(`
                    <div style="font-family: 'Instrument Sans', system-ui, sans-serif; min-width: 180px;">
                        <div style="font-family: 'Archivo Black', sans-serif; font-size: 14px; color: #14213D; margin-bottom: 4px;">
                            ${event.artistName}
                        </div>
                        <div style="font-size: 12px; color: #555; margin-bottom: 2px;">
                            ${event.venue.name}
                        </div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 6px;">
                            ${event.venue.city}, ${event.venue.country}
                        </div>
                        <div style="font-size: 11px; color: #FCA311; font-weight: 600;">
                            ${eventDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        ${event.ticketUrl ? `
                            <a href="${event.ticketUrl}" target="_blank" rel="noopener noreferrer"
                               style="display: inline-block; margin-top: 8px; padding: 4px 10px; background: #FCA311; color: #000; 
                                      font-size: 11px; font-weight: 600; text-decoration: none; border-radius: 4px;">
                                Tickets
                            </a>
                        ` : ''}
                    </div>
                `);

                markers.push(marker);
            }

            markersRef.current = markers;

            // Fit map bounds to show all markers
            if (markers.length > 1) {
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }

            setMapReady(true);
        }

        initMap();

        return () => {
            mounted = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current = [];
            }
        };
    }, [events]);

    if (events.length === 0) {
        return null;
    }

    return (
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
        </div>
    );
}
