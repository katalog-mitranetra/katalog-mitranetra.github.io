const orderState = { status: 'Menunggu', q: '' };

document.addEventListener('DOMContentLoaded', () => {
  loadOperatorSetting();
  loadOrders();

  document.getElementById('btn-save-operator').addEventListener('click', onSaveOperatorNumber);
  document.getElementById('order-search').addEventListener('input', debounce(onOrderSearch, 300));
  document.getElementById('order-status-filter').addEventListener('change', (e) => {
    orderState.status = e.target.value;
    loadOrders();
  });
  document.getElementById('btn-close-order-detail').addEventListener('click', closeOrderDetail);
});

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Pengaturan nomor operator ---------- */

async function loadOperatorSetting() {
  const res = await API.get('setting', { key: 'NOMOR_OPERATOR' });
  if (res && res.success) {
    document.getElementById('operator-phone').value = res.data || '';
  }
}

async function onSaveOperatorNumber() {
  const value = document.getElementById('operator-phone').value.trim();
  const res = await API.post('setSetting', { key: 'NOMOR_OPERATOR', value: value });
  const msg = document.getElementById('operator-save-msg');
  if (res && res.success) {
    msg.textContent = 'Tersimpan.';
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 2000);
  } else {
    alert((res && res.message) || 'Gagal menyimpan nomor operator.');
  }
}

/* ---------- Daftar Pesanan ---------- */

async function onOrderSearch(e) {
  orderState.q = e.target.value;
  loadOrders();
}

