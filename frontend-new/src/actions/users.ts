// actions/users.ts
'use server'

import { cookies } from 'next/headers'
import { config } from '@/lib/config'

const API_BASE_URL = config.apiUrl

export async function getMe() {
    const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null

  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null
  return res.json()
}

export async function getUsers() {
    const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null

  const res = await fetch(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null
  return res.json()
}

export async function updateUser(body:any) {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return null
  
    const res = await fetch(`${API_BASE_URL}/users/${body.id}`, {
    method: "PUT",
    body: body.body,
    headers: { Authorization: `Bearer ${token}` },
    })
  
    if (!res.ok) return null
    return res.json()
}