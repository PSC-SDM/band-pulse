'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import { useRef, useState, useEffect } from 'react';
import { AnimatedActivity, type AnimatedActivityHandle } from '@/components/logo/AnimatedActivity';
import NotificationBell from '@/components/notifications/NotificationBell';

const NAV_LINKS = [
    { href: '/dashboard', icon: 'mdi:view-dashboard', label: 'Dashboard', exact: true },
    { href: '/dashboard/artists', icon: 'mdi:account-music', label: 'Artists' },
    { href: '/dashboard/your-pulse', icon: 'mdi:map-marker-radius', label: 'Your Pulse' },
    { href: '/dashboard/explore', icon: 'mdi:compass-outline', label: 'Explore' },
];

export default function Header() {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const logoRef = useRef<AnimatedActivityHandle>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isAuthenticated = status === 'authenticated';
    const isLoading = status === 'loading';
    const token = (session as any)?.accessToken as string | undefined;

    // All hooks must be called before any conditional returns
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const hideOnRoutes = ['/login', '/register'];
    if (hideOnRoutes.includes(pathname)) return null;

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    const handleMobileNav = (href: string) => {
        setIsMenuOpen(false);
        router.push(href);
    };

    return (
        <header className="sticky top-0 z-50 bg-night/95 backdrop-blur-md border-b border-prussian-light/30">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-3"
                    onMouseEnter={() => logoRef.current?.startAnimation()}
                    onMouseLeave={() => logoRef.current?.stopAnimation()}
                >
                    <AnimatedActivity ref={logoRef} size={20} />
                    <span className="font-display text-sm tracking-[0.15em] text-white">
                        BANDPULSE
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {isLoading ? (
                        <div className="h-5 w-24 bg-prussian-light/50 animate-pulse rounded" />
                    ) : isAuthenticated ? (
                        <>
                            {NAV_LINKS.map(({ href, icon, label, exact }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`group flex items-center gap-2 font-body text-sm px-3 py-2 transition-all duration-200
                                        ${isActive(href, exact)
                                            ? 'text-orange border-b-2 border-orange'
                                            : 'text-alabaster/60 hover:text-white border-b-2 border-transparent hover:border-alabaster/20'
                                        }`}
                                >
                                    <Icon icon={icon} className="text-base" />
                                    <span>{label}</span>
                                </Link>
                            ))}

                            <div className="w-px h-5 bg-prussian-light/50 mx-3" />

                            {token && (
                                <div className="mr-2">
                                    <NotificationBell token={token} />
                                </div>
                            )}

                            <span className="hidden lg:block font-body text-xs text-alabaster/40 mr-3">
                                {session?.user?.email}
                            </span>

                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="group flex items-center gap-2 font-body text-sm px-4 py-2
                                         bg-prussian/50 text-alabaster/70 border-l-2 border-transparent
                                         hover:text-white hover:border-orange hover:bg-prussian
                                         transition-all duration-300"
                            >
                                <span>Logout</span>
                                <Icon icon="mdi:logout" className="text-base opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="group flex items-center gap-2 font-body text-sm text-alabaster hover:text-orange transition-colors"
                        >
                            <span>Sign in</span>
                            <Icon icon="mdi:arrow-right" className="text-base opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>
                    )}
                </nav>

                {/* Mobile: Hamburger or Sign In */}
                <div className="flex md:hidden items-center gap-3">
                    {!isLoading && !isAuthenticated && (
                        <Link
                            href="/login"
                            className="font-body text-sm text-alabaster hover:text-orange transition-colors"
                        >
                            Sign in
                        </Link>
                    )}
                    {isAuthenticated && token && (
                        <NotificationBell token={token} />
                    )}
                    {isAuthenticated && (
                        <button
                            onClick={() => setIsMenuOpen((prev: boolean) => !prev)}
                            className="flex items-center justify-center w-10 h-10 text-alabaster/80 hover:text-white
                                       border border-prussian-light/40 hover:border-orange/50
                                       transition-all duration-200"
                            aria-label="Toggle menu"
                        >
                            <Icon
                                icon={isMenuOpen ? 'mdi:close' : 'mdi:menu'}
                                className="text-xl transition-transform duration-200"
                            />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && isAuthenticated && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-night/98 backdrop-blur-md border-b border-prussian-light/30 z-40">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <nav className="flex flex-col gap-1">
                            {NAV_LINKS.map(({ href, icon, label, exact }) => (
                                <button
                                    key={href}
                                    onClick={() => handleMobileNav(href)}
                                    className={`flex items-center gap-3 font-body text-sm px-4 py-3 text-left
                                        transition-all duration-200 border-l-2
                                        ${isActive(href, exact)
                                            ? 'border-orange text-white bg-prussian/40'
                                            : 'border-transparent text-alabaster/60 hover:text-white hover:border-alabaster/30 hover:bg-prussian/20'
                                        }`}
                                >
                                    <Icon icon={icon} className="text-lg" />
                                    <span>{label}</span>
                                </button>
                            ))}

                            <div className="my-3 border-t border-prussian-light/30" />

                            <div className="px-4 py-2">
                                <span className="font-body text-xs text-alabaster/40">
                                    {session?.user?.email}
                                </span>
                            </div>

                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="flex items-center gap-3 font-body text-sm px-4 py-3 text-left
                                         border-l-2 border-transparent text-alabaster/60
                                         hover:text-white hover:border-orange hover:bg-prussian/20
                                         transition-all duration-200"
                            >
                                <Icon icon="mdi:logout" className="text-lg" />
                                <span>Logout</span>
                            </button>
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
}
