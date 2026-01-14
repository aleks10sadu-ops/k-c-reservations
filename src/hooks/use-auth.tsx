"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export type UserRole = 'guest' | 'waiter' | 'admin' | 'director' | 'manager'

interface AuthContextType {
    user: User | null
    role: UserRole | null
    isLoading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    isLoading: true,
    signOut: async () => { },
})

const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<UserRole | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const initRef = useRef(false)
    const mountRef = useRef(true)

    useEffect(() => {
        mountRef.current = true
        if (initRef.current) return
        initRef.current = true

        console.log('[Auth] Initializing AuthProvider...')

        // Set a global timeout to ensure we ALWAYS stop loading after some time
        const globalTimeout = setTimeout(() => {
            if (mountRef.current) {
                setIsLoading(currentLoading => {
                    if (currentLoading) {
                        console.warn('[Auth] GLOBAL AUTH TIMEOUT - Forcing loading: false')
                        return false
                    }
                    return currentLoading
                })
            }
        }, 8000) // Reduced to 8 seconds

        const fetchRole = async (u: User) => {
            // 1. Try to get role from metadata (Instant)
            const metaRole = u.app_metadata?.role as UserRole | undefined
            if (metaRole && ['guest', 'waiter', 'admin', 'director', 'manager'].includes(metaRole)) {
                console.log('[Auth] Role from metadata:', metaRole)
                if (mountRef.current) {
                    setRole(metaRole)
                    setIsLoading(false)
                    clearTimeout(globalTimeout)
                    return
                }
            }

            // 2. Fallback to database (Slower)
            try {
                console.log('[Auth] Fetching role for:', u.email)
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', u.id)
                    .single()

                if (mountRef.current) {
                    if (error) {
                        console.error('[Auth] Profile fetch error:', error)
                        // If metadata failed AND db failed, we might be in a weird state. 
                        // But defaulting to guest is better than infinite load.
                        setRole('guest')
                    } else {
                        console.log('[Auth] Profile fetched. Role:', data?.role)
                        setRole((data?.role as UserRole) || 'guest')
                    }
                }
            } catch (err) {
                console.error('[Auth] Unexpected error in fetchRole:', err)
                if (mountRef.current) setRole('guest')
            } finally {
                if (mountRef.current) {
                    setIsLoading(false)
                    clearTimeout(globalTimeout)
                }
            }
        }

        const handleAuth = async (sessionUser: User | null) => {
            console.log('[Auth] handleAuth user:', sessionUser?.email || 'none')
            if (!mountRef.current) return

            setUser(sessionUser)
            if (sessionUser) {
                // Always check role, even if we have one, to ensure it matches current metadata/DB
                await fetchRole(sessionUser)
            } else {
                setRole(null)
                setIsLoading(false)
                clearTimeout(globalTimeout)
            }
        }

        // We use onAuthStateChange with initial session instead of manual getUser
        // this is more reliable in newer supabase-js versions
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[Auth] onAuthStateChange event:', event)

                // Only process major auth events or the initial session
                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                    handleAuth(session?.user || null)
                }
            }
        )

        return () => {
            mountRef.current = false
            subscription.unsubscribe()
            clearTimeout(globalTimeout)
        }
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, role, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