async function loadOrders() {
  const res = await API.get('loans', { status: orderState.status, q: orderState.q, page: 1, pageSize: 50 });
  const grid = document.getElementById('orders-grid');
  const emptyState = document.getElementById('orders-empty');

  if (!res || !res.success) {
    grid.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat pesanan.';
    emptyState.classList.remove('hidden');
    return;
  }

  const items = res.data.items;
  if (!items.length) {
    grid.innerHTML = '';
    emptyState.textContent = 'Tidak ada pesanan pada status ini.';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = items.map(orderCardTemplate).join('');

  grid.querySelectorAll('[data-action="detail"]').forEach(btn =>
    btn.addEventListener('click', () => openOrderDetail(btn.dataset.id)));
  grid.querySelectorAll('[data-action="kirim-wa"]').forEach(btn =>
    btn.addEventListener('click', () => onKirimWA(btn.dataset.id)));
}

function orderCardTemplate(l) {
  const statusClass = l.Status === 'Selesai' ? 'status-selesai' : 'status-antrian';
  return `
    <div class="card order-card">
      <div class="order-card-number">${escapeHtml(l['ID Peminjaman'])}</div>
      <div class="order-card-member">${escapeHtml(l['Nama Anggota'] || '-')}</div>
      <div class="order-card-date">${escapeHtml(formatDate(l.Tanggal))}</div>
      <div class="order-card-meta">${escapeHtml(l['Total Buku'])} buku</div>
      <div class="order-card-status">
        <span class="status-pill ${statusClass}"><span class="dot"></span>${escapeHtml(l.Status)}</span>
      </div>
      <div class="order-card-actions">
        <button type="button" class="btn btn-outline" data-action="detail" data-id="${l['ID Peminjaman']}">Detail</button>
        <button type="button" class="btn btn-primary" data-action="kirim-wa" data-id="${l['ID Peminjaman']}">Kirim WA</button>
      </div>
    </div>`;
}

async function openOrderDetail(id) {
  const res = await API.get('loanDetail', { id: id });
  if (!res || !res.success || !res.data) return;
  const { loan, items } = res.data;

  const itemsHtml = items.map(it => `
    <tr>
      <td>${escapeHtml(it.Judul)}</td>
      <td>${escapeHtml(it.Jenis || '-')}</td>
      <td>${escapeHtml(it.Pengarang || '-')}</td>
      <td>${escapeHtml(it.Pembaca || '-')}</td>
    </tr>`).join('');

  document.getElementById('order-detail-body').innerHTML = `
    <dl class="detail-list">
      <dt>Nomor Pesanan</dt><dd>${escapeHtml(loan['ID Peminjaman'])}</dd>
      <dt>Tanggal</dt><dd>${escapeHtml(formatDate(loan.Tanggal))}</dd>
      <dt>Anggota</dt><dd>${escapeHtml(loan['Nama Anggota'] || '-')}</dd>
      <dt>No. HP</dt><dd>${escapeHtml(loan.Telepon || '-')}</dd>
      <dt>Status</dt><dd>${escapeHtml(loan.Status)}</dd>
    </dl>
    <h3 style="margin-top:16px;">Daftar Buku</h3>
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr><th>Judul</th><th>Jenis</th><th>Pengarang</th><th>Pembaca</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
    </div>`;
  document.getElementById('order-detail-modal').classList.remove('hidden');
}

function closeOrderDetail() {
  document.getElementById('order-detail-modal').classList.add('hidden');
}

/* ---------- Kirim ke Operator via WhatsApp ---------- */

async function onKirimWA(id) {
  const operatorPhoneRaw = document.getElementById('operator-phone').value.trim();
  if (!operatorPhoneRaw) {
    alert('Nomor WhatsApp operator belum diisi. Isi dan simpan dulu di bagian atas halaman.');
    return;
  }

  const res = await API.get('loanDetail', { id: id });
  if (!res || !res.success || !res.data) {
    alert('Gagal mengambil detail pesanan.');
    return;
  }
  const { loan, items } = res.data;

  const message = buildWhatsAppMessage(loan, items);
  const operatorPhone = normalizePhoneForWhatsApp(operatorPhoneRaw);
  const url = 'https://wa.me/' + operatorPhone + '?text=' + encodeURIComponent(message);
  window.open(url, '_blank');

  if (loan.Status === 'Menunggu') {
    await API.post('updateLoanStatus', { id: id, status: 'Dikirim' });
    loadOrders();
  }
}

function buildWhatsAppMessage(loan, items) {
  let msg = 'PESANAN PEMINJAMAN DTB\n';
  msg += 'Yayasan Mitra Netra\n\n';
  msg += 'No. Pesanan:\n' + loan['ID Peminjaman'] + '\n\n';
  msg += 'Tanggal:\n' + formatDateLong(loan.Tanggal) + '\n\n';
  msg += 'Anggota:\n' + (loan['Nama Anggota'] || '-') + '\n\n';
  msg += 'No. HP:\n' + (loan.Telepon || '-') + '\n\n';
  msg += 'DAFTAR BUKU:\n\n';

  items.forEach((it, idx) => {
    msg += (idx + 1) + '. ' + it.Judul + '\n';
    msg += '   Penulis: ' + (it.Pengarang || '-') + '\n';
    msg += '   Pembaca: ' + (it.Pembaca || '-') + '\n';
    if (it['Alamat File']) {
      msg += '   Alamat File:\n   ' + it['Alamat File'] + '\n';
    }
    msg += '\n';
  });

  msg += 'Jenis:\n' + (items[0] ? (items[0].Jenis || '-') : '-') + '\n\n';
  msg += 'Mohon diproses.';
  return msg;
}

/* ---------- Util ---------- */

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

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
  return p ? (p.dd + '/' + p.mm + '/' + p.yyyy) : '-';
}

function formatDateLong(value) {
  const p = extractDateParts(value);
  if (!p) return '-';
  return p.dd + ' ' + MONTHS_ID[Number(p.mm) - 1] + ' ' + p.yyyy;
}

function normalizePhoneForWhatsApp(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.charAt(0) === '0') {
    digits = '62' + digits.slice(1);
  } else if (digits.slice(0, 2) !== '62') {
    digits = '62' + digits;
  }
  return digits;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
