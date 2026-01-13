import type { Metadata } from "next"
import { Onest } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/Header"
import { TooltipProvider } from "@/components/ui/tooltip"

const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Kucher&Conga | Система бронирований",
  description: "CRM система для управления бронированиями ресторана Kucher&Conga",
  icons: {
    icon: "/favicon.ico",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
}

import { AuthProvider } from "@/hooks/use-auth"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={onest.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <TooltipProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
