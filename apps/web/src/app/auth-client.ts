const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  isActive: boolean;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

const SESSION_KEY = 'meg.auth.session';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP_${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function readSession(): AuthSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(email: string, password: string) {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  saveSession(session);
  return session;
}

export async function register(name: string, email: string, password: string) {
  const session = await request<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  saveSession(session);
  return session;
}

export async function logout(session: AuthSession) {
  try {
    await request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });
  } finally {
    clearSession();
  }
}

export async function validateSession(session: AuthSession) {
  return request<{ user: AuthUser }>('/auth/me', {
    headers: { Authorization: `Bearer ${session.accessToken}` }
  });
}
