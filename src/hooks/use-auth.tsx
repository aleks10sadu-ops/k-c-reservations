"use client"

import { createContext, useContext, useEffect, useState } from 'react'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<UserRole | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchUserAndRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single()

                    setRole((profile?.role as UserRole) || 'guest')
                }
            } catch (error) {
                console.error('Error fetching auth state:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserAndRole()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null
                setUser(currentUser)

                if (currentUser) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentUser.id)
                        .single()
                    setRole((profile?.role as UserRole) || 'guest')
                } else {
                    setRole(null)
                }

                setIsLoading(false)
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

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
