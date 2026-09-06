const accountState = {
  page: 1,
  pageSize: 50,
  field: 'Nama Lengkap',
  q: '',
  sortField: 'Nama Lengkap',
  sortDir: 'asc',
  editingId: null
};

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  const isAdmin = user && user.role === 'admin';

  document.getElementById('change-password-form').addEventListener('submit', onChangeOwnPassword);

  if (!isAdmin) {
    const adminSection = document.getElementById('accounts-admin-section');
    if (adminSection) adminSection.remove();
    return;
  }

  loadAccounts();

  document.getElementById('btn-add-account').addEventListener('click', () => openAccountForm());
  document.getElementById('account-search-input').addEventListener('input', debounce(onAccountSearchInput, 300));
  document.getElementById('account-search-field').addEventListener('change', (e) => {
    accountState.field = e.target.value;
    accountState.page = 1;
    loadAccounts();
  });

  document.getElementById('account-form').addEventListener('submit', onSubmitAccountForm);
  document.getElementById('btn-cancel-account-form').addEventListener('click', closeAccountForm);

  document.getElementById('reset-password-form').addEventListener('submit', onSubmitResetPassword);
  document.getElementById('btn-cancel-reset-password').addEventListener('click', closeResetPasswordForm);

  TableControls.bindSortableHeaders(
    document.getElementById('accounts-thead'),
    () => accountState,
    (field, dir) => {
      accountState.sortField = field;
      accountState.sortDir = dir;
      accountState.page = 1;
      loadAccounts();
    }
  );
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Ganti password sendiri (semua role) ---------- */

async function onChangeOwnPassword(e) {
  e.preventDefault();
  const form = e.target;
  const oldPassword = form.elements.namedItem('oldPassword').value;
  const newPassword = form.elements.namedItem('newPassword').value;
  const confirmPassword = form.elements.namedItem('confirmPassword').value;
  const errorBox = document.getElementById('change-password-error');
  const successBox = document.getElementById('change-password-success');
  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');

  if (newPassword !== confirmPassword) {
    errorBox.textContent = 'Konfirmasi password baru tidak cocok.';
    errorBox.classList.remove('hidden');
    return;
  }

  const res = await API.post('changeOwnPassword', { oldPassword: oldPassword, newPassword: newPassword });
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal mengganti password.';
    errorBox.classList.remove('hidden');
    return;
  }
  form.reset();
  successBox.textContent = 'Password berhasil diganti.';
  successBox.classList.remove('hidden');
}

/* ---------- Daftar Akun (admin) ---------- */

async function onAccountSearchInput(e) {
  accountState.q = e.target.value;
  accountState.page = 1;
  loadAccounts();
}

async function loadAccounts() {
  const res = await API.get('accounts', {
    q: accountState.q, field: accountState.field, page: accountState.page, pageSize: accountState.pageSize,
    sortField: accountState.sortField, sortDir: accountState.sortDir
  });
  const tbody = document.getElementById('accounts-tbody');
  const emptyState = document.getElementById('accounts-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat data akun.';
    emptyState.classList.remove('hidden');
    document.getElementById('accounts-pagination').innerHTML = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;
  accountState.sortField = res.data.sortField || accountState.sortField;
  accountState.sortDir = res.data.sortDir || accountState.sortDir;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada akun yang cocok.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(accountRowTemplate).join('');
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn =>
      btn.addEventListener('click', () => openAccountForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="reset-password"]').forEach(btn =>
      btn.addEventListener('click', () => openResetPasswordForm(btn.dataset.id, btn.dataset.username)));
    tbody.querySelectorAll('[data-action="deactivate"]').forEach(btn =>
      btn.addEventListener('click', () => onDeactivateAccount(btn.dataset.id, btn.dataset.username)));
  }
  document.getElementById('accounts-count').textContent = total + ' akun ditemukan';

  TableControls.updateSortIndicators(document.getElementById('accounts-thead'), accountState);
  TableControls.renderPagination(document.getElementById('accounts-pagination'), { page: accountState.page, pageSize: accountState.pageSize, total: total }, {
    onPageChange: (page) => { accountState.page = page; loadAccounts(); },
    onPageSizeChange: (pageSize) => { accountState.pageSize = pageSize; accountState.page = 1; loadAccounts(); }
  });
}

