const memberState = {
  page: 1,
  pageSize: 10,
  field: 'Nama',
  q: '',
  editingId: null
};

document.addEventListener('DOMContentLoaded', () => {
  loadMembers();

  document.getElementById('btn-add-member').addEventListener('click', () => openMemberForm());
  document.getElementById('member-search-input').addEventListener('input', debounce(onMemberSearchInput, 300));
  document.getElementById('member-search-field').addEventListener('change', (e) => {
    memberState.field = e.target.value;
    memberState.page = 1;
    loadMembers();
  });

  document.getElementById('member-form').addEventListener('submit', onSubmitMemberForm);
  document.getElementById('btn-cancel-member-form').addEventListener('click', closeMemberForm);
  document.getElementById('btn-close-member-detail').addEventListener('click', closeMemberDetail);
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function onMemberSearchInput(e) {
  memberState.q = e.target.value;
  memberState.page = 1;
  await loadMembers();
}

async function loadMembers() {
  const res = await API.get('members', {
    q: memberState.q, field: memberState.field, page: memberState.page, pageSize: memberState.pageSize
  });
  const tbody = document.getElementById('members-tbody');
  const emptyState = document.getElementById('members-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat data anggota.';
    emptyState.classList.remove('hidden');
    document.getElementById('members-count').textContent = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada anggota yang cocok dengan pencarian.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(memberRowTemplate).join('');
    tbody.querySelectorAll('[data-action="detail"]').forEach(btn =>
      btn.addEventListener('click', () => openMemberDetail(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn =>
      btn.addEventListener('click', () => openMemberForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn =>
      btn.addEventListener('click', () => onDeleteMember(btn.dataset.id, btn.dataset.nama)));
  }
  document.getElementById('members-count').textContent = total + ' anggota ditemukan';
}

function memberRowTemplate(m) {
  const statusClass = m.Status === 'Aktif' ? 'status-selesai' : 'status-antrian';
  return `
    <tr>
      <td data-label="Nama"><button type="button" class="link-like" data-action="detail" data-id="${m.ID}">${escapeHtml(m.Nama)}</button></td>
      <td data-label="No. Anggota">${escapeHtml(m['No. Anggota'] || '-')}</td>
      <td data-label="BT/LV">${escapeHtml(m['BT/LV'] || '-')}</td>
      <td data-label="Telepon">${escapeHtml(m.Telepon || '-')}</td>
      <td data-label="Status"><span class="status-pill ${statusClass}"><span class="dot"></span>${escapeHtml(m.Status || '-')}</span></td>
      <td data-label="Aksi">
        <button type="button" class="btn btn-outline" data-action="detail" data-id="${m.ID}" aria-label="Lihat detail ${escapeHtml(m.Nama)}">Detail</button>
        <button type="button" class="btn btn-outline" data-action="edit" data-id="${m.ID}" aria-label="Ubah ${escapeHtml(m.Nama)}">Ubah</button>
        <button type="button" class="btn btn-danger" data-action="delete" data-id="${m.ID}" data-nama="${escapeHtml(m.Nama)}" aria-label="Nonaktifkan ${escapeHtml(m.Nama)}">Nonaktifkan</button>
      </td>
    </tr>`;
}

async function openMemberDetail(id) {
  const res = await API.get('memberDetail', { id: id });
  if (!res || !res.success || !res.data) return;
  const m = res.data;
  document.getElementById('member-detail-body').innerHTML = `
    <dl class="detail-list">
      <dt>Nama</dt><dd>${escapeHtml(m.Nama)}</dd>
      <dt>No. Anggota</dt><dd>${escapeHtml(m['No. Anggota'] || '-')}</dd>
      <dt>L/P</dt><dd>${escapeHtml(m['L/P'] || '-')}</dd>
      <dt>Tanggal Lahir</dt><dd>${escapeHtml(formatDate(m['Tanggal Lahir']) || '-')}</dd>
      <dt>Agama</dt><dd>${escapeHtml(m.Agama || '-')}</dd>
      <dt>BT/LV</dt><dd>${escapeHtml(m['BT/LV'] || '-')}</dd>
      <dt>Pendidikan</dt><dd>${escapeHtml(m.Pendidikan || '-')}</dd>
      <dt>Alamat 1</dt><dd>${escapeHtml(m['Alamat 1'] || '-')}</dd>
      <dt>Alamat 2</dt><dd>${escapeHtml(m['Alamat 2'] || '-')}</dd>
      <dt>Telepon</dt><dd>${escapeHtml(m.Telepon || '-')}</dd>
      <dt>Pekerjaan</dt><dd>${escapeHtml(m.Pekerjaan || '-')}</dd>
      <dt>Status</dt><dd>${escapeHtml(m.Status || '-')}</dd>
      <dt>Tanggal Daftar</dt><dd>${escapeHtml(formatDate(m['Tanggal Daftar']) || '-')}</dd>
    </dl>`;
  document.getElementById('member-detail-modal').classList.remove('hidden');
}

function closeMemberDetail() {
  document.getElementById('member-detail-modal').classList.add('hidden');
}

function openMemberForm(id) {
  memberState.editingId = id || null;
  const form = document.getElementById('member-form');
  form.reset();
  document.getElementById('member-form-title').textContent = id ? 'Ubah Anggota' : 'Tambah Anggota';
  document.getElementById('member-form-error').classList.add('hidden');

  if (id) {
    API.get('memberDetail', { id: id }).then(res => {
      if (!res || !res.success || !res.data) return;
      const m = res.data;
      Object.keys(m).forEach(key => {
        const input = form.elements.namedItem(key);
        if (!input) return;
        const isDateField = key === 'Tanggal Lahir' || key === 'Tanggal Daftar';
        input.value = isDateField ? toDateInputValue(m[key]) : m[key];
      });
    });
  }
  document.getElementById('member-form-modal').classList.remove('hidden');
}

function closeMemberForm() {
  document.getElementById('member-form-modal').classList.add('hidden');
  document.getElementById('member-form-error').classList.add('hidden');
}

async function onSubmitMemberForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  ['No. Anggota', 'Nama', 'L/P', 'Tanggal Lahir', 'Agama', 'BT/LV', 'Pendidikan',
    'Alamat 1', 'Alamat 2', 'Telepon', 'Pekerjaan', 'Status', 'Tanggal Daftar'].forEach(field => {
    const input = form.elements.namedItem(field);
    if (input) data[field] = input.value;
  });

  const action = memberState.editingId ? 'updateMember' : 'addMember';
  const payload = memberState.editingId ? { id: memberState.editingId, data: data } : { data: data };
  const res = await API.post(action, payload);

  const errorBox = document.getElementById('member-form-error');
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menyimpan data.';
    errorBox.classList.remove('hidden');
    return;
  }
  closeMemberForm();
  loadMembers();
}

async function onDeleteMember(id, nama) {
  const confirmed = window.confirm('Nonaktifkan anggota "' + nama + '"? Anggota tidak dihapus permanen, hanya diubah menjadi Tidak Aktif.');
  if (!confirmed) return;
  const res = await API.post('deleteMember', { id: id });
  if (!res || !res.success) {
    alert((res && res.message) || 'Gagal menonaktifkan anggota.');
    return;
  }
  loadMembers();
}

function extractDateParts(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return { yyyy: match[1], mm: match[2], dd: match[3] };
  const d = new Date(value);
  if (isNaN(d)) return null;
  return {
    yyyy: String(d.getFullYear()),
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    dd: String(d.getDate()).padStart(2, '0')
  };
}

function formatDate(value) {
  const p = extractDateParts(value);
  return p ? (p.dd + '/' + p.mm + '/' + p.yyyy) : '';
}

function toDateInputValue(value) {
  const p = extractDateParts(value);
  return p ? (p.yyyy + '-' + p.mm + '-' + p.dd) : '';
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
