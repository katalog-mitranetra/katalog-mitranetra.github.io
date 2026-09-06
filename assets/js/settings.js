document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  if (!user || user.role !== 'admin') {
    document.getElementById('settings-content').innerHTML =
      '<div class="card"><p>Halaman ini khusus admin.</p></div>';
    return;
  }

  loadOperatorSetting();
  loadMasterJenis();

  document.getElementById('btn-save-operator').addEventListener('click', onSaveOperatorNumber);
  document.getElementById('jenis-form').addEventListener('submit', onAddJenis);
  document.getElementById('btn-run-backup').addEventListener('click', onRunBackupNow);
});

/* ---------- Nomor WhatsApp Operator ---------- */

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
    await AppModal.alert((res && res.message) || 'Gagal menyimpan nomor operator.');
  }
}

/* ---------- Master Jenis ---------- */

async function loadMasterJenis() {
  const res = await API.get('masterJenisAll');
  const tbody = document.getElementById('jenis-tbody');
  if (!res || !res.success) {
    tbody.innerHTML = '<tr><td colspan="2">Gagal memuat data.</td></tr>';
    return;
  }
  const items = res.data.items;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="2">Belum ada jenis koleksi.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(jenisRowTemplate).join('');
  tbody.querySelectorAll('select[data-action="jenis-status"]').forEach(sel =>
    sel.addEventListener('change', () => onChangeJenisStatus(sel.dataset.id, sel.value)));
}

function jenisRowTemplate(j) {
  const statusClass = j.Status === 'Aktif' ? 'status-selesai' : 'status-antrian';
  return `
    <tr>
      <td data-label="Nama Jenis">${escapeHtml(j['Nama Jenis'])}</td>
      <td data-label="Status">
        <span class="status-pill ${statusClass}" style="margin-right:6px;"><span class="dot"></span>${escapeHtml(j.Status)}</span>
        <select data-action="jenis-status" data-id="${j.ID}" aria-label="Ubah status jenis ${escapeHtml(j['Nama Jenis'])}" style="width:auto; display:inline-block; padding:4px 6px;">
          <option value="Aktif" ${j.Status === 'Aktif' ? 'selected' : ''}>Aktif</option>
          <option value="Tidak Aktif" ${j.Status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
        </select>
      </td>
    </tr>`;
}

async function onChangeJenisStatus(id, status) {
  const res = await API.post('updateMasterJenisStatus', { id: id, status: status });
  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal mengubah status.');
  }
  loadMasterJenis();
}

async function onAddJenis(e) {
  e.preventDefault();
  const form = e.target;
  const nama = form.elements.namedItem('NamaJenis').value.trim();
  const errorBox = document.getElementById('jenis-form-error');
  errorBox.classList.add('hidden');
  if (!nama) return;

  const res = await API.post('addMasterJenis', { data: { 'Nama Jenis': nama } });
  if (!res || !res.success) {
    errorBox.textContent = (res && res.errors && res.errors.join(' ')) || (res && res.message) || 'Gagal menambah jenis.';
    errorBox.classList.remove('hidden');
    return;
  }
  form.reset();
  loadMasterJenis();
}

/* ---------- Backup ---------- */

async function onRunBackupNow() {
  const btn = document.getElementById('btn-run-backup');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const res = await API.post('runBackupNow', {});

  btn.disabled = false;
  btn.textContent = 'Backup Sekarang';

  if (!res || !res.success) {
    await AppModal.alert((res && res.message) || 'Gagal membuat backup. Pastikan izin akses Google Drive sudah disetujui di Apps Script.');
    return;
  }
  await AppModal.alert('Backup berhasil dibuat: ' + res.fileName, 'Backup Selesai');
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
