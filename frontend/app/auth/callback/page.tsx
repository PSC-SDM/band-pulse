'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Guardar el token en localStorage
            localStorage.setItem('bandpulse_token', token);
            // Redirigir al dashboard
            router.push('/dashboard');
        } else {
            // Si no hay token, redirigir al login
            router.push('/login');
        }
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-night">
            <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
                <p className="mt-4 text-alabaster font-body">Completing sign in...</p>
            </div>
        </div>
    );
}
