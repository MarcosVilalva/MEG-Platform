import { readSession } from '../app/auth-client';
import { applyPhoenixAvatarPreference, readPhoenixAvatarPreference } from './profile-avatar';

let appliedKey = '';

function syncCurrentAvatar(force = false) {
  const userId = readSession()?.user.id;
  if (!userId) {
    appliedKey = '';
    return;
  }
  const preference = readPhoenixAvatarPreference(userId);
  const nextKey = `${userId}:${JSON.stringify(preference)}`;
  if (!force && nextKey === appliedKey) return;
  appliedKey = nextKey;
  applyPhoenixAvatarPreference(preference);
}

syncCurrentAvatar(true);

window.addEventListener('meg:profile-avatar-changed', () => syncCurrentAvatar(true));
window.addEventListener('storage', (event) => {
  const userId = readSession()?.user.id;
  if (!userId || event.storageArea !== localStorage) return;
  if (!event.key || event.key === `meg.profile.avatar.${userId}`) syncCurrentAvatar(true);
});

const root = document.getElementById('root');
if (root) {
  new MutationObserver(() => {
    if (root.querySelector('.px-user-avatar, .px-user-card-avatar, .px-settings-avatar-large')) syncCurrentAvatar();
  }).observe(root, { childList: true, subtree: true });
}
