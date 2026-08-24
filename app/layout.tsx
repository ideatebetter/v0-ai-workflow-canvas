import React from "react"
import type { Metadata } from 'next'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { ResizeObserverErrorSuppressor } from "@/components/resize-observer-suppressor"

import './globals.css'

export const metadata: Metadata = {
  title: 'Atlas - Design Operations Platform by Ideate',
  description: 'A node-based design operations platform for managing design files, documents, and brand assets.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ResizeObserverErrorSuppressor />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="atlas-theme"
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
