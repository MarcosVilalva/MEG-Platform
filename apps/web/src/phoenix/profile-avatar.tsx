import { readSession } from '../app/auth-client';
import { patchCloudStateProperties, readCloudState } from '../app/app-state-client';

export type PhoenixAvatarPreference =
  | { kind: 'initials' }
  | { kind: 'preset'; presetId: string }
  | { kind: 'photo'; dataUrl: string };

export type PhoenixAvatarPreset = {
  id: string;
  label: string;
  column: number;
  row: number;
};

export const phoenixAvatarPresets: PhoenixAvatarPreset[] = [
  { id: 'people-01', label: 'Aurora', column: 0, row: 0 },
  { id: 'people-02', label: 'Enzo', column: 1, row: 0 },
  { id: 'people-03', label: 'Amara', column: 2, row: 0 },
  { id: 'people-04', label: 'Kenji', column: 3, row: 0 },
  { id: 'people-05', label: 'Serena', column: 4, row: 0 },
  { id: 'people-06', label: 'Hugo', column: 5, row: 0 },

  { id: 'people-07', label: 'Theo', column: 0, row: 1 },
  { id: 'people-08', label: 'Clara', column: 1, row: 1 },
  { id: 'people-09', label: 'Malik', column: 2, row: 1 },
  { id: 'people-10', label: 'Maya', column: 3, row: 1 },
  { id: 'people-11', label: 'Vicente', column: 4, row: 1 },
  { id: 'people-12', label: 'Ravi', column: 5, row: 1 },

  { id: 'people-13', label: 'Luna', column: 0, row: 2 },
  { id: 'people-14', label: 'Gael', column: 1, row: 2 },
  { id: 'people-15', label: 'Nina', column: 2, row: 2 },
  { id: 'people-16', label: 'Arthur', column: 3, row: 2 },
  { id: 'people-17', label: 'Noah', column: 4, row: 2 },
  { id: 'people-18', label: 'Cora', column: 5, row: 2 },

  { id: 'people-19', label: 'Safira', column: 0, row: 3 },
  { id: 'people-20', label: 'Ben', column: 1, row: 3 },
  { id: 'people-21', label: 'Íris', column: 2, row: 3 },
  { id: 'people-22', label: 'Raul', column: 3, row: 3 },
  { id: 'people-23', label: 'Leo', column: 4, row: 3 },
  { id: 'people-24', label: 'Bella', column: 5, row: 3 },

  { id: 'people-25', label: 'Davi', column: 0, row: 4 },
  { id: 'people-26', label: 'Mel', column: 1, row: 4 },
  { id: 'people-27', label: 'Lia', column: 2, row: 4 },
  { id: 'people-28', label: 'Caio', column: 3, row: 4 },
  { id: 'people-29', label: 'Eva', column: 4, row: 4 },
  { id: 'people-30', label: 'Otto', column: 5, row: 4 },

  { id: 'people-31', label: 'Zion', column: 0, row: 5 },
  { id: 'people-32', label: 'Chloe', column: 1, row: 5 },
  { id: 'people-33', label: 'Jade', column: 2, row: 5 },
  { id: 'people-34', label: 'Alex', column: 3, row: 5 },
  { id: 'people-35', label: 'Elisa', column: 4, row: 5 },
  { id: 'people-36', label: 'Dara', column: 5, row: 5 }
];

const LEGACY_PRESET_ALIASES: Record<string, string> = {
  maya: 'people-10',
  aurora: 'people-01',
  theo: 'people-07',
  oceano: 'people-04',
  luna: 'people-13',
  violeta: 'people-21',
  ravi: 'people-12',
  grafite: 'people-06',
  sofia: 'people-05',
  cobre: 'people-20',
  noah: 'people-17',
  esmeralda: 'people-19',
  nina: 'people-15',
  solar: 'people-04',
  caio: 'people-28',
  ceu: 'people-32',
  lia: 'people-27',
  rosa: 'people-18',
  bento: 'people-20',
  menta: 'people-03',
  zoe: 'people-33',
  leo: 'people-23'
};

