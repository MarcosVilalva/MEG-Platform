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
  skinShadow: string;
  hair: string;
  shirt: string;
  accent: string;
  style: 'fade' | 'bob' | 'curly' | 'bun' | 'long' | 'locs' | 'cap';
  accessory?: 'glasses' | 'earring' | 'headphones' | 'beard' | 'none';
};

export const phoenixAvatarPresets: PhoenixAvatarPreset[] = [
  { id: 'maya', label: 'Maya', start: '#0f766e', end: '#2dd4bf', skin: '#d79770', skinShadow: '#b87555', hair: '#251711', shirt: '#d8fff5', accent: '#ffffff', style: 'bob', accessory: 'earring' },
  { id: 'theo', label: 'Theo', start: '#155e75', end: '#38bdf8', skin: '#c9825d', skinShadow: '#a9684c', hair: '#1d2433', shirt: '#e0f2fe', accent: '#dff7ff', style: 'fade', accessory: 'glasses' },
  { id: 'luna', label: 'Luna', start: '#7e22ce', end: '#c084fc', skin: '#f0bd95', skinShadow: '#d79c75', hair: '#4a2b25', shirt: '#f3e8ff', accent: '#fff7ed', style: 'long', accessory: 'none' },
  { id: 'ravi', label: 'Ravi', start: '#1d4ed8', end: '#60a5fa', skin: '#8b573d', skinShadow: '#6e402d', hair: '#15120f', shirt: '#dbeafe', accent: '#ffffff', style: 'curly', accessory: 'beard' },
  { id: 'sofia', label: 'Sofia', start: '#be185d', end: '#fb7185', skin: '#eab18a', skinShadow: '#c88c69', hair: '#5b2a20', shirt: '#ffe4e6', accent: '#fff1f2', style: 'bun', accessory: 'glasses' },
  { id: 'noah', label: 'Noah', start: '#334155', end: '#64748b', skin: '#efc6a4', skinShadow: '#d5a785', hair: '#332c2a', shirt: '#f8fafc', accent: '#e2e8f0', style: 'fade', accessory: 'headphones' },
  { id: 'nina', label: 'Nina', start: '#047857', end: '#34d399', skin: '#71432f', skinShadow: '#593321', hair: '#17120f', shirt: '#d1fae5', accent: '#ecfdf5', style: 'locs', accessory: 'earring' },
  { id: 'caio', label: 'Caio', start: '#b45309', end: '#f59e0b', skin: '#a76546', skinShadow: '#835038', hair: '#2a1c14', shirt: '#fef3c7', accent: '#fff7ed', style: 'cap', accessory: 'none' },
  { id: 'lia', label: 'Lia', start: '#0e7490', end: '#67e8f9', skin: '#f4c9a7', skinShadow: '#d6a580', hair: '#3b2720', shirt: '#cffafe', accent: '#ecfeff', style: 'curly', accessory: 'none' },
  { id: 'bento', label: 'Bento', start: '#166534', end: '#4ade80', skin: '#7f4d34', skinShadow: '#633824', hair: '#11120f', shirt: '#dcfce7', accent: '#f0fdf4', style: 'locs', accessory: 'glasses' },
  { id: 'zoe', label: 'Zoe', start: '#9f1239', end: '#fb7185', skin: '#bc7655', skinShadow: '#985b41', hair: '#2b1714', shirt: '#ffe4e6', accent: '#fff1f2', style: 'bob', accessory: 'headphones' },
  { id: 'leo', label: 'Leo', start: '#4338ca', end: '#818cf8', skin: '#e7ad83', skinShadow: '#c58a66', hair: '#39261e', shirt: '#e0e7ff', accent: '#eef2ff', style: 'fade', accessory: 'beard' }
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
  if (preset.style === 'bob') return `<path d="M28 64c0-31 14-48 37-48 24 0 38 17 38 49v22c-5-7-9-13-11-20-9 12-45 13-55 0-2 8-5 14-9 20Z" fill="${preset.hair}"/><path d="M31 54c7-25 20-34 35-34 17 0 29 10 34 34-11-9-21-13-34-13-13 0-24 4-35 13Z" fill="${preset.hair}"/>`;
  if (preset.style === 'curly') return `<g fill="${preset.hair}"><circle cx="35" cy="46" r="13"/><circle cx="49" cy="29" r="14"/><circle cx="66" cy="24" r="15"/><circle cx="84" cy="30" r="15"/><circle cx="96" cy="47" r="13"/><circle cx="34" cy="63" r="12"/><circle cx="97" cy="64" r="12"/></g>`;
  if (preset.style === 'bun') return `<circle cx="82" cy="18" r="15" fill="${preset.hair}"/><path d="M31 57c2-26 15-40 35-40 21 0 34 14 35 41-11-11-22-16-35-16-14 0-25 5-35 15Z" fill="${preset.hair}"/>`;
  if (preset.style === 'long') return `<path d="M25 67c0-34 15-52 40-52 27 0 41 20 40 55l-6 35H87l3-37c-8 8-16 12-25 12-10 0-18-4-26-12l3 37H30Z" fill="${preset.hair}"/><path d="M31 53c7-25 19-35 35-35 17 0 30 11 35 35-11-8-22-12-35-12-13 0-24 4-35 12Z" fill="${preset.hair}"/>`;
  if (preset.style === 'locs') return `<g fill="${preset.hair}"><path d="M31 52c3-24 15-36 34-36 20 0 33 13 35 37-11-8-23-12-35-12-13 0-24 4-34 11Z"/><rect x="28" y="45" width="8" height="42" rx="4"/><rect x="38" y="37" width="8" height="49" rx="4"/><rect x="87" y="37" width="8" height="49" rx="4"/><rect x="98" y="46" width="8" height="42" rx="4"/></g>`;
  if (preset.style === 'cap') return `<path d="M30 50c5-23 18-34 36-34 19 0 31 11 35 33-18-5-49-5-71 1Z" fill="${preset.hair}"/><path d="M39 35h56c9 0 15 4 20 10-26-2-48 0-72 6Z" fill="${preset.accent}" fill-opacity=".95"/>`;
  return `<path d="M31 54c2-24 15-37 35-37 21 0 34 14 35 38-10-8-20-12-35-12-14 0-24 4-35 11Z" fill="${preset.hair}"/><path d="M33 42c10-7 21-10 33-10 13 0 24 3 34 10" fill="none" stroke="${preset.accent}" stroke-opacity=".18" stroke-width="3"/>`;
}

