"use server"

import { cookies } from 'next/headers'


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getProjects() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()
}

export async function getMineProjects() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/projects/my-projects`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()
}