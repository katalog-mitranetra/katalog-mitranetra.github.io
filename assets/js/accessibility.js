const AccessibilityUI = (() => {
  const KEY = 'kdtb_a11y';
  const DEFAULTS = { theme: 'light', fontScale: '100', font: 'atkinson', highContrast: false };

  function getSettings() {
    const raw = localStorage.getItem(KEY);
    return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  }

  function saveSettings(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  function apply(settings) {
    const html = document.documentElement;
    html.setAttribute('data-theme', settings.theme);
    html.className = html.className.replace(/fs-\d+/g, '').trim();
    html.classList.add('fs-' + settings.fontScale);

    document.body.classList.remove('font-arial', 'font-verdana', 'font-atkinson');
    document.body.classList.add('font-' + settings.font);
    document.body.classList.toggle('high-contrast', !!settings.highContrast);
  }

  function init() {
    const settings = getSettings();
    apply(settings);
    return settings;
  }

  function update(patch) {
    const settings = Object.assign(getSettings(), patch);
    saveSettings(settings);
    apply(settings);
    return settings;
  }

  return { init, update, getSettings };
})();

AccessibilityUI.init();
