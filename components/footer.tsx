export default function Footer() {
    return (
        <footer className="w-full py-8 flex justify-center items-center">
            {/* Opsi 1: Simple & Elegant */}
            <span className="text-muted-foreground text-sm mr-2">LiatDuit ©2025 by </span>
            <span className="text-base font-semibold bg-gradient-to-r from-[#00BDF2] via-[#FF4B6B] to-[#FFB800] bg-clip-text text-transparent hover:from-[#FFB800] hover:via-[#FF4B6B] hover:to-[#00BDF2] transition-all duration-500">
                <a href="https://github.com/aziziega" target="_blank" rel="noopener noreferrer">azz</a>
            </span>

            {/* Opsi 2: Minimalist (uncomment untuk pakai ini)
            <span className="text-muted-foreground text-sm">
                LiatDuit © 2026 • <a href="https://github.com/aziziega" target="_blank" className="font-medium hover:text-foreground transition-colors">azz</a>
            </span>
            */}

            {/* Opsi 3: Modern Tech (uncomment untuk pakai ini)
            <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">made by</span>
                <span className="px-3 py-1 rounded-full border border-border/50 bg-gradient-to-r from-[#00BDF2]/10 via-[#FF4B6B]/10 to-[#FFB800]/10 backdrop-blur">
                    <a href="https://github.com/aziziega" target="_blank" className="font-semibold bg-gradient-to-r from-[#00BDF2] via-[#FF4B6B] to-[#FFB800] bg-clip-text text-transparent hover:scale-105 inline-block transition-transform">
                        azz
                    </a>
                </span>
            </div>
            */}

            {/* Opsi 4: Super Simple (uncomment untuk pakai ini)
            <span className="text-muted-foreground text-xs">
                © 2026 <span className="font-medium text-foreground">azz</span> • LiatDuit
            </span>
            */}
        </footer>
    )
}