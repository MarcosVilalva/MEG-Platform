import { patchCloudStateProperties, readCloudState } from '../app/app-state-client';

export type DashboardPreferences = {
  balance: boolean;
  projection: boolean;
  summary: boolean;
  benefit: boolean;
  history: boolean;
  agenda: boolean;
};

export const defaultDashboardPreferences: DashboardPreferences = {
  balance: true,
  projection: true,
  summary: true,
  benefit: true,
  history: true,
  agenda: true,
};

const LEGACY_DASHBOARD_PREFS_KEY = 'meg.dashboard.preferences';
const userKey = (userId: string) => `meg.dashboard.preferences.${userId}`;

function normalizeDashboardPreferences(value: unknown): DashboardPreferences | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Partial<Record<keyof DashboardPreferences, unknown>>;
  const normalized = { ...defaultDashboardPreferences };
  (Object.keys(defaultDashboardPreferences) as Array<keyof DashboardPreferences>).forEach((key) => {
    if (typeof source[key] === 'boolean') normalized[key] = source[key] as boolean;
  });
  return normalized;
}

function readLocalDashboardPreferences(userId: string, nativeOperational: boolean) {
  try {
    const direct = localStorage.getItem(nativeOperational ? LEGACY_DASHBOARD_PREFS_KEY : userKey(userId));
    const normalized = direct ? normalizeDashboardPreferences(JSON.parse(direct)) : null;
    if (normalized) return normalized;

    if (!nativeOperational) {
      const legacy = localStorage.getItem(LEGACY_DASHBOARD_PREFS_KEY);
      const migrated = legacy ? normalizeDashboardPreferences(JSON.parse(legacy)) : null;
      if (migrated) return migrated;
    }
  } catch {
    // Preferências visuais nunca podem impedir a abertura do MEG.
  }
  return { ...defaultDashboardPreferences };
}

function saveLocalDashboardPreferences(
  preferences: DashboardPreferences,
  userId: string,
  nativeOperational: boolean,
) {
  try {
    localStorage.setItem(
      nativeOperational ? LEGACY_DASHBOARD_PREFS_KEY : userKey(userId),
      JSON.stringify(preferences),
    );
  } catch {
    // Persistência local é auxiliar. O estado visual atual continua válido.
  }
}

function cloudDashboardMap(state: Record<string, unknown> | null | undefined) {
  const raw = state?.dashboardPreferences;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

export function readDashboardPreferences(
  userId: string,
  nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true',
): DashboardPreferences {
  return readLocalDashboardPreferences(userId, nativeOperational);
}

export function applyDashboardPreferences(preferences: DashboardPreferences) {
  const root = document.documentElement;
  (Object.entries(preferences) as Array<[keyof DashboardPreferences, boolean]>).forEach(([key, enabled]) => {
    root.dataset[`megDashboard${key.slice(0, 1).toUpperCase()}${key.slice(1)}`] = enabled ? 'on' : 'off';
  });
}

export function saveDashboardPreferences(
  preferences: DashboardPreferences,
  userId: string,
  nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true',
) {
  const normalized = normalizeDashboardPreferences(preferences) || { ...defaultDashboardPreferences };
  saveLocalDashboardPreferences(normalized, userId, nativeOperational);
  applyDashboardPreferences(normalized);
  return normalized;
}

export async function saveDashboardPreferencesCloud(
  preferences: DashboardPreferences,
  userId: string,
) {
  const normalized = saveDashboardPreferences(preferences, userId, false);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const cloud = await readCloudState();
      const current = cloudDashboardMap(cloud.state);
      await patchCloudStateProperties(
        { dashboardPreferences: { ...current, [userId]: normalized } },
        cloud.revision,
      );
      return { preferences: normalized, synced: true };
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : 0;
      if (status === 409 && attempt < 2) continue;
      return { preferences: normalized, synced: false };
    }
  }

  return { preferences: normalized, synced: false };
}

export async function hydrateDashboardPreferences(
  userId: string,
  nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true',
) {
  const local = readDashboardPreferences(userId, nativeOperational);
  applyDashboardPreferences(local);

  if (nativeOperational) return local;

  try {
    const cloud = await readCloudState();
    const remote = normalizeDashboardPreferences(cloudDashboardMap(cloud.state)[userId]);
    if (remote) {
      saveDashboardPreferences(remote, userId, false);
      return remote;
    }

    await saveDashboardPreferencesCloud(local, userId);
    return local;
  } catch {
    return local;
  }
}
