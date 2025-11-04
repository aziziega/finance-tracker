"use client"

import useAuth from '@/hooks/useAuth'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';

const AuthPagesLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth() || {};
    const router = useRouter();

    useEffect(() => {
        // ✅ Kalau user sudah login, redirect ke dashboard
        if (!loading && user) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Show loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Loading...</div>
            </div>
        );
    }

    // Already authenticated - akan redirect via useEffect
    if (user) {
        return null;
    }

    // Not authenticated - show auth pages
    return (
        <div>
            {children}
        </div>
    )
}

export default AuthPagesLayout;