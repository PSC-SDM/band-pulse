'use client';

import { EventResponse } from '@/types/event.types';

interface EventCardProps {
    event: EventResponse;
    id?: string;
    highlighted?: boolean;
}

/**
 * EventCard - Displays a single event in the BandPulse style.
 *
 * Style Guide compliance:
 * - Prussian Blue card on Night background
 * - Border radius: 28px for cards (hierarchy)
 * - Orange only for temporal elements (date badge, CTA)
 * - Depth through subtle gradients and shadows
 * - Hover: lift effect + enhanced borders
 */
export default function EventCard({ event, id, highlighted = false }: EventCardProps) {
    const eventDate = new Date(event.date);

    const dayNum = eventDate.getDate();
    const monthShort = eventDate.toLocaleDateString('en', { month: 'short' }).toUpperCase();
    const yearNum = eventDate.getFullYear();
    const fullDate = eventDate.toLocaleDateString('en', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const time = eventDate.toLocaleTimeString('en', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const isSoldOut = event.soldOut === true;
    const isFewLeft = !isSoldOut && event.inventoryStatus === 'few';

    return (
        <div
            id={id}
            className={`group relative transition-all duration-300 ${highlighted
                    ? 'ring-2 ring-orange shadow-[0_0_24px_rgba(252,163,17,0.35)]'
                    : ''
                }`}
            style={{ borderRadius: '28px' }}
        >
            <div className={`relative overflow-hidden bg-prussian border backdrop-blur-sm
                            hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40
                            transition-all duration-300
                            ${isSoldOut
                    ? 'border-red-600/30 hover:border-red-500/50'
                    : 'border-white/[0.04] hover:border-white/20'
                }`}
                style={{ borderRadius: '28px' }}>

                {/* Depth overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"
                    style={{ borderRadius: '28px' }} />

                {/* Hover background accent */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                    <div className={`absolute -right-16 -top-16 w-32 h-32 rotate-45 ${isSoldOut ? 'bg-red-500/5' : 'bg-orange/5'
                        }`} />
                </div>

                <div className="relative p-6">
                    {/* Sold out / Few left badges */}
                    {isSoldOut && (
                        <div className="mb-3">
                            <span className="inline-block px-3 py-1.5 bg-red-600/20 text-red-400 text-[10px] font-display
                                        uppercase tracking-[0.2em] border border-red-500/30"
                                style={{ borderRadius: '10px' }}>
                                Sold Out
                            </span>
                        </div>
                    )}
                    {isFewLeft && (
                        <div className="mb-3">
                            <span className="inline-block px-3 py-1.5 bg-amber-500/20 text-amber-400 text-[10px] font-display
                                        uppercase tracking-[0.2em] border border-amber-500/30"
                                style={{ borderRadius: '10px' }}>
                                Few Tickets Left
                            </span>
                        </div>
                    )}

                    <div className="flex gap-5">
                        {/* Date badge */}
                        <div className="flex-shrink-0 w-16 text-center">
                            <div className={`p-2 border ${isSoldOut
                                    ? 'bg-red-600/10 border-red-500/20'
                                    : 'bg-orange/10 border-orange/20'
                                }`}
                                style={{ borderRadius: '14px' }}>
                                <div className={`text-2xl font-accent leading-none ${isSoldOut ? 'text-red-400' : 'text-orange'
                                    }`}>
                                    {dayNum}
                                </div>
                                <div className={`text-[10px] font-display tracking-[0.2em] mt-1 ${isSoldOut ? 'text-red-400/80' : 'text-orange/80'
                                    }`}>
                                    {monthShort}
                                </div>
                                <div className={`text-[10px] font-display ${isSoldOut ? 'text-red-400/50' : 'text-orange/50'
                                    }`}>
                                    {yearNum}
                                </div>
                            </div>
                        </div>

                        {/* Event info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-accent mb-1 truncate transition-colors duration-300
                                     ${isSoldOut
                                    ? 'text-white/60 group-hover:text-red-400'
                                    : 'text-white group-hover:text-orange'}`}>
                                {event.artistName}
                            </h3>

                            <p className="text-sm text-alabaster/70 font-body mb-3 truncate">
                                {event.venue.name}
                            </p>

                            {/* Location */}
                            <div className="flex items-center gap-2 text-xs text-alabaster/50 font-body mb-1">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">
                                    {event.venue.city}, {event.venue.country}
                                </span>
                            </div>

                            {/* Date & Time */}
                            <div className="flex items-center gap-2 text-xs text-alabaster/40 font-body">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{fullDate} &middot; {time}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ticket CTA */}
                    {event.ticketUrl && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                            <a
                                href={event.ticketUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-4 py-2
                                     text-sm font-display uppercase tracking-wider
                                     border transition-all duration-300
                                     ${isSoldOut
                                        ? 'bg-red-600/10 text-red-400 border-red-500/20 hover:bg-red-600/20 hover:border-red-500/40'
                                        : 'bg-orange/10 text-orange border-orange/20 hover:bg-orange hover:text-night hover:scale-105'
                                    }`}
                                style={{ borderRadius: '12px' }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                                {isSoldOut ? 'View Event' : 'View Tickets'}
                            </a>
                        </div>
                    )}
                </div>

                {/* Bottom accent line on hover */}
                <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700
                           ${isSoldOut ? 'bg-red-500' : 'bg-orange'}`} />
            </div>
        </div>
    );
}
