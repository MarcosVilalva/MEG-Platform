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
let refreshInFlight: Promise<AuthSession | null> | null = null;
const responseCache = new Map<string, { value: unknown; storedAt: number }>();
const requestsInFlight = new Map<string, Promise<unknown>>();
const CACHE_TTL = 5 * 60_000;

export type ApiHealth = {
  status: string;
  dataRepair?: { status: string; scanned: number; repaired: number; issues: number };
  normalization?: { status: string; primary: boolean; reconciled: boolean; count: number; reason?: string | null };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    signal: init?.signal || AbortSignal.timeout(45_000),
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error || `HTTP_${response.status}`), { status: response.status });
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = readSession();
  if (!current?.refreshToken) return null;
  refreshInFlight = request<AuthSession>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: current.refreshToken })
  }).then((next) => {
    saveSession(next);
    return next;
  }).catch(() => {
    clearSession();
    return null;
  }).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function authenticatedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = String(init?.method || 'GET').toUpperCase();
  const cacheKey = method === 'GET' ? path : '';
  const cached = cacheKey ? responseCache.get(cacheKey) : undefined;
  if (cached && Date.now() - cached.storedAt < CACHE_TTL) return cached.value as T;
  if (cacheKey && requestsInFlight.has(cacheKey)) return requestsInFlight.get(cacheKey) as Promise<T>;
  const execute = async () => {
  let session = readSession();
  if (!session) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
  const send = (accessToken: string) => fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    signal: init?.signal || AbortSignal.timeout(45_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) }
  });
  let response = await send(session.accessToken);
  if (response.status === 401) {
    session = await refreshAuthSession();
    if (!session) throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 });
    response = await send(session.accessToken);
  }
  const payload = response.status === 204 ? undefined : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error((payload as { error?: string })?.error || `HTTP_${response.status}`), { status: response.status });
  if (method === 'GET') responseCache.set(path, { value: payload, storedAt: Date.now() });
  else {
    responseCache.clear();
    window.dispatchEvent(new CustomEvent('meg:data-invalidated', { detail: { path, method } }));
  }
  return payload as T;
  };
  const pending = execute();
  if (cacheKey) requestsInFlight.set(cacheKey, pending);
  try { return await pending; } finally { if (cacheKey) requestsInFlight.delete(cacheKey); }
}

export function clearAuthenticatedCache() { responseCache.clear(); requestsInFlight.clear(); }
export function invalidateAuthenticatedCache(path?: string) { if (path) responseCache.delete(path); else responseCache.clear(); }

export function peekAuthenticatedCache<T>(path: string): T | undefined {
  const cached = responseCache.get(path);
  if (!cached || Date.now() - cached.storedAt >= CACHE_TTL) return undefined;
  return cached.value as T;
}

export async function prefetchAuthenticatedData(month: string) {
  const encodedMonth = encodeURIComponent(month);
  const priorityPaths = [
    '/app-state',
    '/finance/accounts',
    '/finance/categories',
    '/finance/payment-methods',
    `/cards?month=${encodedMonth}`,
    `/payables?month=${encodedMonth}`,
    `/finance/summary?month=${encodedMonth}`
  ];
  const secondaryPaths = [
    '/receivables/customers',
    '/receivables/receivables',
    `/finance/analytics?month=${encodedMonth}`,
    `/finance/cashflow?month=${encodedMonth}`,
    `/finance/budgets?month=${encodedMonth}`
  ];

  await Promise.allSettled(priorityPaths.map((path) => authenticatedRequest(path)));
  void Promise.allSettled(secondaryPaths.map((path) => authenticatedRequest(path)));
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
  clearAuthenticatedCache();
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
