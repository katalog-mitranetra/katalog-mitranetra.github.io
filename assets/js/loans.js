const loanForm = {
  selectedMember: null,
  cart: []
};

const loanHistory = {
  page: 1,
  pageSize: 50,
  q: '',
  status: '',
  sortField: 'Tanggal',
  sortDir: 'desc'
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('l-tanggal').valueAsDate = new Date();

  loadJenisOptions();
  loadLoans();

  document.getElementById('member-search-input').addEventListener('input', debounce(onMemberSearch, 300));
  document.getElementById('btn-change-member').addEventListener('click', clearSelectedMember);

  document.getElementById('book-search-input').addEventListener('input', debounce(onBookSearch, 300));
  document.getElementById('btn-add-manual').addEventListener('click', () => openManualForm());
  document.getElementById('manual-item-form').addEventListener('submit', onSubmitManualItem);
  document.getElementById('btn-cancel-manual').addEventListener('click', closeManualForm);

  document.getElementById('btn-save-loan').addEventListener('click', onSaveLoan);

  document.getElementById('loan-history-search').addEventListener('input', debounce(onLoanHistorySearch, 300));
  document.getElementById('loan-status-filter').addEventListener('change', (e) => {
    loanHistory.status = e.target.value;
    loanHistory.page = 1;
    loadLoans();
  });

  document.getElementById('btn-close-loan-detail').addEventListener('click', closeLoanDetail);

  TableControls.bindSortableHeaders(
    document.getElementById('loans-thead'),
    () => loanHistory,
    (field, dir) => {
      loanHistory.sortField = field;
      loanHistory.sortDir = dir;
      loanHistory.page = 1;
      loadLoans();
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

/* ---------- Jenis dropdown ---------- */

async function loadJenisOptions() {
  const select = document.getElementById('l-jenis');
  const res = await API.get('masterJenis');
  const fallback = ['DTB', 'EPub', 'Braille', 'Evo 5', 'Evo 10', 'Laptop'];
  const items = (res && res.success && res.data && res.data.length)
    ? res.data.map(j => j.nama)
    : fallback;
  select.innerHTML = items.map(nama => `<option value="${escapeHtml(nama)}">${escapeHtml(nama)}</option>`).join('');
}

/* ---------- Pilih anggota ---------- */

async function onMemberSearch(e) {
  const box = document.getElementById('member-suggest-list');
  const q = e.target.value;
  if (!q) { box.innerHTML = ''; box.classList.add('hidden'); return; }

  const res = await API.get('memberQuickSearch', { q: q });
  if (!res || !res.success || !res.data.length) {
    box.innerHTML = '<div style="padding:8px 12px; color:var(--color-muted);">Tidak ditemukan.</div>';
    box.classList.remove('hidden');
    return;
  }
  box.innerHTML = res.data.map(m => `
    <button type="button" data-id="${m.id}" data-nama="${escapeHtml(m.nama)}" data-noanggota="${escapeHtml(m.noAnggota || '')}" data-telepon="${escapeHtml(m.telepon || '')}">
      ${escapeHtml(m.nama)} ${m.noAnggota ? '&middot; ' + escapeHtml(m.noAnggota) : ''}
    </button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      loanForm.selectedMember = {
        id: btn.dataset.id,
        nama: btn.dataset.nama,
        noAnggota: btn.dataset.noanggota,
        telepon: btn.dataset.telepon
      };
      renderSelectedMember();
      box.innerHTML = '';
      box.classList.add('hidden');
      document.getElementById('member-search-input').value = '';
    });
  });
}

function renderSelectedMember() {
  const box = document.getElementById('selected-member-box');
  if (!loanForm.selectedMember) {
    box.classList.add('hidden');
    document.getElementById('member-search-wrap').classList.remove('hidden');
    return;
  }
  const m = loanForm.selectedMember;
  document.getElementById('selected-member-name').textContent = m.nama + (m.noAnggota ? ' (' + m.noAnggota + ')' : '');
  document.getElementById('selected-member-phone').textContent = m.telepon || '';
  box.classList.remove('hidden');
  document.getElementById('member-search-wrap').classList.add('hidden');
}

function clearSelectedMember() {
  loanForm.selectedMember = null;
  renderSelectedMember();
}

/* ---------- Cari buku (katalog) ---------- */

async function onBookSearch(e) {
  const q = e.target.value;
  const resultsBox = document.getElementById('book-search-results');
  const manualHint = document.getElementById('manual-hint');

  if (!q) { resultsBox.innerHTML = ''; manualHint.classList.add('hidden'); return; }

  const res = await API.get('books', { q: q, field: 'Judul', page: 1, pageSize: 5 });
  if (!res || !res.success) {
    resultsBox.innerHTML = '';
    manualHint.classList.add('hidden');
    return;
  }

  const items = res.data.items;
  if (!items.length) {
    resultsBox.innerHTML = '';
    manualHint.classList.remove('hidden');
    return;
  }
  manualHint.classList.add('hidden');
  resultsBox.innerHTML = items.map(b => `
    <div class="card" style="padding:12px; margin-bottom:8px;">
      <strong>${escapeHtml(b.Judul)}</strong><br>
      <span style="color:var(--color-muted);">${escapeHtml(b.Pengarang || '-')} &middot; Pembaca: ${escapeHtml(b['Pembaca DTB'] || '-')}</span>
      <div style="margin-top:8px;">
        <button type="button" class="btn btn-primary" data-id="${b['ID Buku']}">+ Pinjam</button>
      </div>
    </div>`).join('');
  resultsBox.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const book = items.find(b => b['ID Buku'] === btn.dataset.id);
      addToCart({
        Sumber: 'Katalog',
        IDBuku: book['ID Buku'],
        Judul: book.Judul,
        Pengarang: book.Pengarang,
        Pembaca: book['Pembaca DTB'],
        AlamatFile: book['Alamat File DTB']
      });
      document.getElementById('book-search-input').value = '';
      resultsBox.innerHTML = '';
      manualHint.classList.add('hidden');
    });
  });
}

/* ---------- Tambah judul manual (EPub/Braille dll.) ---------- */

function openManualForm() {
  document.getElementById('manual-item-form').reset();
  const prefill = document.getElementById('book-search-input').value;
  if (prefill) document.getElementById('mi-judul').value = prefill;
  document.getElementById('manual-form-modal').classList.remove('hidden');
}

function closeManualForm() {
  document.getElementById('manual-form-modal').classList.add('hidden');
}

function onSubmitManualItem(e) {
  e.preventDefault();
  const form = e.target;
  const judul = form.elements.namedItem('Judul').value.trim();
  if (!judul) return;

  addToCart({
    Sumber: 'Manual',
    IDBuku: '',
    Judul: judul,
    Pengarang: form.elements.namedItem('Pengarang').value,
    Penerbit: form.elements.namedItem('Penerbit').value,
    Cetakan: form.elements.namedItem('Cetakan').value,
    Tahun: form.elements.namedItem('Tahun').value,
    Pembaca: form.elements.namedItem('Pembaca').value,
    Editor: form.elements.namedItem('Editor').value,
    SimpanSebagaiMaster: form.elements.namedItem('SimpanSebagaiMaster').checked
  });

  closeManualForm();
  document.getElementById('book-search-input').value = '';
  document.getElementById('book-search-results').innerHTML = '';
  document.getElementById('manual-hint').classList.add('hidden');
}

/* ---------- Keranjang ---------- */

function addToCart(item) {
  loanForm.cart.push(item);
  renderCart();
}

function removeFromCart(index) {
  loanForm.cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const box = document.getElementById('cart-list');
  const countEl = document.getElementById('cart-count');
  countEl.textContent = 'TOTAL: ' + loanForm.cart.length + ' BUKU';

  if (!loanForm.cart.length) {
    box.innerHTML = '<p style="color:var(--color-muted);">Belum ada buku di keranjang.</p>';
    return;
  }

  box.innerHTML = loanForm.cart.map((item, idx) => `
    <div class="card" style="padding:10px 12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
      <div>
        <strong>${escapeHtml(item.Judul)}</strong>
        <span class="status-pill" style="margin-left:8px;"><span class="dot"></span>${item.Sumber === 'Manual' ? 'Manual' : 'Katalog'}</span>
        <br><span style="color:var(--color-muted); font-size:0.9rem;">${escapeHtml(item.Pengarang || '-')}${item.Pembaca ? ' &middot; Pembaca: ' + escapeHtml(item.Pembaca) : ''}</span>
      </div>
      <button type="button" class="btn btn-danger" data-idx="${idx}" aria-label="Hapus ${escapeHtml(item.Judul)} dari keranjang">Hapus</button>
    </div>`).join('');

  box.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.idx)));
  });
}

/* ---------- Simpan Peminjaman ---------- */

async function onSaveLoan() {
  const errorBox = document.getElementById('loan-form-error');
  errorBox.classList.add('hidden');

  const tanggal = document.getElementById('l-tanggal').value;
  const jenis = document.getElementById('l-jenis').value;

  if (!loanForm.selectedMember) {
    errorBox.textContent = 'Pilih anggota terlebih dahulu.';
    errorBox.classList.remove('hidden');
    return;
  }
  if (!loanForm.cart.length) {
    errorBox.textContent = 'Tambahkan minimal satu buku ke keranjang.';
    errorBox.classList.remove('hidden');
    return;
  }

  const items = loanForm.cart.map(item => Object.assign({ Jenis: jenis }, item));

  const btn = document.getElementById('btn-save-loan');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const res = await API.post('createLoan', {
    data: {
      Tanggal: tanggal,
      IDAnggota: loanForm.selectedMember.id,
      NamaAnggota: loanForm.selectedMember.nama,
      Jenis: jenis,
      Items: items
    }
  });

  btn.disabled = false;
  btn.textContent = 'Simpan Peminjaman';

  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menyimpan peminjaman.';
    errorBox.classList.remove('hidden');
    return;
  }

  loanForm.cart = [];
  loanForm.selectedMember = null;
  renderCart();
  renderSelectedMember();
  document.getElementById('l-tanggal').valueAsDate = new Date();
  loadLoans();
  await AppModal.alert('Peminjaman ' + res.id + ' berhasil disimpan.', 'Berhasil');
}

/* ---------- Riwayat Peminjaman ---------- */

async function onLoanHistorySearch(e) {
  loanHistory.q = e.target.value;
  loanHistory.page = 1;
  loadLoans();
}

async function loadLoans() {
  const res = await API.get('loans', {
    q: loanHistory.q, status: loanHistory.status, page: loanHistory.page, pageSize: loanHistory.pageSize,
    sortField: loanHistory.sortField, sortDir: loanHistory.sortDir
  });
  const tbody = document.getElementById('loans-tbody');
  const emptyState = document.getElementById('loans-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat riwayat peminjaman.';
    emptyState.classList.remove('hidden');
    document.getElementById('loans-pagination').innerHTML = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;
  loanHistory.sortField = res.data.sortField || loanHistory.sortField;
  loanHistory.sortDir = res.data.sortDir || loanHistory.sortDir;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada transaksi peminjaman.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(loanRowTemplate).join('');
    tbody.querySelectorAll('[data-action="detail"]').forEach(btn =>
      btn.addEventListener('click', () => openLoanDetail(btn.dataset.id)));
    tbody.querySelectorAll('select[data-action="status"]').forEach(sel =>
      sel.addEventListener('change', () => onChangeLoanStatus(sel.dataset.id, sel.value)));
  }
  document.getElementById('loans-count').textContent = total + ' transaksi ditemukan';

  TableControls.updateSortIndicators(document.getElementById('loans-thead'), loanHistory);
  TableControls.renderPagination(document.getElementById('loans-pagination'), { page: loanHistory.page, pageSize: loanHistory.pageSize, total: total }, {
    onPageChange: (page) => { loanHistory.page = page; loadLoans(); },
    onPageSizeChange: (pageSize) => { loanHistory.pageSize = pageSize; loanHistory.page = 1; loadLoans(); }
  });
}

const LOAN_STATUSES = ['Draft', 'Menunggu', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan'];

function loanRowTemplate(l) {
  const statusClass = (l.Status === 'Selesai') ? 'status-selesai' : (l.Status === 'Dibatalkan' ? 'status-antrian' : 'status-antrian');
  return `
    <tr>
      <td data-label="Nomor">${escapeHtml(l['ID Peminjaman'])}</td>
      <td data-label="Tanggal">${escapeHtml(formatDate(l.Tanggal))}</td>
      <td data-label="Anggota">${escapeHtml(l['Nama Anggota'] || '-')}</td>
      <td data-label="Total Buku">${escapeHtml(l['Total Buku'])}</td>
      <td data-label="Status">
        <span class="status-pill ${statusClass}" style="margin-right:6px;"><span class="dot"></span>${escapeHtml(l.Status)}</span>
        <select data-action="status" data-id="${l['ID Peminjaman']}" aria-label="Ubah status peminjaman ${escapeHtml(l['ID Peminjaman'])}" style="width:auto; display:inline-block; padding:4px 6px;">
          ${LOAN_STATUSES.map(s => `<option value="${s}" ${s === l.Status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td data-label="Aksi">
        <button type="button" class="btn btn-outline" data-action="detail" data-id="${l['ID Peminjaman']}">Detail</button>
      </td>
    </tr>`;
}

async function onChangeLoanStatus(id, status) {
  const res = await API.post('updateLoanStatus', { id: id, status: status });
  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal mengubah status.');
  }
  loadLoans();
}

async function openLoanDetail(id) {
  const res = await API.get('loanDetail', { id: id });
  if (!res || !res.success || !res.data) return;
  const { loan, items } = res.data;

  const itemsHtml = items.map(it => `
    <tr>
      <td>${escapeHtml(it.Judul)}</td>
      <td>${escapeHtml(it.Jenis || '-')}</td>
      <td>${escapeHtml(it.Pengarang || '-')}</td>
      <td>${escapeHtml(it.Pembaca || '-')}</td>
      <td>${escapeHtml(it.Sumber || '-')}</td>
    </tr>`).join('');

  document.getElementById('loan-detail-body').innerHTML = `
    <dl class="detail-list">
      <dt>Nomor Peminjaman</dt><dd>${escapeHtml(loan['ID Peminjaman'])}</dd>
      <dt>Tanggal</dt><dd>${escapeHtml(formatDate(loan.Tanggal))}</dd>
      <dt>Anggota</dt><dd>${escapeHtml(loan['Nama Anggota'] || '-')}</dd>
      <dt>Status</dt><dd>${escapeHtml(loan.Status)}</dd>
      <dt>Dibuat oleh</dt><dd>${escapeHtml(loan.User || '-')}</dd>
    </dl>
    <h3 style="margin-top:16px;">Daftar Buku</h3>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Judul</th><th>Jenis</th><th>Pengarang</th><th>Pembaca</th><th>Sumber</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>`;
  document.getElementById('loan-detail-modal').classList.remove('hidden');
}

function closeLoanDetail() {
  document.getElementById('loan-detail-modal').classList.add('hidden');
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

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
