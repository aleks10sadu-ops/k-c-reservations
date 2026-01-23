"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { getUnreadCount, markAllNotificationsAsRead, getNotifications, markNotificationAsRead } from '@/lib/notifications'
import type { Notification } from '@/types'

interface NotificationContextType {
    unreadCount: number
    notifications: Notification[]
    isLoading: boolean
    refetch: () => Promise<void>
    markAllAsRead: () => Promise<void>
    markAsRead: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    notifications: [],
    isLoading: true,
    refetch: async () => { },
    markAllAsRead: async () => { },
    markAsRead: async () => { },
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user, role } = useAuth()
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    // Initial fetch
    const fetchState = async () => {
        try {
            const [count, list] = await Promise.all([
                getUnreadCount(),
                getNotifications(20) // Get last 20 by default
            ])
            setUnreadCount(count)
            setNotifications(list)
        } catch (error) {
            console.error('Error fetching notification state:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (!user) {
            setNotifications([])
            setUnreadCount(0)
            setIsLoading(false)
            return
        }

        fetchState()

        // Subscribe to changes
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                async (payload) => {
                    // Optimization: Realtime broadcasts to everyone. We must filter.
                    // Since we don't have all IDs handy to filter efficiently client-side without leaks,
                    // we rely on the server action (which obeys RLS) to tell us if we have something new.

                    const previousTopId = notifications.length > 0 ? notifications[0].id : null

                    // Refetch state from server (secure)
                    const [count, list] = await Promise.all([
                        getUnreadCount(),
                        getNotifications(1) // Just need the top one to check
                    ])

                    // If we have a new item at the top that wasn't there before, it's a new notification FOR US
                    const newTopItem = list.length > 0 ? list[0] : null

                    if (newTopItem && newTopItem.id !== previousTopId) {
                        // It's a new, relevant notification!
                        toast(newTopItem.title, {
                            description: newTopItem.message,
                            action: newTopItem.link ? {
                                label: 'Перейти',
                                onClick: () => window.location.href = newTopItem.link!
                            } : undefined
                        })

                        // Update full state
                        setUnreadCount(count)
                        // We could optimize and just unshift, but let's do a full fetch to be safe or just trigger the full fetch now
                        fetchState()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, role])

    const markAllAsReadClient = async () => {
        // Optimistic update
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

        await markAllNotificationsAsRead()
        await fetchState() // Sync
    }

    const markAsReadClient = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await markNotificationAsRead(id)
        // No full refetch needed usually
    }

    return (
        <NotificationContext.Provider value={{
            unreadCount,
            notifications,
            isLoading,
            refetch: fetchState,
            markAllAsRead: markAllAsReadClient,
            markAsRead: markAsReadClient
        }}>
            {children}
        </NotificationContext.Provider>
    )
}
