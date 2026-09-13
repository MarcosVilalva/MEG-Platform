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
  skin: string;
  hair: string;
  shirt: string;
  accent: string;
  style: 'short' | 'wave' | 'curly' | 'bun' | 'cap';
};

export const phoenixAvatarPresets: PhoenixAvatarPreset[] = [
  { id: 'aurora', label: 'Aurora', start: '#064e3b', end: '#10b981', skin: '#f2c6a0', hair: '#402416', shirt: '#d1fae5', accent: '#ecfdf5', style: 'wave' },
  { id: 'oceano', label: 'Oceano', start: '#164e63', end: '#38bdf8', skin: '#d99b74', hair: '#172033', shirt: '#e0f2fe', accent: '#f0f9ff', style: 'short' },
  { id: 'violeta', label: 'Violeta', start: '#4c1d95', end: '#a78bfa', skin: '#8f5a3c', hair: '#21120f', shirt: '#ede9fe', accent: '#faf5ff', style: 'curly' },
  { id: 'grafite', label: 'Grafite', start: '#111827', end: '#64748b', skin: '#efc3a0', hair: '#35312f', shirt: '#f8fafc', accent: '#e2e8f0', style: 'short' },
  { id: 'cobre', label: 'Cobre', start: '#7c2d12', end: '#fb923c', skin: '#c9825d', hair: '#4b2115', shirt: '#ffedd5', accent: '#fff7ed', style: 'bun' },
  { id: 'esmeralda', label: 'Esmeralda', start: '#065f46', end: '#34d399', skin: '#74462f', hair: '#18130f', shirt: '#d1fae5', accent: '#ecfdf5', style: 'cap' },
  { id: 'solar', label: 'Solar', start: '#92400e', end: '#fbbf24', skin: '#f0bd95', hair: '#6b3b1f', shirt: '#fef3c7', accent: '#fffbeb', style: 'curly' },
  { id: 'ceu', label: 'Céu', start: '#1e3a8a', end: '#60a5fa', skin: '#aa6c4a', hair: '#251b19', shirt: '#dbeafe', accent: '#eff6ff', style: 'wave' },
  { id: 'rosa', label: 'Rosa', start: '#9d174d', end: '#f472b6', skin: '#e9b48b', hair: '#522431', shirt: '#fce7f3', accent: '#fff1f2', style: 'bun' },
  { id: 'menta', label: 'Menta', start: '#115e59', end: '#5eead4', skin: '#9d6244', hair: '#28201c', shirt: '#ccfbf1', accent: '#f0fdfa', style: 'cap' }
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

function hairMarkup(preset: PhoenixAvatarPreset) {
  if (preset.style === 'wave') return `<path d="M31 57c1-26 15-39 34-39 22 0 34 15 33 42-9-13-21-18-33-17-15 1-24 7-34 14Z" fill="${preset.hair}"/><path d="M34 58c-6 12-3 29 3 38-8-4-14-15-13-26 0-6 4-10 10-12Z" fill="${preset.hair}"/>`;
  if (preset.style === 'curly') return `<g fill="${preset.hair}"><circle cx="39" cy="42" r="14"/><circle cx="55" cy="29" r="15"/><circle cx="74" cy="29" r="15"/><circle cx="91" cy="43" r="14"/><circle cx="34" cy="59" r="12"/><circle cx="94" cy="60" r="12"/></g>`;
  if (preset.style === 'bun') return `<circle cx="83" cy="25" r="16" fill="${preset.hair}"/><path d="M31 59c0-27 14-41 34-41 21 0 34 14 34 41-10-13-22-18-34-18-13 0-24 6-34 18Z" fill="${preset.hair}"/>`;
  if (preset.style === 'cap') return `<path d="M31 48c5-21 18-30 35-30 18 0 29 9 33 29-15-6-46-6-68 1Z" fill="${preset.hair}"/><path d="M42 37h51c9 0 14 4 18 9-22-2-43-1-65 4Z" fill="${preset.accent}" fill-opacity=".92"/>`;
  return `<path d="M32 55c1-24 13-37 33-37 21 0 33 14 34 38-11-11-20-16-34-16-13 0-23 5-33 15Z" fill="${preset.hair}"/>`;
}

function presetSvgDataUrl(preset: PhoenixAvatarPreset) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${preset.start}"/><stop offset="1" stop-color="${preset.end}"/></linearGradient></defs>
    <rect width="128" height="128" rx="34" fill="url(#g)"/>
    <circle cx="105" cy="24" r="18" fill="#fff" fill-opacity=".08"/>
    <path d="M17 119c4-30 23-46 48-46s44 16 48 46" fill="${preset.shirt}"/>
    ${hairMarkup(preset)}
    <ellipse cx="65" cy="58" rx="27" ry="31" fill="${preset.skin}"/>
    <path d="M44 48c8-7 15-9 22-9 11 0 19 3 27 11-3-21-13-29-28-29-14 0-24 8-28 27 2 0 4 0 7 0Z" fill="${preset.hair}"/>
    <ellipse cx="55" cy="58" rx="2.3" ry="3" fill="#2a201c"/><ellipse cx="76" cy="58" rx="2.3" ry="3" fill="#2a201c"/>
    <path d="M61 70c3 3 7 3 10 0" fill="none" stroke="#7b4035" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M45 53c4-3 8-4 12-3M73 50c4-1 8 0 12 3" fill="none" stroke="${preset.hair}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M53 84c7 4 17 4 24 0l5 8c-10 7-25 7-34 0Z" fill="${preset.accent}" fill-opacity=".85"/>
  </svg>`;
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
