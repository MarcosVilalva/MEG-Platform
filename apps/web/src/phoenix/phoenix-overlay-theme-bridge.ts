function syncPhoenixOverlayTheme() {
  const root = document.querySelector<HTMLElement>('.phoenix-v15');
  if (!root) {
    delete document.body.dataset.phoenixTheme;
    return;
  }
  document.body.dataset.phoenixTheme = root.dataset.theme === 'light' ? 'light' : 'dark';
}

if (typeof window !== 'undefined') {
  const start = () => {
    syncPhoenixOverlayTheme();
    const observer = new MutationObserver(syncPhoenixOverlayTheme);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-theme']
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
