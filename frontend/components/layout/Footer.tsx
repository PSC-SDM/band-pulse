'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { AnimatedActivity, type AnimatedActivityHandle } from '@/components/logo/AnimatedActivity';

export default function Footer() {
    const pathname = usePathname();
    const logoRef = useRef<AnimatedActivityHandle>(null);

    // No mostrar footer en login/register
    const hideOnRoutes = ['/login', '/register'];
    if (hideOnRoutes.includes(pathname)) return null;

    return (
        <footer className="relative py-12 bg-prussian border-t border-prussian-light/30 overflow-hidden">
            {/* Background accent */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-night/50 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    {/* Logo and tagline */}
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-3"
                            onMouseEnter={() => logoRef.current?.startAnimation()}
                            onMouseLeave={() => logoRef.current?.stopAnimation()}
                        >
                            <div className="w-8 h-8 bg-night flex items-center justify-center
                                          hover:bg-night/80 transition-colors">
                                <AnimatedActivity ref={logoRef} size={16} />
                            </div>
                            <span className="font-display text-xs tracking-[0.15em] text-alabaster">
                                BANDPULSE
                            </span>
                        </Link>
                        <p className="font-body text-xs text-alabaster/40 max-w-xs">
                            Your live music radar. Never miss a concert again.
                        </p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-8">
                        <Link 
                            href="/privacy" 
                            className="group flex items-center gap-2 font-body text-sm text-alabaster/50 hover:text-white transition-colors"
                        >
                            <div className="w-1 h-1 bg-alabaster/30 group-hover:bg-orange transition-colors" />
                            Privacy
                        </Link>
                        <Link 
                            href="/terms" 
                            className="group flex items-center gap-2 font-body text-sm text-alabaster/50 hover:text-white transition-colors"
                        >
                            <div className="w-1 h-1 bg-alabaster/30 group-hover:bg-orange transition-colors" />
                            Terms
                        </Link>
                        <Link 
                            href="/contact" 
                            className="group flex items-center gap-2 font-body text-sm text-alabaster/50 hover:text-white transition-colors"
                        >
                            <div className="w-1 h-1 bg-alabaster/30 group-hover:bg-orange transition-colors" />
                            Contact
                        </Link>
                    </nav>

                    {/* Copyright */}
                    <p className="font-display text-[10px] tracking-wider text-alabaster/30 uppercase">
                        &copy; {new Date().getFullYear()} BandPulse
                    </p>
                </div>
            </div>
        </footer>
    );
}
