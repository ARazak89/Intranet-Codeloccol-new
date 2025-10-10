'use server'

import { cookies } from 'next/headers'
import { config } from '@/lib/config'

const API_BASE_URL = config.apiUrl

export async function login(email: string, password: string) {
  const cookieStore = await cookies()
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)

    const data = await res.json()

    if (!data.token) throw new Error('Token manquant')

       cookieStore.set('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24h
      })
    
      return data.user
    
  } catch (err) {
    console.error('Erreur de connexion:', err)
    return { success: false, error: 'Échec de la connexion' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
   cookieStore.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return { success: true }
}
