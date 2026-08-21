const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
export function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('expiry_token'); }
export async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}
export function logout() { localStorage.removeItem('expiry_token'); localStorage.removeItem('expiry_user'); window.location.href = '/'; }
