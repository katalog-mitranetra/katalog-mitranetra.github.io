/**
 * Pengganti window.alert()/window.confirm() bawaan browser dengan modal
 * HTML yang konsisten dengan tampilan aplikasi (dan bisa di-skin dark mode/
 * kontras tinggi/ukuran font, tidak seperti dialog native browser).
 *
 * Pemakaian:
 *   await AppModal.alert('Pesan...');
 *   await AppModal.alert('Pesan...', 'Judul Opsional');
 *   const ok = await AppModal.confirm('Yakin?');
 *   const ok = await AppModal.confirm('Yakin?', 'Judul Opsional');
 */
const AppModal = (() => {
  let overlay = null;
  let titleEl = null;
  let messageEl = null;
  let actionsEl = null;
  let lastFocusedEl = null;

  function ensureBuilt() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'app-modal-overlay';
    overlay.className = 'modal-overlay hidden';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'app-modal-title');
    overlay.setAttribute('aria-describedby', 'app-modal-message');

    overlay.innerHTML =
      '<div class="modal-box" style="max-width:420px;">' +
      '<h2 id="app-modal-title" style="margin-top:0;"></h2>' +
      '<p id="app-modal-message" style="white-space:pre-line;"></p>' +
      '<div id="app-modal-actions" style="display:flex; gap:12px; justify-content:flex-end; margin-top:16px;"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    titleEl = document.getElementById('app-modal-title');
    messageEl = document.getElementById('app-modal-message');
    actionsEl = document.getElementById('app-modal-actions');
  }

  function show(options) {
    ensureBuilt();
    return new Promise((resolve) => {
      lastFocusedEl = document.activeElement;
      titleEl.textContent = options.title || '';
      messageEl.textContent = options.message || '';
      actionsEl.innerHTML = '';

      function close(result) {
        overlay.classList.add('hidden');
        document.removeEventListener('keydown', onKeydown);
        if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
        resolve(result);
      }

      function onKeydown(e) {
        if (e.key === 'Escape') close(options.cancelValue);
      }

      options.buttons.forEach((btn, idx) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = btn.className || 'btn btn-outline';
        el.textContent = btn.label;
        el.addEventListener('click', () => close(btn.value));
        actionsEl.appendChild(el);
        if (idx === options.buttons.length - 1) {
          setTimeout(() => el.focus(), 0);
        }
      });

      overlay.classList.remove('hidden');
      document.addEventListener('keydown', onKeydown);
    });
  }

  function alertModal(message, title) {
    return show({
      title: title || 'Pemberitahuan',
      message: message,
      cancelValue: true,
      buttons: [{ label: 'OK', value: true, className: 'btn btn-primary' }]
    });
  }

  function confirmModal(message, title) {
    return show({
      title: title || 'Konfirmasi',
      message: message,
      cancelValue: false,
      buttons: [
        { label: 'Batal', value: false, className: 'btn btn-outline' },
        { label: 'Ya', value: true, className: 'btn btn-danger' }
      ]
    });
  }

  return { alert: alertModal, confirm: confirmModal };
})();
