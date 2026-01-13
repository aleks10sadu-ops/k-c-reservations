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

    useEffect(() => {
        if (initRef.current) return
        initRef.current = true

        console.log('[Auth] Initializing AuthProvider...')

        // Safety timeout to prevent infinite loading state
        const timeout = setTimeout(() => {
            setIsLoading(prev => {
                if (prev) {
                    console.warn('[Auth] Initialization timed out (8s). Forcing loading to false.')
                    return false
                }
                return prev
            })
        }, 8000)

        const fetchRole = async (u: User) => {
            try {
                console.log('[Auth] Fetching role for:', u.email)
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', u.id)
                    .single()

                if (error) {
                    console.error('[Auth] Profile fetch error:', error)
                    setRole('guest')
                } else {
                    console.log('[Auth] Profile fetched. Role:', data?.role)
                    setRole((data?.role as UserRole) || 'guest')
                }
            } catch (err) {
                console.error('[Auth] Unexpected error in fetchRole:', err)
                setRole('guest')
            } finally {
                setIsLoading(false)
                clearTimeout(timeout)
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null
                console.log('[Auth] Auth Event:', event, currentUser?.email || 'no-user')
                setUser(currentUser)

                if (currentUser) {
                    await fetchRole(currentUser)
                } else {
                    setRole(null)
                    setIsLoading(false)
                    clearTimeout(timeout)
                }
            }
        )

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const signOut = async () => {
        console.log('[Auth] Signing out...')
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
