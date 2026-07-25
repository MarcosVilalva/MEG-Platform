function refreshVisibleAnalytics() {
  const analytics = document.querySelector('#analytics');
  if (!analytics?.classList.contains('active')) return;
  const firstFilter = analytics.querySelector('[data-meg-filter]');
  if (firstFilter) firstFilter.dispatchEvent(new Event('input', { bubbles: true }));
  window.dispatchEvent(new Event('resize'));
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-view="analytics"]')) return;
  window.setTimeout(refreshVisibleAnalytics, 80);
  window.setTimeout(refreshVisibleAnalytics, 360);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) window.setTimeout(refreshVisibleAnalytics, 80);
});
