"use server"

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export async function getMineNotifications() {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
   
    const res = await fetch(`${API_BASE_URL}/notifications/mine`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return null
    return res.json()
}


export async function markNotificationAsRead(notificationId: string) {

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    try {
  
      const res = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    return res.json()
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };