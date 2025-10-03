export function getAuthToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}