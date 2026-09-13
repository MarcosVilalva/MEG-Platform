import { readSession } from '../app/auth-client';

export type PhoenixAvatarPreference =
  | { kind: 'initials' }
  | { kind: 'preset'; presetId: string }
  | { kind: 'photo'; dataUrl: string };

export type PhoenixAvatarPreset = {
  id: string;
  label: string;
  start: string;
  end: string;
  accent: string;
};

export const phoenixAvatarPresets: PhoenixAvatarPreset[] = [
  { id: 'aurora', label: 'Aurora', start: '#0f766e', end: '#34d399', accent: '#d1fae5' },
  { id: 'oceano', label: 'Oceano', start: '#164e63', end: '#38bdf8', accent: '#e0f2fe' },
  { id: 'violeta', label: 'Violeta', start: '#4c1d95', end: '#a78bfa', accent: '#ede9fe' },
  { id: 'grafite', label: 'Grafite', start: '#111827', end: '#64748b', accent: '#f8fafc' },
  { id: 'cobre', label: 'Cobre', start: '#7c2d12', end: '#fb923c', accent: '#ffedd5' },
  { id: 'esmeralda', label: 'Esmeralda', start: '#064e3b', end: '#10b981', accent: '#ecfdf5' }
];

const keyForUser = (userId: string) => `meg.profile.avatar.${userId}`;

export function currentPhoenixUserId() {
  return readSession()?.user.id || 'local-user';
}

export function readPhoenixAvatarPreference(userId = currentPhoenixUserId()): PhoenixAvatarPreference {
  try {
    const stored = localStorage.getItem(keyForUser(userId));
    if (!stored) return { kind: 'initials' };
    const parsed = JSON.parse(stored) as PhoenixAvatarPreference;
    if (parsed.kind === 'photo' && parsed.dataUrl) return parsed;
    if (parsed.kind === 'preset' && phoenixAvatarPresets.some((item) => item.id === parsed.presetId)) return parsed;
    return { kind: 'initials' };
  } catch {
    return { kind: 'initials' };
  }
}

function presetSvgDataUrl(preset: PhoenixAvatarPreset) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${preset.start}"/><stop offset="1" stop-color="${preset.end}"/></linearGradient></defs><rect width="128" height="128" rx="34" fill="url(#g)"/><circle cx="64" cy="49" r="23" fill="${preset.accent}" fill-opacity=".96"/><path d="M24 111c4-25 20-38 40-38s36 13 40 38" fill="${preset.accent}" fill-opacity=".96"/><circle cx="99" cy="29" r="10" fill="#fff" fill-opacity=".18"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function phoenixAvatarImage(preference: PhoenixAvatarPreference) {
  if (preference.kind === 'photo') return preference.dataUrl;
  if (preference.kind === 'preset') {
    const preset = phoenixAvatarPresets.find((item) => item.id === preference.presetId);
    return preset ? presetSvgDataUrl(preset) : '';
  }
  return '';
}

export function applyPhoenixAvatarPreference(preference: PhoenixAvatarPreference) {
  const root = document.documentElement;
  const image = phoenixAvatarImage(preference);
  if (image) {
    root.style.setProperty('--meg-user-avatar-image', `url("${image.replace(/"/g, '\\"')}")`);
    root.dataset.megUserAvatar = 'image';
  } else {
    root.style.removeProperty('--meg-user-avatar-image');
    root.dataset.megUserAvatar = 'initials';
  }
}

export function savePhoenixAvatarPreference(preference: PhoenixAvatarPreference, userId = currentPhoenixUserId()) {
  try { localStorage.setItem(keyForUser(userId), JSON.stringify(preference)); } catch { /* preferência visual local */ }
  applyPhoenixAvatarPreference(preference);
  window.dispatchEvent(new CustomEvent('meg:profile-avatar-changed', { detail: { userId, preference } }));
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
  const image = phoenixAvatarImage(preference);
  const initial = (name || 'M').trim().slice(0, 1).toUpperCase();
  return <span className={`px-profile-avatar ${className} ${image ? 'has-image' : ''}`} aria-hidden="true" style={image ? { backgroundImage: `url("${image}")` } : undefined}>{image ? '' : initial}</span>;
}
