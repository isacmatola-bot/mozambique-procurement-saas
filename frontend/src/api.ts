const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type User = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
};

export function getToken() {
  return localStorage.getItem('mozproc_token');
}

export function setToken(token: string) {
  localStorage.setItem('mozproc_token', token);
}

export function clearToken() {
  localStorage.removeItem('mozproc_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function login(email: string, password: string) {
  return api<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}
