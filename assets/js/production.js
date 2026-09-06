const prodState = {
  page: 1,
  pageSize: 50,
  field: 'Judul',
  q: '',
  status: '',
  sortField: 'Tanggal Mulai',
  sortDir: 'desc',
  editingId: null,
  linkedBookId: ''
};

const PRODUCTION_STATUSES = ['Antrian', 'Rekaman', 'Editing', 'Proofreading', 'Selesai', 'Publish'];

document.addEventListener('DOMContentLoaded', () => {
  loadProduksi();

  document.getElementById('btn-add-produksi').addEventListener('click', () => openProdForm());
  document.getElementById('prod-search-input').addEventListener('input', debounce(onProdSearchInput, 300));
  document.getElementById('prod-search-field').addEventListener('change', (e) => {
    prodState.field = e.target.value;
    prodState.page = 1;
    loadProduksi();
  });
  document.getElementById('prod-status-filter').addEventListener('change', (e) => {
    prodState.status = e.target.value;
    prodState.page = 1;
    loadProduksi();
  });

  document.getElementById('produksi-form').addEventListener('submit', onSubmitProdForm);
  document.getElementById('btn-cancel-prod-form').addEventListener('click', closeProdForm);
  document.getElementById('btn-close-prod-detail').addEventListener('click', closeProdDetail);

  document.getElementById('prod-book-search').addEventListener('input', debounce(onLinkBookSearch, 300));
  document.getElementById('btn-unlink-book').addEventListener('click', clearLinkedBook);

  TableControls.bindSortableHeaders(
    document.getElementById('produksi-thead'),
    () => prodState,
    (field, dir) => {
      prodState.sortField = field;
      prodState.sortDir = dir;
      prodState.page = 1;
      loadProduksi();
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

/* ---------- Daftar Produksi ---------- */

async function onProdSearchInput(e) {
  prodState.q = e.target.value;
  prodState.page = 1;
  loadProduksi();
}

async function loadProduksi() {
  const res = await API.get('produksi', {
    q: prodState.q, field: prodState.field, status: prodState.status,
    page: prodState.page, pageSize: prodState.pageSize,
    sortField: prodState.sortField, sortDir: prodState.sortDir
  });
  const tbody = document.getElementById('produksi-tbody');
  const emptyState = document.getElementById('produksi-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat data produksi.';
    emptyState.classList.remove('hidden');
    document.getElementById('produksi-pagination').innerHTML = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;
  prodState.sortField = res.data.sortField || prodState.sortField;
  prodState.sortDir = res.data.sortDir || prodState.sortDir;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada data produksi yang cocok.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(prodRowTemplate).join('');
    tbody.querySelectorAll('[data-action="detail"]').forEach(btn =>
      btn.addEventListener('click', () => openProdDetail(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn =>
      btn.addEventListener('click', () => openProdForm(btn.dataset.id)));
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn =>
      btn.addEventListener('click', () => onDeleteProd(btn.dataset.id, btn.dataset.judul)));
    tbody.querySelectorAll('select[data-action="status"]').forEach(sel =>
      sel.addEventListener('change', () => onChangeProdStatus(sel.dataset.id, sel.value)));
  }
  document.getElementById('produksi-count').textContent = total + ' data produksi ditemukan';

  TableControls.updateSortIndicators(document.getElementById('produksi-thead'), prodState);
  TableControls.renderPagination(document.getElementById('produksi-pagination'), { page: prodState.page, pageSize: prodState.pageSize, total: total }, {
    onPageChange: (page) => { prodState.page = page; loadProduksi(); },
    onPageSizeChange: (pageSize) => { prodState.pageSize = pageSize; prodState.page = 1; loadProduksi(); }
  });
}

function statusPillClass(status) {
  return (status === 'Selesai' || status === 'Publish') ? 'status-selesai' : 'status-antrian';
}

function prodRowTemplate(p) {
  return `
    <tr>
      <td data-label="Judul"><button type="button" class="link-like" data-action="detail" data-id="${p['ID Produksi']}">${escapeHtml(p.Judul)}</button></td>
      <td data-label="Pembaca">${escapeHtml(p.Pembaca || '-')}</td>
      <td data-label="Editor">${escapeHtml(p.Editor || '-')}</td>
      <td data-label="Tanggal Mulai">${escapeHtml(formatDate(p['Tanggal Mulai']))}</td>
      <td data-label="Tanggal Selesai">${escapeHtml(formatDate(p['Tanggal Selesai']))}</td>
      <td data-label="Status">
        <span class="status-pill ${statusPillClass(p['Status Produksi'])}" style="margin-right:6px;"><span class="dot"></span>${escapeHtml(p['Status Produksi'])}</span>
        <select data-action="status" data-id="${p['ID Produksi']}" aria-label="Ubah status produksi ${escapeHtml(p.Judul)}" style="width:auto; display:inline-block; padding:4px 6px;">
          ${PRODUCTION_STATUSES.map(s => `<option value="${s}" ${s === p['Status Produksi'] ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td data-label="Aksi">
        <button type="button" class="btn btn-outline" data-action="edit" data-id="${p['ID Produksi']}" aria-label="Ubah ${escapeHtml(p.Judul)}">Ubah</button>
        <button type="button" class="btn btn-danger" data-action="delete" data-id="${p['ID Produksi']}" data-judul="${escapeHtml(p.Judul)}" aria-label="Hapus ${escapeHtml(p.Judul)}">Hapus</button>
      </td>
    </tr>`;
}

async function onChangeProdStatus(id, status) {
  const res = await API.post('updateProduksiStatus', { id: id, status: status });
  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal mengubah status.');
  }
  loadProduksi();
}

async function onDeleteProd(id, judul) {
  const confirmed = await AppModal.confirm('Hapus data produksi "' + judul + '"? Judul yang sudah tersinkron ke Data DTB tidak akan ikut terhapus.', 'Hapus Data Produksi');
  if (!confirmed) return;
  const res = await API.post('deleteProduksi', { id: id });
  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal menghapus data produksi.');
    return;
  }
  loadProduksi();
}

/* ---------- Detail ---------- */

async function openProdDetail(id) {
  const res = await API.get('produksiDetail', { id: id });
  if (!res || !res.success || !res.data) return;
  const p = res.data;
  document.getElementById('prod-detail-body').innerHTML = `
    <dl class="detail-list">
      <dt>Judul</dt><dd>${escapeHtml(p.Judul)}</dd>
      <dt>Sub Judul</dt><dd>${escapeHtml(p['Sub Judul'] || '-')}</dd>
      <dt>Keterangan</dt><dd>${escapeHtml(p.Keterangan || '-')}</dd>
      <dt>Pengarang</dt><dd>${escapeHtml(p.Pengarang || '-')}</dd>
      <dt>Penerbit</dt><dd>${escapeHtml(p.Penerbit || '-')}</dd>
      <dt>Cetakan</dt><dd>${escapeHtml(p.Cetakan || '-')}</dd>
      <dt>Tahun</dt><dd>${escapeHtml(p.Tahun || '-')}</dd>
      <dt>Halaman</dt><dd>${escapeHtml(p.Halaman || '-')}</dd>
      <dt>Pembaca</dt><dd>${escapeHtml(p.Pembaca || '-')}</dd>
      <dt>Editor</dt><dd>${escapeHtml(p.Editor || '-')}</dd>
      <dt>Jam Baca</dt><dd>${escapeHtml(p['Jam Baca'] || '-')}</dd>
      <dt>Jam Edit</dt><dd>${escapeHtml(p['Jam Edit'] || '-')}</dd>
      <dt>Tanggal Mulai</dt><dd>${escapeHtml(formatDate(p['Tanggal Mulai']) || '-')}</dd>
      <dt>Tanggal Selesai</dt><dd>${escapeHtml(formatDate(p['Tanggal Selesai']) || '-')}</dd>
      <dt>Alamat File</dt><dd>${escapeHtml(p['Alamat File'] || '-')}</dd>
      <dt>Status Produksi</dt><dd>${escapeHtml(p['Status Produksi'])}</dd>
      <dt>Tertaut Data DTB</dt><dd>${p['ID Buku'] ? escapeHtml(p['ID Buku']) : 'Belum tertaut'}</dd>
    </dl>`;
  document.getElementById('prod-detail-modal').classList.remove('hidden');
}

function closeProdDetail() {
  document.getElementById('prod-detail-modal').classList.add('hidden');
}

/* ---------- Form Tambah/Ubah ---------- */

function openProdForm(id) {
  prodState.editingId = id || null;
  prodState.linkedBookId = '';
  const form = document.getElementById('produksi-form');
  form.reset();
  document.getElementById('prod-form-title').textContent = id ? 'Ubah Data Produksi' : 'Tambah Data Produksi';
  document.getElementById('prod-form-error').classList.add('hidden');
  document.getElementById('prod-book-search').value = '';
  document.getElementById('prod-book-results').innerHTML = '';
  renderLinkedBook(null);

  if (id) {
    API.get('produksiDetail', { id: id }).then(res => {
      if (!res || !res.success || !res.data) return;
      const p = res.data;
      Object.keys(p).forEach(key => {
        const input = form.elements.namedItem(key);
        if (!input) return;
        const isDateField = key === 'Tanggal Mulai' || key === 'Tanggal Selesai';
        input.value = isDateField ? toDateInputValue(p[key]) : p[key];
      });
      if (p['ID Buku']) {
        prodState.linkedBookId = p['ID Buku'];
        renderLinkedBook({ id: p['ID Buku'], judul: p.Judul });
      }
    });
  }
  document.getElementById('prod-form-modal').classList.remove('hidden');
}

function closeProdForm() {
  document.getElementById('prod-form-modal').classList.add('hidden');
  document.getElementById('prod-form-error').classList.add('hidden');
}

async function onSubmitProdForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = {};
  ['Judul', 'Sub Judul', 'Keterangan', 'Pengarang', 'Penerbit', 'Cetakan', 'Tahun', 'Halaman',
    'Pembaca', 'Editor', 'Jam Baca', 'Jam Edit', 'Tanggal Mulai', 'Tanggal Selesai', 'Alamat File',
    'Status Produksi'].forEach(field => {
    const input = form.elements.namedItem(field);
    if (input) data[field] = input.value;
  });
  if (prodState.linkedBookId) data['ID Buku'] = prodState.linkedBookId;

  const action = prodState.editingId ? 'updateProduksi' : 'addProduksi';
  const payload = prodState.editingId ? { id: prodState.editingId, data: data } : { data: data };
  const res = await API.post(action, payload);

  const errorBox = document.getElementById('prod-form-error');
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menyimpan data produksi.';
    errorBox.classList.remove('hidden');
    return;
  }
  closeProdForm();
  loadProduksi();
}

/* ---------- Tautkan ke judul Data DTB yang sudah ada (opsional) ---------- */

async function onLinkBookSearch(e) {
  const q = e.target.value;
  const box = document.getElementById('prod-book-results');
  if (!q) { box.innerHTML = ''; return; }

  const res = await API.get('books', { q: q, field: 'Judul', page: 1, pageSize: 5 });
  if (!res || !res.success || !res.data.items.length) {
    box.innerHTML = '<p style="color:var(--color-muted); margin:8px 0 0;">Tidak ditemukan. Biarkan kosong untuk membuat judul baru otomatis saat status Selesai/Publish.</p>';
    return;
  }

  const items = res.data.items;
  box.innerHTML = items.map((b, idx) => `
    <div class="card" style="padding:10px 12px; margin-top:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div>
        <strong>${escapeHtml(b.Judul)}</strong><br>
        <span style="color:var(--color-muted); font-size:0.9rem;">${escapeHtml(b.Pengarang || '-')}</span>
      </div>
      <button type="button" class="btn btn-outline" data-idx="${idx}">Tautkan</button>
    </div>`).join('');

  box.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const book = items[Number(btn.dataset.idx)];
      linkExistingBook(book);
      document.getElementById('prod-book-search').value = '';
      box.innerHTML = '';
    });
  });
}

/**
 * Menautkan judul yang sudah ada di Data DTB DAN mengisi ulang field form
 * dari data buku tersebut, supaya admin tidak perlu mengetik ulang
 * Pengarang/Penerbit/Cetakan/Tahun/Halaman/Pembaca/Editor/Alamat File.
 * Tanggal Mulai/Selesai, Jam Baca/Edit, dan Status Produksi tidak disentuh
 * karena itu murni milik alur produksi, bukan katalog.
 */
function linkExistingBook(book) {
  prodState.linkedBookId = book['ID Buku'];
  renderLinkedBook({ id: book['ID Buku'], judul: book.Judul });

  const form = document.getElementById('produksi-form');
  const fieldMap = {
    Judul: 'Judul',
    'Sub Judul': 'Sub Judul',
    Keterangan: 'Keterangan',
    Pengarang: 'Pengarang',
    Penerbit: 'Penerbit',
    Cetakan: 'Cetakan',
    Tahun: 'Tahun',
    Halaman: 'Halaman',
    'Pembaca DTB': 'Pembaca',
    'Editor DTB': 'Editor',
    'Alamat File DTB': 'Alamat File'
  };
  Object.keys(fieldMap).forEach(bookField => {
    const input = form.elements.namedItem(fieldMap[bookField]);
    if (input && book[bookField] !== undefined && book[bookField] !== '') {
      input.value = book[bookField];
    }
  });
}

function renderLinkedBook(book) {
  const box = document.getElementById('linked-book-box');
  if (!book) {
    box.classList.add('hidden');
    return;
  }
  document.getElementById('linked-book-name').textContent = book.judul + ' (' + book.id + ')';
  box.classList.remove('hidden');
}

function clearLinkedBook() {
  prodState.linkedBookId = '';
  renderLinkedBook(null);
}

/* ---------- Util ---------- */

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
