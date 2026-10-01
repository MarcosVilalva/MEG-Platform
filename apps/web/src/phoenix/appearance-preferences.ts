import { patchCloudStateProperties, readCloudState } from '../app/app-state-client';

export type PhoenixTheme = 'dark' | 'light';

const DEFAULT_THEME: PhoenixTheme = 'dark';
const keyForUser = (userId: string) => `meg.appearance.theme.${userId}`;

function normalizeTheme(value: unknown): PhoenixTheme | null {
  return value === 'dark' || value === 'light' ? value : null;
}

function cloudAppearanceMap(state: Record<string, unknown> | null | undefined) {
  const raw = state?.appearancePreferences;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

export function readPhoenixTheme(userId: string): PhoenixTheme {
  try {
    return normalizeTheme(localStorage.getItem(keyForUser(userId))) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function savePhoenixTheme(theme: PhoenixTheme, userId: string) {
  const normalized = normalizeTheme(theme) || DEFAULT_THEME;
  try { localStorage.setItem(keyForUser(userId), normalized); } catch { /* preferência local opcional */ }
  return normalized;
}

export async function savePhoenixThemeCloud(theme: PhoenixTheme, userId: string) {
  const normalized = savePhoenixTheme(theme, userId);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const cloud = await readCloudState();
      const current = cloudAppearanceMap(cloud.state);
      await patchCloudStateProperties(
        { appearancePreferences: { ...current, [userId]: { theme: normalized } } },
        cloud.revision,
      );
      return { theme: normalized, synced: true };
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error
        ? Number((error as { status?: unknown }).status)
        : 0;
      if (status === 409 && attempt < 2) continue;
      return { theme: normalized, synced: false };
    }
  }
  return { theme: normalized, synced: false };
}

export async function hydratePhoenixTheme(userId: string) {
  const local = readPhoenixTheme(userId);
  try {
    const cloud = await readCloudState();
    const remoteRaw = cloudAppearanceMap(cloud.state)[userId];
    const remote = remoteRaw && typeof remoteRaw === 'object' && !Array.isArray(remoteRaw)
      ? normalizeTheme((remoteRaw as { theme?: unknown }).theme)
      : null;
    if (remote) {
      savePhoenixTheme(remote, userId);
      return remote;
    }

    await savePhoenixThemeCloud(local, userId);
    return local;
  } catch {
    return local;
  }
}
