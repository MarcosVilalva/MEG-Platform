import { readSession } from '../app/auth-client';
import { applyPhoenixAvatarPreference, readPhoenixAvatarPreference } from './profile-avatar';

function syncCurrentAvatar() {
  const userId = readSession()?.user.id;
  if (!userId) return;
  applyPhoenixAvatarPreference(readPhoenixAvatarPreference(userId));
}

syncCurrentAvatar();

window.addEventListener('meg:profile-avatar-changed', syncCurrentAvatar);
window.addEventListener('storage', (event) => {
  const userId = readSession()?.user.id;
  if (!userId || event.storageArea !== localStorage) return;
  if (!event.key || event.key === `meg.profile.avatar.${userId}`) syncCurrentAvatar();
});
