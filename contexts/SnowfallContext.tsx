"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SnowfallContextType {
    isSnowfallEnabled: boolean
    toggleSnowfall: () => void
}

const SnowfallContext = createContext<SnowfallContextType | undefined>(undefined)

export function SnowfallProvider({ children }: { children: React.ReactNode }) {
    const [isSnowfallEnabled, setIsSnowfallEnabled] = useState(true)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('snowfall-enabled')
        if (saved !== null) {
            setIsSnowfallEnabled(saved === 'true')
        }
    }, [])

    const toggleSnowfall = () => {
        setIsSnowfallEnabled(prev => {
            const newValue = !prev
            localStorage.setItem('snowfall-enabled', String(newValue))
            return newValue
        })
    }

    return (
        <SnowfallContext.Provider value={{ isSnowfallEnabled, toggleSnowfall }}>
            {children}
        </SnowfallContext.Provider>
    )
}

export function useSnowfall() {
    const context = useContext(SnowfallContext)
    if (context === undefined) {
        throw new Error('useSnowfall must be used within SnowfallProvider')
    }
    return context
}
