"use server"

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getMineEvaluations() {
   
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/evaluations/mine`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return []
    return res.json()
}

export async function getPendingAsEvaluator() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/evaluations/pending-as-evaluator`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()

}

export async function submitEvaluation(boby:any) {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/evaluations`,
        {
        method: 'POST',
        body: JSON.stringify(boby),
      }
        )

    if (!res.ok) return null
    return res.json()
}

export async function evaluationsForStafs() {
    //'/evaluations/all-for-staff'
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/evaluations/all-for-staff`,
        {
        method: 'GET',
      }
        )

    if (!res.ok) return null
    return res.json()
}

export async function evaluationsCanceled() {
    ///projects/cancelled
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}projects/cancelled`,
        {
        method: 'GET',
      }
        )

    if (!res.ok) return null
    return res.json()
}