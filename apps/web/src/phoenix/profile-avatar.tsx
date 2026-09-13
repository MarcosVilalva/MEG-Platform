import type { CSSProperties } from 'react';
import { readSession } from '../app/auth-client';
import { PHOENIX_AVATAR_SPRITE_URL, phoenixPeopleAvatarAssets } from './profile-avatar-assets';

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

export const phoenixAvatarPresets: PhoenixAvatarPreset[] = phoenixPeopleAvatarAssets;

const LEGACY_PRESET_ALIASES: Record<string, string> = {
  maya: 'people-01', aurora: 'people-01',
  theo: 'people-02', oceano: 'people-02',
  luna: 'people-03', violeta: 'people-03',
  ravi: 'people-04', grafite: 'people-04',
  sofia: 'people-05', cobre: 'people-05',
  noah: 'people-06', esmeralda: 'people-06',
  nina: 'people-07', solar: 'people-07',
  caio: 'people-08', ceu: 'people-08',
  lia: 'people-09', rosa: 'people-09',
  bento: 'people-10', menta: 'people-10',
  zoe: 'people-11', leo: 'people-12'
};

const keyForUser = (userId: string) => `meg.profile.avatar.${userId}`;

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

export function readPhoenixAvatarPreference(userId = currentPhoenixUserId()): PhoenixAvatarPreference {
  try {
    const stored = localStorage.getItem(keyForUser(userId));
    if (!stored) return { kind: 'initials' };
    const parsed = JSON.parse(stored) as PhoenixAvatarPreference;
    if (parsed.kind === 'photo' && parsed.dataUrl) return parsed;
    if (parsed.kind === 'preset') {
      const preset = findPreset(parsed.presetId);
      return preset ? { kind: 'preset', presetId: preset.id } : { kind: 'initials' };
    }
    return { kind: 'initials' };
  } catch {
    return { kind: 'initials' };
  }
}

function presetPosition(preset: PhoenixAvatarPreset) {
  const x = preset.column * 20;
  const y = preset.row * (100 / 3);
  return `${x}% ${y}%`;
}

function avatarVisual(preference: PhoenixAvatarPreference) {
  if (preference.kind === 'photo') {
    return {
      image: preference.dataUrl,
      position: 'center',
      size: 'cover'
    };
  }
  if (preference.kind === 'preset') {
    const preset = findPreset(preference.presetId);
    if (!preset) return null;
    return {
      image: PHOENIX_AVATAR_SPRITE_URL,
      position: presetPosition(preset),
      size: '600% 400%'
    };
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
  const normalized = preference.kind === 'preset'
    ? { kind: 'preset' as const, presetId: normalizePresetId(preference.presetId) }
    : preference;
  try { localStorage.setItem(keyForUser(userId), JSON.stringify(normalized)); } catch { /* preferência visual local */ }
  applyPhoenixAvatarPreference(normalized);
  window.dispatchEvent(new CustomEvent('meg:profile-avatar-changed', { detail: { userId, preference: normalized } }));
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

export function PhoenixProfileAvatar({
  name,
  preference,
  className = ''
}: {
  name: string;
  preference: PhoenixAvatarPreference;
  className?: string;
}) {
  const visual = avatarVisual(preference);
  const initial = (name || 'M').trim().slice(0, 1).toUpperCase();
  const style = visual ? ({
    backgroundImage: `url("${visual.image}")`,
    backgroundPosition: visual.position,
    backgroundSize: visual.size,
    backgroundRepeat: 'no-repeat'
  } satisfies CSSProperties) : undefined;
  return <span className={`px-profile-avatar ${className} ${visual ? 'has-image' : ''}`} aria-hidden="true" style={style}>{visual ? '' : initial}</span>;
}
