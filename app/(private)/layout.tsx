"use client"

import useAuth from '@/hooks/useAuth'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';
import Snowfall from 'react-snowfall';
import { useSnowfall } from '@/contexts/SnowfallContext';

const PrivatePagesLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth() || {};
    const router = useRouter();
    const { isSnowfallEnabled } = useSnowfall();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/'); // Redirect to home page if not authenticated
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
    if (loading || !user) return null;


    return (
        <div className="relative">
            {isSnowfallEnabled && <Snowfall color="white" snowflakeCount={200} />}
            {children}
        </div>
    )
}

export default PrivatePagesLayout;