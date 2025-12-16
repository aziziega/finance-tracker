"use client";

import { createContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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
        const supabase = createClient();

        // Initial session check
        supabase.auth.getSession().then(async ({ data }: { data: any }) => {
            const currentUser = data?.session?.user || null
            setUser(currentUser)

            // ✅ Initialize user defaults on first session check
            if (currentUser) {
                try {
                    const response = await fetch('/api/user/initialize', {
                        method: 'POST'
                    })
                    const result = await response.json()
                    console.log('📦 Initialize result:', result)
                } catch (error) {
                    console.error('Failed to initialize user:', error)
                }
            }

            setLoading(false)
        })

        // Listen to auth changes
        const { data: listener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setUser(session?.user || null)

                // ✅ Initialize on sign in (only runs once per user due to check in API)
                if (session?.user) {
                    try {
                        const response = await fetch('/api/user/initialize', {
                            method: 'POST'
                        })
                        const result = await response.json()
                        console.log('📦 Initialize result:', result)
                    } catch (error) {
                        console.error('Failed to initialize user:', error)
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null)
            }
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