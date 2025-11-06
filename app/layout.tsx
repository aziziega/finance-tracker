import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { HeroHeader } from "@/components/header";
import React from "react";
import { AuthProvider } from "@/components/context/AuthProvider";
import { Toaster } from "sonner"; // 
import type { Metadata } from 'next'


export const metadata: Metadata = {
  title: 'Finance Tracker',
  description: 'Personal Finance Management System',
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
          <AuthProvider>
            <HeroHeader />
            {children}
          </AuthProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html >
  );
}
