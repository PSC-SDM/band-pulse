'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
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
        <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
            <p className="mt-4 text-alabaster font-body">Completing sign in...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-night">
            <Suspense
                fallback={
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
                        <p className="mt-4 text-alabaster font-body">Loading...</p>
                    </div>
                }
            >
                <AuthCallbackContent />
            </Suspense>
        </div>
    );
}
