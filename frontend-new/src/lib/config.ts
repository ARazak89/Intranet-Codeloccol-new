export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  baseUrl: process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000',
};
