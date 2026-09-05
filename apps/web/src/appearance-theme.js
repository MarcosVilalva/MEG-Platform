import './appearance-theme.css';
import './global-modern-clarity.css';

const STORAGE_KEY = 'meg-appearance-theme-v1';
const COLORS = { dark: '#091b19', light: '#f5f8f7' };
const ASSET_BASE = import.meta.env?.BASE_URL || '/';

function storedTheme() {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export function applyAppearanceTheme(theme, { persist = true } = {}) {
  const value = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.megTheme = value;
  document.body.dataset.megTheme = value;
  document.documentElement.style.colorScheme = value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[value]);
  document.querySelectorAll('img.brand-logo').forEach((image) => {
    image.src = value === 'light'
      ? `${ASSET_BASE}brand/meg-finance-system-lockup-light.svg`
      : `${ASSET_BASE}brand/meg-finance-system-lockup.svg`;
  });
  const button = document.querySelector('#appearanceThemeToggle');
  if (button) {
    const light = value === 'light';
    button.setAttribute('aria-pressed', String(light));
    button.setAttribute('aria-label', light ? 'Ativar modo escuro' : 'Ativar modo claro');
    button.dataset.activeTheme = value;
    const label = button.querySelector('span');
    if (label) label.textContent = light ? 'Modo escuro' : 'Modo claro';
  }
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
  }
  window.dispatchEvent(new CustomEvent('meg:appearance-theme-change', { detail: { theme: value } }));
  return value;
}

let initialized = false;
export function initializeAppearanceTheme() {
  if (initialized) return document.body.dataset.megTheme || storedTheme();
  initialized = true;
  let theme = applyAppearanceTheme(storedTheme(), { persist: false });
  document.querySelector('#appearanceThemeToggle')?.addEventListener('click', () => {
    theme = applyAppearanceTheme(theme === 'dark' ? 'light' : 'dark');
  });
  return theme;
}