const keyForUser = (userId: string) => `meg.profile.avatar.${userId}`;
const migrationKeyForUser = (userId: string) => `meg.profile.avatar.migrated.${userId}`;

export function currentPhoenixUserId() {
  return readSession()?.user.id || 'local-user';
}

function normalizePresetId(id: string) {
  return LEGACY_PRESET_ALIASES[id] || id;
}

function findPreset(id: string) {
  const normalized = normalizePresetId(id);
  return phoenixAvatarPresets.find((item) => item.id === normalized);
}

function defaultPresetForUser(userId: string) {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const preset = phoenixAvatarPresets[Math.abs(hash >>> 0) % phoenixAvatarPresets.length];
  return preset?.id || 'people-01';
}

function publicAsset(path: string) {
  const configuredBase = import.meta.env.BASE_URL || '/';
  const base = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
  const relative = `${base}${path.replace(/^\/+/, '')}`;
  try {
    return typeof document !== 'undefined' ? new URL(relative, document.baseURI).href : relative;
  } catch {
    return relative;
  }
}

function normalizeAvatarPreference(value: unknown, userId: string): PhoenixAvatarPreference | null {
  const fallback: PhoenixAvatarPreference = { kind: 'preset', presetId: defaultPresetForUser(userId) };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const parsed = value as Partial<PhoenixAvatarPreference> & { kind?: string; presetId?: string; dataUrl?: string };
  if (parsed.kind === 'photo' && typeof parsed.dataUrl === 'string' && parsed.dataUrl.startsWith('data:image/') && parsed.dataUrl.length < 500_000) {
    return { kind: 'photo', dataUrl: parsed.dataUrl };
  }
  if (parsed.kind === 'preset' && typeof parsed.presetId === 'string') {
    const preset = findPreset(parsed.presetId);
    return preset ? { kind: 'preset', presetId: preset.id } : fallback;
  }
  if (parsed.kind === 'initials') return { kind: 'initials' };
  return null;
}

function readStoredAvatarPreference(userId: string): PhoenixAvatarPreference | null {
  try {
    const stored = localStorage.getItem(keyForUser(userId));
    return stored ? normalizeAvatarPreference(JSON.parse(stored), userId) : null;
  } catch {
    return null;
  }
}

function avatarMigrationCompleted(userId: string) {
  try { return localStorage.getItem(migrationKeyForUser(userId)) === '1'; } catch { return false; }
}

function markAvatarMigrationCompleted(userId: string) {
  try { localStorage.setItem(migrationKeyForUser(userId), '1'); } catch { /* marcador local opcional */ }
}

export function readPhoenixAvatarPreference(userId = currentPhoenixUserId()): PhoenixAvatarPreference {
  return readStoredAvatarPreference(userId)
    || { kind: 'preset', presetId: defaultPresetForUser(userId) };
}

function avatarVisual(preference: PhoenixAvatarPreference) {
  if (preference.kind === 'photo') {
    return { image: preference.dataUrl, position: 'center', size: 'cover' };
  }
  if (preference.kind === 'preset') {
    const preset = findPreset(preference.presetId);
    if (!preset) return null;
    const image = publicAsset(`brand/avatars/meg-user-base-v2/${preset.id}.webp`);
    return { image, position: 'center', size: 'cover' };
  }
  return null;
}

export function phoenixAvatarImage(preference: PhoenixAvatarPreference) {
  return avatarVisual(preference)?.image || '';
}

export function applyPhoenixAvatarPreference(preference: PhoenixAvatarPreference) {
  const root = document.documentElement;
  const visual = avatarVisual(preference);
  if (visual) {
    root.style.setProperty('--meg-user-avatar-image', `url("${visual.image.replace(/"/g, '\\"')}")`);
    root.style.setProperty('--meg-user-avatar-position', visual.position);
    root.style.setProperty('--meg-user-avatar-size', visual.size);
    root.dataset.megUserAvatar = 'image';
  } else {
    root.style.removeProperty('--meg-user-avatar-image');
    root.style.removeProperty('--meg-user-avatar-position');
    root.style.removeProperty('--meg-user-avatar-size');
    root.dataset.megUserAvatar = 'initials';
  }
}

