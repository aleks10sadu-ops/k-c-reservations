import type { Metadata } from "next"
import { Onest } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/Header"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { NotificationProvider } from "@/components/providers/NotificationProvider"

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
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
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
            <NotificationProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                {/* Footer */}
                <footer className="w-full py-6 mt-12">
                  <div className="container mx-auto px-4 flex justify-center items-center">
                    <p className="text-sm text-neutral-400 font-medium">
                      Сайт сделан{' '}
                      <a
                        href="https://t.me/Kvazar27"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-500 hover:text-amber-600 transition-colors"
                      >
                        @Kvazar27
                      </a>
                    </p>
                  </div>
                </footer>
              </div>
              <Toaster />
            </NotificationProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
