"use client"

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function NotificationBell() {
    const { unreadCount, notifications, markAllAsRead, isLoading } = useNotifications()
    const [open, setOpen] = useState(false)

    const handleMarkAllRead = async () => {
        await markAllAsRead()
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                    <Bell className="h-5 w-5 text-stone-600" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-lg sm:w-96">
                <div className="flex items-center justify-between border-b px-4 py-3 bg-stone-50">
                    <h4 className="font-semibold text-stone-900">Уведомления</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="h-auto px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Прочитать все
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center text-sm text-stone-500">
                            Загрузка...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-stone-500">
                            <Bell className="h-10 w-10 opacity-20" />
                            <p className="text-sm">Нет новых уведомлений</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-stone-50",
                                        !notification.is_read && "bg-amber-50/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-medium text-stone-900">
                                            {notification.title}
                                        </span>
                                        <span className="shrink-0 text-[10px] text-stone-400">
                                            {format(new Date(notification.created_at), 'dd MMM HH:mm', { locale: ru })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-600 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    {notification.link && (
                                        <a
                                            href={notification.link}
                                            className="mt-1 self-start text-xs font-medium text-amber-600 hover:underline"
                                            onClick={() => setOpen(false)}
                                        >
                                            Перейти →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