export function savePhoenixAvatarPreference(preference: PhoenixAvatarPreference, userId = currentPhoenixUserId()) {
  const normalized = normalizeAvatarPreference(preference, userId)
    || { kind: 'preset' as const, presetId: defaultPresetForUser(userId) };
  try { localStorage.setItem(keyForUser(userId), JSON.stringify(normalized)); } catch { /* preferência visual local */ }
  applyPhoenixAvatarPreference(normalized);
  window.dispatchEvent(new CustomEvent('meg:profile-avatar-changed', { detail: { userId, preference: normalized } }));
  return normalized;
}

function cloudAvatarMap(state: Record<string, unknown> | null | undefined) {
  const raw = state?.profileAvatars;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
}

export async function hydratePhoenixAvatarPreference(userId = currentPhoenixUserId()) {
  const storedLocal = readStoredAvatarPreference(userId);
  const local = storedLocal || { kind: 'preset' as const, presetId: defaultPresetForUser(userId) };
  const nativeOperational = import.meta.env.VITE_MOBILE_APP === 'true';

  try {
    const cloud = await readCloudState();
    const remote = normalizeAvatarPreference(cloudAvatarMap(cloud.state)[userId], userId);

    // Migração única: a Web antiga já possuía a escolha real do usuário em
    // localStorage. Na primeira execução da versão nova, essa preferência
    // prevalece uma única vez e passa a ser a origem compartilhada.
    if (!nativeOperational && storedLocal && !avatarMigrationCompleted(userId)) {
      applyPhoenixAvatarPreference(storedLocal);
      const migrated = await savePhoenixAvatarPreferenceCloud(storedLocal, userId);
      if (migrated.synced) markAvatarMigrationCompleted(userId);
      return storedLocal;
    }

    if (remote) {
      savePhoenixAvatarPreference(remote, userId);
      if (!nativeOperational) markAvatarMigrationCompleted(userId);
      return remote;
    }

    applyPhoenixAvatarPreference(local);
    return local;
  } catch {
    applyPhoenixAvatarPreference(local);
    return local;
  }
}

export async function savePhoenixAvatarPreferenceCloud(preference: PhoenixAvatarPreference, userId = currentPhoenixUserId()) {
  const normalized = savePhoenixAvatarPreference(preference, userId);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const cloud = await readCloudState();
      const current = cloudAvatarMap(cloud.state);
      await patchCloudStateProperties(
        { profileAvatars: { ...current, [userId]: normalized } },
        cloud.revision,
      );
      return { preference: normalized, synced: true };
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 409 && attempt < 2) continue;
      return { preference: normalized, synced: false };
    }
  }
  return { preference: normalized, synced: false };
}

export async function imageFileToAvatarDataUrl(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    element.src = source;
  });

  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu preparar a foto.');

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.max(0, (image.naturalWidth - side) / 2);
  const sy = Math.max(0, (image.naturalHeight - side) / 2);
  context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', .84);
}

export function PhoenixProfileAvatar({ name, preference, className = '' }: { name: string; preference: PhoenixAvatarPreference; className?: string }) {
  const visual = avatarVisual(preference);
  const initial = (name || 'M').trim().slice(0, 1).toUpperCase();
  const imageClass = visual
    ? preference.kind === 'preset' ? 'has-image has-preset-image' : 'has-image has-photo-image'
    : '';
  return <span className={`px-profile-avatar ${className} ${imageClass}`} aria-hidden="true">
    {visual ? <img
      src={visual.image}
      alt=""
      draggable={false}
      loading="eager"
      onError={(event) => {
        event.currentTarget.hidden = true;
        event.currentTarget.parentElement?.classList.add('image-error');
      }}
    /> : null}
    <span className="px-profile-avatar-fallback">{initial}</span>
  </span>;
}
