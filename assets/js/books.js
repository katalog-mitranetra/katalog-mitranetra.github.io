const state = {
  page: 1,
  pageSize: 10,
  field: 'Judul',
  q: '',
  editingId: null
};

document.addEventListener('DOMContentLoaded', () => {
  loadBooks();

  document.getElementById('btn-add-book').addEventListener('click', () => openForm());
  document.getElementById('search-input').addEventListener('input', debounce(onSearchInput, 300));
  document.getElementById('search-field').addEventListener('change', (e) => {
    state.field = e.target.value;
    state.page = 1;
    loadBooks();
  });

  document.getElementById('book-form').addEventListener('submit', onSubmitForm);
  document.getElementById('btn-cancel-form').addEventListener('click', closeForm);
  document.getElementById('btn-close-detail').addEventListener('click', closeDetail);
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function onSearchInput(e) {
  state.q = e.target.value;
  state.page = 1;
  await loadBooks();
  await loadSuggestions(e.target.value);
}

async function loadSuggestions(query) {
  const box = document.getElementById('suggest-list');
  if (!query) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  const res = await API.get('autosuggest', { field: state.field, q: query });
  if (!res || !res.success || !res.data.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.innerHTML = res.data.map(v => `<button type="button">${escapeHtml(v)}</button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('search-input').value = btn.textContent;
      state.q = btn.textContent;
      box.classList.add('hidden');
      loadBooks();
    });
  });
}

async function loadBooks() {
  const res = await API.get('books', { q: state.q, field: state.field, page: state.page, pageSize: state.pageSize });
  const tbody = document.getElementById('books-tbody');
  const emptyState = document.getElementById('books-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat data buku.';
    emptyState.classList.remove('hidden');
    document.getElementById('books-count').textContent = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada buku yang cocok dengan pencarian.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(rowTemplate).join('');
    tbody.querySelectorAll('[data-action="detail"]').forEach(btn =>
      btn.addEventListener('click', () => openDetail(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn =>
      btn.addEventListener('click', () => openForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn =>
      btn.addEventListener('click', () => onDelete(btn.dataset.id, btn.dataset.title)));
  }
  document.getElementById('books-count').textContent = total + ' judul ditemukan';
}

function rowTemplate(b) {
  return `
    <tr>
      <td data-label="Judul"><button type="button" class="link-like" data-action="detail" data-id="${b['ID Buku']}">${escapeHtml(b.Judul)}</button></td>
      <td data-label="Pengarang">${escapeHtml(b.Pengarang || '-')}</td>
      <td data-label="Penerbit">${escapeHtml(b.Penerbit || '-')}</td>
      <td data-label="Pembaca DTB">${escapeHtml(b['Pembaca DTB'] || '-')}</td>
      <td data-label="Tanggal Produksi">${escapeHtml(formatDate(b['Tanggal Produksi']))}</td>
      <td data-label="Aksi">
        <button type="button" class="btn btn-outline" data-action="detail" data-id="${b['ID Buku']}" aria-label="Lihat detail ${escapeHtml(b.Judul)}">Detail</button>
        <button type="button" class="btn btn-outline" data-action="edit" data-id="${b['ID Buku']}" aria-label="Ubah ${escapeHtml(b.Judul)}">Ubah</button>
        <button type="button" class="btn btn-danger" data-action="delete" data-id="${b['ID Buku']}" data-title="${escapeHtml(b.Judul)}" aria-label="Hapus ${escapeHtml(b.Judul)}">Hapus</button>
      </td>
    </tr>`;
}

async function openDetail(id) {
  const res = await API.get('bookDetail', { id: id });
  if (!res || !res.success || !res.data) return;
  const b = res.data;
  document.getElementById('detail-body').innerHTML = `
    <dl class="detail-list">
      <dt>Judul</dt><dd>${escapeHtml(b.Judul)}</dd>
      <dt>Sub Judul</dt><dd>${escapeHtml(b['Sub Judul'] || '-')}</dd>
      <dt>Keterangan</dt><dd>${escapeHtml(b.Keterangan || '-')}</dd>
      <dt>Pengarang</dt><dd>${escapeHtml(b.Pengarang || '-')}</dd>
      <dt>Penerbit</dt><dd>${escapeHtml(b.Penerbit || '-')}</dd>
      <dt>Cetakan</dt><dd>${escapeHtml(b.Cetakan || '-')}</dd>
      <dt>Tahun</dt><dd>${escapeHtml(b.Tahun || '-')}</dd>
      <dt>Halaman</dt><dd>${escapeHtml(b.Halaman || '-')}</dd>
      <dt>Pembaca DTB</dt><dd>${escapeHtml(b['Pembaca DTB'] || '-')}</dd>
      <dt>Editor DTB</dt><dd>${escapeHtml(b['Editor DTB'] || '-')}</dd>
      <dt>Jam Baca DTB</dt><dd>${escapeHtml(b['Jam Baca DTB'] || '-')}</dd>
      <dt>Jam Edit DTB</dt><dd>${escapeHtml(b['Jam Edit DTB'] || '-')}</dd>
      <dt>Tanggal Produksi</dt><dd>${escapeHtml(formatDate(b['Tanggal Produksi']) || '-')}</dd>
      <dt>Alamat File DTB</dt><dd>${escapeHtml(b['Alamat File DTB'] || '-')}</dd>
      <dt>Status</dt><dd>${escapeHtml(b.Status || '-')}</dd>
    </dl>`;
  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detail-modal').classList.add('hidden');
}

function openForm(id) {
  state.editingId = id || null;
  const form = document.getElementById('book-form');
  form.reset();
  document.getElementById('form-title').textContent = id ? 'Ubah Buku' : 'Tambah Buku';
  document.getElementById('form-error').classList.add('hidden');

  if (id) {
    API.get('bookDetail', { id: id }).then(res => {
      if (!res || !res.success || !res.data) return;
      const b = res.data;
      Object.keys(b).forEach(key => {
        const input = form.elements.namedItem(key);
        if (!input) return;
        input.value = key === 'Tanggal Produksi' ? toDateInputValue(b[key]) : b[key];
      });
    });
  }
  document.getElementById('form-modal').classList.remove('hidden');
}

function closeForm() {
  document.getElementById('form-modal').classList.add('hidden');
  document.getElementById('form-error').classList.add('hidden');
}

async function onSubmitForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  ['Judul', 'Sub Judul', 'Keterangan', 'Pengarang', 'Penerbit', 'Cetakan', 'Tahun', 'Halaman',
    'Pembaca DTB', 'Editor DTB', 'Jam Baca DTB', 'Jam Edit DTB', 'Tanggal Produksi',
    'Alamat File DTB'].forEach(field => {
    const input = form.elements.namedItem(field);
    if (input) data[field] = input.value;
  });

  const action = state.editingId ? 'updateBook' : 'addBook';
  const payload = state.editingId ? { id: state.editingId, data: data } : { data: data };
  const res = await API.post(action, payload);

  const errorBox = document.getElementById('form-error');
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menyimpan data.';
    errorBox.classList.remove('hidden');
    return;
  }
  closeForm();
  loadBooks();
}

async function onDelete(id, title) {
  const confirmed = window.confirm('Apakah Anda yakin ingin menghapus "' + title + '"?');
  if (!confirmed) return;
  const res = await API.post('deleteBook', { id: id });
  if (!res || !res.success) {
    alert((res && res.message) || 'Gagal menghapus data.');
    return;
  }
  loadBooks();
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
