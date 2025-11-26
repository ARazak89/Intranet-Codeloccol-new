"use server"

import { cookies } from "next/headers"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL


export async function slotMine() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/availability/mine'`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    console.log("==========================================res.json()=================================")
    console.log(res.json())
    console.log("==========================================res.json()=================================")
    return res.json()

}

export async function createSlote(body:any) {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/availability`, {
        method : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: body,
    })

    if (!res.ok) return null
    return res.json()
}

export async function deleteSlote(id:string) {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/availability/${id}`, {
        method : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()
}