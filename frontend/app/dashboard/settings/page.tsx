'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationPreferences } from '@/types';
import { getUserProfile, updateNotificationPreferences } from '@/lib/notifications';

// ─── Toggle Component ────────────────────────────────────────────────────────

function Toggle({
    enabled,
    onChange,
    disabled,
}: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center
                        rounded-full border-2 border-transparent transition-colors duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-orange
                        disabled:opacity-40 disabled:cursor-not-allowed
                        ${enabled ? 'bg-orange' : 'bg-prussian-light'}`}
        >
            <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full
                            bg-white shadow-lg transition-transform duration-200
                            ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
            />
        </button>
    );
}

// ─── Setting Row ─────────────────────────────────────────────────────────────

function SettingRow({
    label,
    description,
    enabled,
    onChange,
    disabled,
}: {
    label: string;
    description: string;
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-6 py-4 border-b border-white/[0.06] last:border-0">
            <div className="flex-1 min-w-0">
                <p className="text-white font-body text-sm font-medium">{label}</p>
                <p className="text-alabaster/50 font-body text-xs mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
            <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
        </div>
    );
}

// ─── Days Selector ───────────────────────────────────────────────────────────

const DAYS_OPTIONS = [1, 2, 3, 5, 7] as const;

function DaysSelector({
    value,
    onChange,
    disabled,
}: {
    value: number;
    onChange: (days: number) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex gap-2 flex-wrap">
            {DAYS_OPTIONS.map((days) => (
                <button
                    key={days}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(days)}
                    className={`px-3 py-1.5 text-sm font-body border transition-colors duration-150
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${value === days
                            ? 'bg-orange text-night border-orange font-medium'
                            : 'bg-transparent text-alabaster/60 border-white/10 hover:border-orange/50 hover:text-alabaster'
                        }`}
                >
                    {days}d
                </button>
            ))}
        </div>
    );
}

// ─── Default preferences ──────────────────────────────────────────────────────

const DEFAULT_PREFS: NotificationPreferences = {
    newConcerts: true,
    tourAnnouncements: true,
    concertReminders: true,
    daysBeforeConcert: 3,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const token = (session as any)?.accessToken as string | undefined;

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    // Load current preferences from the user profile
    useEffect(() => {
        if (!token) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const profile = await getUserProfile(token);
                if (profile.notificationPreferences) {
                    setPrefs(profile.notificationPreferences);
                }
            } catch {
                // Keep defaults silently — user can still save
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [token]);

    const handleSave = async () => {
        if (!token) return;
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            await updateNotificationPreferences(token, prefs);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const update = (key: keyof NotificationPreferences, value: boolean | number) => {
        setSaveStatus('idle');
        setPrefs((prev) => ({ ...prev, [key]: value }));
    };

    if (status === 'loading') {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-night">
                <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full
                                  border-4 border-solid border-orange border-r-transparent" />
                    <p className="mt-4 text-alabaster font-body">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-night min-h-[calc(100vh-73px-65px)]">
            <div className="mx-auto max-w-2xl px-6 py-8">

                {/* Header */}
                <header className="mb-8">
                    <h1
                        className="text-4xl font-accent text-white mb-2 opacity-0 animate-fade-up"
                        style={{ animationFillMode: 'forwards' }}
                    >
                        Notifications
                    </h1>
                    <p
                        className="text-alabaster/60 font-body text-lg opacity-0 animate-fade-up stagger-1"
                        style={{ animationFillMode: 'forwards' }}
                    >
                        Choose what alerts you receive and when
                    </p>
                </header>

                {/* Concert Alerts Section */}
                <section
                    className="mb-6 opacity-0 animate-fade-up stagger-2"
                    style={{ animationFillMode: 'forwards' }}
                >
                    <h2 className="text-xs font-display uppercase tracking-widest text-alabaster/40 mb-3">
                        Concert Alerts
                    </h2>
                    <div className="bg-prussian border border-white/[0.06] px-6">
                        <SettingRow
                            label="New concerts"
                            description="Get notified when an artist you follow announces a new show"
                            enabled={prefs.newConcerts}
                            onChange={(v) => update('newConcerts', v)}
                            disabled={isLoading}
                        />
                        <SettingRow
                            label="Tour announcements"
                            description="Alert me when a followed artist announces a full tour"
                            enabled={prefs.tourAnnouncements}
                            onChange={(v) => update('tourAnnouncements', v)}
                            disabled={isLoading}
                        />
                    </div>
                </section>

                {/* Reminders Section */}
                <section
                    className="mb-8 opacity-0 animate-fade-up stagger-3"
                    style={{ animationFillMode: 'forwards' }}
                >
                    <h2 className="text-xs font-display uppercase tracking-widest text-alabaster/40 mb-3">
                        Reminders
                    </h2>
                    <div className="bg-prussian border border-white/[0.06] px-6">
                        <SettingRow
                            label="Concert reminders"
                            description="Send me a reminder before an upcoming show"
                            enabled={prefs.concertReminders}
                            onChange={(v) => update('concertReminders', v)}
                            disabled={isLoading}
                        />

                        {/* Days before selector — only shown when reminders are enabled */}
                        {prefs.concertReminders && (
                            <div className="py-4">
                                <p className="text-white font-body text-sm font-medium mb-1">
                                    Remind me
                                    <span className="text-orange mx-1">{prefs.daysBeforeConcert}</span>
                                    {prefs.daysBeforeConcert === 1 ? 'day' : 'days'} before
                                </p>
                                <p className="text-alabaster/50 font-body text-xs mb-3">
                                    How many days in advance should we send the reminder?
                                </p>
                                <DaysSelector
                                    value={prefs.daysBeforeConcert}
                                    onChange={(d) => update('daysBeforeConcert', d)}
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Save Button + Status */}
                <div
                    className="opacity-0 animate-fade-up stagger-4"
                    style={{ animationFillMode: 'forwards' }}
                >
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="px-8 py-3 bg-orange text-night font-body font-semibold text-sm
                                       transition-all duration-200 hover:bg-orange-light
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2
                                       focus-visible:ring-offset-night"
                        >
                            {isSaving ? 'Saving…' : 'Save preferences'}
                        </button>

                        {saveStatus === 'success' && (
                            <p className="text-sm font-body text-orange animate-fade-in">
                                Preferences saved
                            </p>
                        )}

                        {saveStatus === 'error' && (
                            <p className="text-sm font-body text-orange/70 animate-fade-in">
                                Failed to save. Please try again.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
