import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { HeroHeader } from "@/components/header";
import React from "react";
import { AuthProvider } from "@/components/context/AuthProvider";
import { Toaster } from "sonner";
import type { Metadata } from 'next'
import { SnowfallProvider } from "@/contexts/SnowfallContext";
import Footer from "@/components/footer";


export const metadata: Metadata = {
  title: 'LiatDuit - Manage Your Money Wisely',
  description: 'Track expenses, manage wallets, and monitor your financial health with our intuitive finance tracking app.',
  keywords: ['finance', 'money', 'budget', 'expense tracker', 'wallet management', 'LiatDuit'],
  authors: [{ name: 'aziziega' }],
  openGraph: {
    title: 'LiatDuit',
    description: 'Personal Finance Management System',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LiatDuit',
    description: 'Manage Your Money Wisely',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SnowfallProvider>
            <AuthProvider>
              <HeroHeader />
              {children}
            </AuthProvider>
          </SnowfallProvider>
          <Toaster position="top-right" />
          <Footer/>
        </ThemeProvider>
      </body>
    </html >
  );
}
