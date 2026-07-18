const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

export type RegistrationResult = AuthSession | {
  status: 'PENDING_APPROVAL';
  message: string;
  administratorEmail: string;
};

const SESSION_KEY = 'meg.auth.session';

export type ApiHealth = {
  status: string;
  dataRepair?: { status: string; scanned: number; repaired: number; issues: number };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
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
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export async function login(email: string, password: string) {
  const session = await request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  saveSession(session);
  return session;
}

export async function register(name: string, email: string, phone: string, password: string, confirmPassword: string, accountType: 'REQUEST_ACCESS' | 'CREATE_WORKSPACE' = 'REQUEST_ACCESS', workspaceName?: string) {
  const result = await request<RegistrationResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, password, confirmPassword, accountType, workspaceName })
  });
  if ('accessToken' in result) saveSession(result);
  return result;
}

export async function forgotPassword(email: string) {
  return request<{
    status: 'PASSWORD_SENT';
    deliveredTo: string;
    notifications: Array<{ channel: 'email' | 'whatsapp'; status: 'sent' | 'failed' | 'skipped'; detail?: string }>;
  }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function logout(session: AuthSession) {
  try {
    await request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) });
  } finally {
    clearSession();
  }
}

export async function validateSession(session: AuthSession) {
  return request<{ user: AuthUser }>('/auth/me', { headers: { Authorization: `Bearer ${session.accessToken}` } });
}

export async function listManagedUsers(session: AuthSession) {
  return request<{ users: AuthUser[] }>('/auth/users', { headers: { Authorization: `Bearer ${session.accessToken}` } });
}

export async function changeUserAccess(
  session: AuthSession,
  userId: string,
  payload: { action: 'APPROVE' | 'REJECT' | 'BLOCK' | 'ACTIVATE' | 'UPDATE'; role?: UserRole; phone?: string; note?: string }
) {
  return request<{ user: AuthUser }>(`/auth/users/${userId}/access`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteManagedUser(session: AuthSession, userId: string) {
  return request<{ id: string; deleted: true }>(`/auth/users/${userId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${session.accessToken}` }
  });
}

export async function getApiHealth() {
  return request<ApiHealth>('/health');
}
