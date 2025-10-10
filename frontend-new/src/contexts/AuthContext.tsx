'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/actions/users'
import { login } from '@/actions/auth'

interface User {
  _id: string
  name: string
  email: string
  role: 'apprenant' | 'staff' | 'admin'
  profilePicture?: string
  daysRemaining: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const userData = await getMe()
      setUser(userData)
    } catch (error) {
      console.error(error)
      setUser(null)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const Login = async (email: string, password: string) => {
    try {
      const userData = await getMe()
      setUser( userData)
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const logout = async () => {
    // côté client, on peut juste rediriger, le cookie httpOnly sera supprimé par une route /logout côté serveur
    setUser(null)
    router.push('/login')
  }

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : null))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
