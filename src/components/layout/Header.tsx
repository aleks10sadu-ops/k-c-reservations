"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  LayoutGrid,
  UtensilsCrossed,
  Users,
  CreditCard,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth, UserRole } from '@/hooks/use-auth'
import { History, Briefcase, Table2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navigationItems: { name: string; href: string; icon: any; roles: UserRole[] }[] = [
  { name: 'Бронирования', href: '/', icon: CalendarDays, roles: ['admin', 'director', 'manager'] },
  { name: 'Залы', href: '/halls', icon: LayoutGrid, roles: ['admin', 'director', 'manager'] },
  { name: 'Меню', href: '/menu', icon: UtensilsCrossed, roles: ['admin', 'director', 'manager'] },
  { name: 'Гости', href: '/guests', icon: Users, roles: ['admin', 'director', 'manager'] },
  { name: 'Оплата', href: '/payments', icon: CreditCard, roles: ['admin', 'director', 'manager'] },
  { name: 'Персонал', href: '/staff', icon: Briefcase, roles: ['waiter', 'admin', 'director', 'manager'] },
  { name: 'Аудит', href: '/audit', icon: History, roles: ['director', 'manager'] },
  { name: 'Настройки', href: '/reservations/settings', icon: Table2, roles: ['admin', 'director', 'manager'] },
]

export function Header() {
  const { user, role, signOut, isLoading } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (isLoading) return null
  if (!user) return null

  const navigation = navigationItems.filter(item => role && item.roles.includes(role))

  const getInitials = (email: string | undefined) => {
    if (!email) return '??'
    return email.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: UserRole | null) => {
    switch (role) {
      case 'director': return 'Управляющий'
      case 'manager': return 'Менеджер'
      case 'admin': return 'Администратор'
      case 'waiter': return 'Официант'
      case 'guest': return 'Гость'
      default: return role ? 'Пользователь' : 'Загрузка...'
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-xl print:hidden">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg font-bold text-white">K&C</span>
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-stone-900">Kucher&Conga</h1>
            <p className="text-xs text-stone-500">Система бронирований</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-amber-700"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl bg-amber-100 -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>

        {/* User Menu & Mobile Button */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-amber-200">
                  <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-amber-100 text-amber-700">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate w-32">{getRoleLabel(role)}</span>
                  <span className="text-xs text-stone-500 truncate w-32">{user.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  Профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-stone-200 bg-white md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-amber-100 text-amber-700"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

