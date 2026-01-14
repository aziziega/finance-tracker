"use client"
import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                disabled>
                <Sun className="h-4 w-4" />
            </Button>
        )
    }

    return (
        <Button
            onClick={toggleTheme}
            variant="outline"
            size="sm"
            className="cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <Sun className={cn("h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90")} />
            <Moon className={cn("absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0")} />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}