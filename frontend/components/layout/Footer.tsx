'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function Footer() {
    const pathname = usePathname();

    // No mostrar footer en login/register
    const hideOnRoutes = ['/login', '/register'];
    if (hideOnRoutes.includes(pathname)) return null;

    return (
        <footer className="py-8 bg-prussian border-t border-prussian-light/50">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-6 h-6 bg-night rounded flex items-center justify-center">
                            <Icon icon="mdi:pulse" className="text-xs text-orange" />
                        </div>
                        <span className="font-display text-xs tracking-wider text-alabaster">
                            BANDPULSE
                        </span>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/privacy" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                            Terms
                        </Link>
                        <Link href="/contact" className="font-body text-sm text-alabaster/60 hover:text-white transition-colors">
                            Contact
                        </Link>
                    </nav>
                    <p className="font-body text-sm text-alabaster/40">
                        &copy; {new Date().getFullYear()} BandPulse
                    </p>
                </div>
            </div>
        </footer>
    );
}
