document.addEventListener('DOMContentLoaded', () => {
  Auth.requireLogin();

  const user = Auth.getUser();
  const userLabel = document.getElementById('current-user');
  if (userLabel && user) userLabel.textContent = user.namaLengkap + ' (' + user.role + ')';

  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.logout());
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const settings = AccessibilityUI.getSettings();
    themeToggle.textContent = settings.theme === 'dark' ? '☀ Terang' : '🌙 Gelap';
    themeToggle.addEventListener('click', () => {
      const s = AccessibilityUI.getSettings();
      const next = s.theme === 'dark' ? 'light' : 'dark';
      AccessibilityUI.update({ theme: next });
      themeToggle.textContent = next === 'dark' ? '☀ Terang' : '🌙 Gelap';
    });
  }

  const fontSizeSelect = document.getElementById('font-size-select');
  if (fontSizeSelect) {
    fontSizeSelect.value = AccessibilityUI.getSettings().fontScale;
    fontSizeSelect.addEventListener('change', (e) => {
      AccessibilityUI.update({ fontScale: e.target.value });
    });
  }

  const fontFamilySelect = document.getElementById('font-family-select');
  if (fontFamilySelect) {
    fontFamilySelect.value = AccessibilityUI.getSettings().font;
    fontFamilySelect.addEventListener('change', (e) => {
      AccessibilityUI.update({ font: e.target.value });
    });
  }

  const contrastToggle = document.getElementById('contrast-toggle');
  if (contrastToggle) {
    contrastToggle.checked = !!AccessibilityUI.getSettings().highContrast;
    contrastToggle.addEventListener('change', (e) => {
      AccessibilityUI.update({ highContrast: e.target.checked });
    });
  }
});
