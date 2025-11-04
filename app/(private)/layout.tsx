"use client"

import useAuth from '@/hooks/useAuth'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';

const PrivatePagesLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth() || {};
    const router = useRouter();

    useEffect(() => {
        console.log('Layout check:', { user, loading });

        if (!loading && !user) {
            console.log('No user, redirecting to login...');
            router.push('/');
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

    // Not authenticated
    if (!user) {
        return null;
    }

    return (
        <div>
            {children}
        </div>
    )
}

export default PrivatePagesLayout;