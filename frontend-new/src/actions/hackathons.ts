"use server"

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getHackathons() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/hackathons`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()
}
    