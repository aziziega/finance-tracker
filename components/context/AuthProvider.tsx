"use client";

import { createContext, useEffect, useState } from "react";
import client from "@/api/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
    user: any;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Initial session check
        client.auth.getSession().then(({ data }: { data: any }) => {
            setUser(data?.session?.user || null);
            setLoading(false);
        })

        // Listen to auth changes - only update on successful sign in/out
        const { data: listener } = client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
            // Only update user state on actual auth state changes, not on errors
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setUser(session?.user || null);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
            // Ignore other events like 'USER_UPDATED', 'PASSWORD_RECOVERY' to prevent race conditions
        });

        return () => {
            listener.subscription.unsubscribe();
        }

    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export { AuthContext, AuthProvider };
