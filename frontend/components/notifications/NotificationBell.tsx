'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Notification } from '@/types';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '@/lib/notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function notificationIcon(type: Notification['type']): string {
    switch (type) {
        case 'new_concert': return 'mdi:ticket-outline';
        case 'concert_reminder': return 'mdi:calendar-clock-outline';
        case 'tour_announcement': return 'mdi:map-marker-path';
        default: return 'mdi:bell-outline';
    }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface NotificationBellProps {
    token: string;
}

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell({ token }: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // ── Poll unread count ──────────────────────────────────────────────────

    const refreshCount = useCallback(async () => {
        try {
            const count = await getUnreadCount(token);
            setUnreadCount(count);
        } catch {
            // Silently ignore — network errors shouldn't break the UI
        }
    }, [token]);

    useEffect(() => {
        refreshCount();
        const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refreshCount]);

    // ── Open / close dropdown ─────────────────────────────────────────────

    const openDropdown = async () => {
        setIsOpen(true);
        setIsLoadingList(true);
        try {
            const list = await getNotifications(token);
            setNotifications(list);
        } catch {
            setNotifications([]);
        } finally {
            setIsLoadingList(false);
        }
    };

    const toggleDropdown = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            openDropdown();
        }
    };

    // ── Click-outside & Escape to close ───────────────────────────────────

    useEffect(() => {
        if (!isOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKey);
        document.addEventListener('mousedown', handleClick);
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('mousedown', handleClick);
        };
    }, [isOpen]);

    // ── Mark as read ──────────────────────────────────────────────────────

    const handleMarkOne = async (notification: Notification) => {
        if (notification.read) return;
        try {
            await markAsRead(token, notification._id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
            // ignore
        }
    };

    const handleMarkAll = async () => {
        try {
            await markAllAsRead(token);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // ignore
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div ref={containerRef} className="relative">
            {/* Bell button */}
            <button
                onClick={toggleDropdown}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                className={`relative flex items-center justify-center w-9 h-9
                            border transition-all duration-200
                            ${isOpen
                        ? 'border-orange/50 text-orange bg-prussian/60'
                        : 'border-transparent text-alabaster/50 hover:text-white hover:border-alabaster/20'
                    }`}
            >
                <Icon icon="mdi:bell-outline" className="text-lg" />

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center
                                     min-w-[16px] h-4 px-0.5
                                     bg-orange text-night font-display text-[10px] leading-none
                                     rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 z-50
                                bg-prussian border border-white/[0.08] shadow-2xl shadow-night/80
                                animate-fade-in">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3
                                    border-b border-white/[0.06]">
                        <span className="font-display text-xs tracking-widest text-alabaster/50 uppercase">
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAll}
                                className="font-body text-xs text-alabaster/40 hover:text-orange transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {isLoadingList && (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-5 w-5 border-2 border-orange/30 border-t-orange
                                                rounded-full animate-spin" />
                            </div>
                        )}

                        {!isLoadingList && notifications.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <Icon icon="mdi:bell-check-outline"
                                    className="text-3xl text-alabaster/20 mb-2" />
                                <p className="font-body text-sm text-alabaster/40">
                                    You&apos;re all caught up
                                </p>
                            </div>
                        )}

                        {!isLoadingList && notifications.map((notif) => (
                            <button
                                key={notif._id}
                                onClick={() => handleMarkOne(notif)}
                                className={`w-full text-left px-4 py-3 flex gap-3
                                            border-b border-white/[0.04] last:border-0
                                            transition-colors duration-150 group
                                            ${notif.read
                                        ? 'bg-transparent hover:bg-prussian-light/20'
                                        : 'bg-prussian-light/30 hover:bg-prussian-light/50'
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`mt-0.5 shrink-0 ${notif.read ? 'text-alabaster/25' : 'text-orange'}`}>
                                    <Icon icon={notificationIcon(notif.type)} className="text-base" />
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-body text-sm leading-snug truncate
                                                   ${notif.read ? 'text-alabaster/50' : 'text-white'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="font-body text-xs text-alabaster/35 mt-0.5 line-clamp-2 leading-relaxed">
                                        {notif.body}
                                    </p>
                                    <p className="font-display text-[10px] tracking-wide text-alabaster/25 mt-1 uppercase">
                                        {timeAgo(notif.createdAt)}
                                    </p>
                                </div>

                                {/* Unread dot */}
                                {!notif.read && (
                                    <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-orange" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
