"use client";

import { createContext, useEffect, useState } from "react";
import client from "@/api/client";

interface AuthContextType {
    user: any;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        client.auth.getSession().then(({ data }: { data: any }) => {
            setUser(data?.session?.user || null);
            setLoading(false);
        })

        const { data: listener } = client.auth.onAuthStateChange((e, session) => {
            setUser(session?.user || null);
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