function accessoryMarkup(preset: PhoenixAvatarPreset) {
  if (preset.accessory === 'glasses') return `<g fill="none" stroke="#17212d" stroke-width="2.5"><rect x="44" y="53" width="17" height="11" rx="5"/><rect x="70" y="53" width="17" height="11" rx="5"/><path d="M61 57h9M42 56l-6-2M89 56l6-2"/></g>`;
  if (preset.accessory === 'earring') return `<g fill="none" stroke="#f8e08e" stroke-width="2.4"><circle cx="39" cy="68" r="3"/><circle cx="92" cy="68" r="3"/></g>`;
  if (preset.accessory === 'headphones') return `<g fill="none" stroke="${preset.accent}" stroke-width="5"><path d="M34 59c0-23 12-37 32-37 20 0 32 14 32 37"/><path d="M33 59v18M99 59v18"/></g><rect x="27" y="58" width="12" height="21" rx="6" fill="${preset.hair}"/><rect x="93" y="58" width="12" height="21" rx="6" fill="${preset.hair}"/>`;
  if (preset.accessory === 'beard') return `<path d="M47 73c4 16 13 23 19 23 7 0 16-7 20-23-6 7-13 10-20 10s-13-3-19-10Z" fill="${preset.hair}" fill-opacity=".9"/>`;
  return '';
}

function presetSvgDataUrl(preset: PhoenixAvatarPreset) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${preset.start}"/><stop offset="1" stop-color="${preset.end}"/></linearGradient>
      <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${preset.shirt}"/><stop offset="1" stop-color="${preset.accent}"/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".18"/></filter>
    </defs>
    <rect width="128" height="128" rx="34" fill="url(#g)"/>
    <circle cx="108" cy="20" r="23" fill="#fff" fill-opacity=".08"/>
    <circle cx="20" cy="112" r="36" fill="#000" fill-opacity=".05"/>
    <path d="M12 128c5-33 25-50 54-50 28 0 48 17 53 50Z" fill="url(#shirt)"/>
    <path d="M52 79h28v19c-8 7-20 7-28 0Z" fill="${preset.skinShadow}"/>
    ${hairMarkup(preset)}
    <ellipse cx="66" cy="59" rx="28" ry="32" fill="${preset.skin}" filter="url(#shadow)"/>
    <path d="M38 53c6-22 16-31 29-31 14 0 25 10 31 31-10-9-20-13-31-13-11 0-20 4-29 13Z" fill="${preset.hair}"/>
    <ellipse cx="55" cy="58" rx="2.2" ry="3" fill="#1f2329"/><ellipse cx="77" cy="58" rx="2.2" ry="3" fill="#1f2329"/>
    <path d="M47 51c4-2 8-3 12-2M73 49c4-1 8 0 12 2" fill="none" stroke="${preset.hair}" stroke-width="2.1" stroke-linecap="round" opacity=".78"/>
    <path d="M65 61c-1 4-2 7-1 9 2 1 4 1 6 0" fill="none" stroke="${preset.skinShadow}" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M57 74c6 5 13 5 19 0" fill="none" stroke="#8a4b48" stroke-width="2.4" stroke-linecap="round"/>
    ${accessoryMarkup(preset)}
    <path d="M49 91c10 7 24 7 34 0l7 8c-13 11-35 11-48 0Z" fill="${preset.accent}" fill-opacity=".9"/>
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
