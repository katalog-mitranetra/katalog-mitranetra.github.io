document.addEventListener('DOMContentLoaded', async () => {
  const res = await API.get('dashboard');
  if (!res || !res.success) {
    showError(res && res.message);
    return;
  }
  const d = res.data;
  setText('stat-total-judul', d.totalJudul);
  setText('stat-total-anggota', d.totalAnggota);
  setText('stat-peminjaman-bulan', d.peminjamanBulanIni);
  setText('stat-produksi-tahun', d.produksiTahunIni);
  setText('stat-total-jam-baca', d.totalJamBaca + ' jam');

  renderBarChart('chart-penulis', d.topPenulis, 'Top 10 Penulis');
  renderBarChart('chart-pembaca', d.topPembaca, 'Top 10 Pembaca DTB');
  renderBarChart('chart-jam-baca', d.topJamBaca, 'Top 10 Jam Baca per Pembaca');
});

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showError(message) {
  const el = document.getElementById('dashboard-error');
  if (el) {
    el.textContent = message || 'Gagal memuat data dashboard.';
    el.classList.remove('hidden');
  }
}

function renderBarChart(canvasId, items, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (!items || items.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.font = '14px sans-serif';
    ctx.fillText('Belum ada data.', 10, 20);
    return;
  }
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: items.map(i => i.label),
      datasets: [{ label: label, data: items.map(i => i.value), backgroundColor: '#1B5E20' }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}
