"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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

    // Use ref to track the latest notification ID to avoid stale closures in subscription
    const lastNotificationIdRef = useRef<string | null>(null)
    const lastPollTimeRef = useRef(new Date().toISOString())
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

    // Initial fetch
    const fetchState = async () => {
        try {
            const [count, list] = await Promise.all([
                getUnreadCount(),
                getNotifications(20) // Get last 20 by default
            ])
            setUnreadCount(count)
            setNotifications(list)

            // Update ref
            if (list.length > 0) {
                lastNotificationIdRef.current = list[0].id
            }
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
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: any) => {
                    const newNotification = payload.new as Notification

                    if (!newNotification || !newNotification.id) return

                    // Deduplicate events
                    if (newNotification.id === lastNotificationIdRef.current) return
                    lastNotificationIdRef.current = newNotification.id

                    // Update lastPollTime to prevent polling overlap
                    lastPollTimeRef.current = newNotification.created_at

                    toast(newNotification.title, {
                        description: newNotification.message,
                        action: newNotification.link ? {
                            label: 'Перейти',
                            onClick: () => window.location.href = newNotification.link!
                        } : undefined
                    })

                    fetchState()
                }
            )
            .subscribe((status: any) => {
                setIsRealtimeConnected(status === 'SUBSCRIBED')
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, role])

    // Fallback polling for notifications
    useEffect(() => {
        if (isRealtimeConnected || !user) return

        const interval = setInterval(async () => {
            try {
                // Fetch notifications created AFTER the last known time
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .gt('created_at', lastPollTimeRef.current)
                    // If multiple notifications in 2s, sort by oldest first to update LastPollTime incrementally?
                    // No, sort by created_at ASC so we process them in order
                    .order('created_at', { ascending: true })

                if (data && data.length > 0) {
                    // Update timestamp to the newest one
                    lastPollTimeRef.current = data[data.length - 1].created_at

                    data.forEach((newNotification: any) => {
                        // Dedup
                        if (newNotification.id === lastNotificationIdRef.current) return
                        lastNotificationIdRef.current = newNotification.id

                        toast(newNotification.title, {
                            description: newNotification.message,
                            action: newNotification.link ? {
                                label: 'Перейти',
                                onClick: () => window.location.href = newNotification.link!
                            } : undefined
                        })
                    })

                    fetchState()
                }
            } catch (err) {
                console.error('Polling notifications error:', err)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [isRealtimeConnected, user])

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