function accountRowTemplate(a) {
  const statusClass = a.Status === 'Aktif' ? 'status-selesai' : 'status-antrian';
  return `
    <tr>
      <td data-label="Nama Lengkap">${escapeHtml(a['Nama Lengkap'])}</td>
      <td data-label="Username">${escapeHtml(a.Username)}</td>
      <td data-label="Role">${escapeHtml(a.Role)}</td>
      <td data-label="Status"><span class="status-pill ${statusClass}"><span class="dot"></span>${escapeHtml(a.Status)}</span></td>
      <td data-label="Last Login">${escapeHtml(a['Last Login'] || '-')}</td>
      <td data-label="Aksi">
        <button type="button" class="btn btn-outline" data-action="edit" data-id="${a.ID}" aria-label="Ubah akun ${escapeHtml(a.Username)}">Ubah</button>
        <button type="button" class="btn btn-outline" data-action="reset-password" data-id="${a.ID}" data-username="${escapeHtml(a.Username)}" aria-label="Reset password ${escapeHtml(a.Username)}">Reset Password</button>
        <button type="button" class="btn btn-danger" data-action="deactivate" data-id="${a.ID}" data-username="${escapeHtml(a.Username)}" aria-label="Nonaktifkan ${escapeHtml(a.Username)}">Nonaktifkan</button>
      </td>
    </tr>`;
}

async function onDeactivateAccount(id, username) {
  const confirmed = await AppModal.confirm('Nonaktifkan akun "' + username + '"? Akun tidak dihapus permanen, hanya tidak bisa login lagi.', 'Nonaktifkan Akun');
  if (!confirmed) return;
  const res = await API.post('deactivateAccount', { id: id });
  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal menonaktifkan akun.');
    return;
  }
  loadAccounts();
}

/* ---------- Form Tambah/Ubah Akun ---------- */

function openAccountForm(id) {
  accountState.editingId = id || null;
  const form = document.getElementById('account-form');
  form.reset();
  document.getElementById('account-form-title').textContent = id ? 'Ubah Akun' : 'Tambah Akun';
  document.getElementById('account-form-error').classList.add('hidden');

  const passwordField = document.getElementById('account-password-field');
  passwordField.classList.toggle('hidden', !!id);
  form.elements.namedItem('Password').required = !id;

  if (id) {
    API.get('accountDetail', { id: id }).then(res => {
      if (!res || !res.success || !res.data) return;
      const a = res.data;
      ['Nama Lengkap', 'Username', 'Nomor HP', 'Role', 'Status'].forEach(key => {
        const input = form.elements.namedItem(key);
        if (input) input.value = a[key];
      });
    });
  }
  document.getElementById('account-form-modal').classList.remove('hidden');
}

function closeAccountForm() {
  document.getElementById('account-form-modal').classList.add('hidden');
  document.getElementById('account-form-error').classList.add('hidden');
}

async function onSubmitAccountForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  ['Nama Lengkap', 'Username', 'Nomor HP', 'Role', 'Status'].forEach(field => {
    const input = form.elements.namedItem(field);
    if (input) data[field] = input.value;
  });
  if (!accountState.editingId) {
    data.Password = form.elements.namedItem('Password').value;
  }

  const action = accountState.editingId ? 'updateAccount' : 'addAccount';
  const payload = accountState.editingId ? { id: accountState.editingId, data: data } : { data: data };
  const res = await API.post(action, payload);

  const errorBox = document.getElementById('account-form-error');
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menyimpan akun.';
    errorBox.classList.remove('hidden');
    return;
  }
  closeAccountForm();
  loadAccounts();
}

/* ---------- Reset Password (admin) ---------- */

function openResetPasswordForm(id, username) {
  accountState.resettingId = id;
  document.getElementById('reset-password-form').reset();
  document.getElementById('reset-password-username').textContent = username;
  document.getElementById('reset-password-error').classList.add('hidden');
  document.getElementById('reset-password-modal').classList.remove('hidden');
}

function closeResetPasswordForm() {
  document.getElementById('reset-password-modal').classList.add('hidden');
}

async function onSubmitResetPassword(e) {
  e.preventDefault();
  const form = e.target;
  const newPassword = form.elements.namedItem('newPassword').value;
  const confirmPassword = form.elements.namedItem('confirmPassword').value;
  const errorBox = document.getElementById('reset-password-error');

  if (newPassword !== confirmPassword) {
    errorBox.textContent = 'Konfirmasi password tidak cocok.';
    errorBox.classList.remove('hidden');
    return;
  }

  const res = await API.post('resetAccountPassword', { id: accountState.resettingId, newPassword: newPassword });
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal mereset password.';
    errorBox.classList.remove('hidden');
    return;
  }
  closeResetPasswordForm();
  await AppModal.alert('Password berhasil direset.', 'Berhasil');
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
