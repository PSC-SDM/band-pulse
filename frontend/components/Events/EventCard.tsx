'use client';

import { EventResponse } from '@/types/event.types';

interface EventCardProps {
    event: EventResponse;
}

/**
 * EventCard - Displays a single event in the BandPulse style.
 *
 * Style Guide:
 * - Prussian Blue card on Night background
 * - Orange only for temporal elements (date badge) and CTA (tickets)
 * - Alabaster for text, controlled opacity hierarchy
 */
export default function EventCard({ event }: EventCardProps) {
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

    return (
        <div className="group relative overflow-hidden bg-prussian/80 backdrop-blur-sm
                        border-l-2 border-transparent hover:border-orange
                        transition-all duration-500">
            {/* Hover background accent */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-orange/5 rotate-45" />
            </div>

            <div className="relative p-6">
                <div className="flex gap-5">
                    {/* Date badge - Orange for temporal activation */}
                    <div className="flex-shrink-0 w-16 text-center">
                        <div className="bg-orange/10 border border-orange/20 rounded-lg p-2">
                            <div className="text-2xl font-accent text-orange leading-none">
                                {dayNum}
                            </div>
                            <div className="text-[10px] font-display tracking-[0.2em] text-orange/80 mt-1">
                                {monthShort}
                            </div>
                            <div className="text-[10px] font-display text-orange/50">
                                {yearNum}
                            </div>
                        </div>
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-accent text-white mb-1 truncate
                                     group-hover:text-orange transition-colors duration-300">
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

                {/* Ticket CTA - Orange for action */}
                {event.ticketUrl && (
                    <div className="mt-4 pt-4 border-t border-alabaster/10">
                        <a
                            href={event.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2
                                     bg-orange/10 text-orange text-sm font-display uppercase tracking-wider
                                     border border-orange/20 rounded-lg
                                     hover:bg-orange hover:text-night
                                     transition-all duration-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                            </svg>
                            View Tickets
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom progress bar on hover */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange group-hover:w-full transition-all duration-700" />
        </div>
    );
}
