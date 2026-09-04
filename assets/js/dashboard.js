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

  initCombinedChart();
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

/* ---------- Grafik gabungan Peminjaman + Produksi per bulan ---------- */

let combinedChartInstance = null;

async function initCombinedChart() {
  const select = document.getElementById('stat-year-select');
  if (!select) return;

  const yearsRes = await API.get('availableYears');
  const currentYear = new Date().getFullYear();
  const years = (yearsRes && yearsRes.success && yearsRes.data.length) ? yearsRes.data : [currentYear];

  select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  select.value = years.indexOf(currentYear) !== -1 ? String(currentYear) : String(years[0]);

  select.addEventListener('change', () => loadCombinedChart(select.value));
  loadCombinedChart(select.value);
}

async function loadCombinedChart(year) {
  const res = await API.get('combinedStats', { year: year });
  if (!res || !res.success) return;
  const d = res.data;

  const canvas = document.getElementById('chart-combined');
  if (!canvas) return;
  if (combinedChartInstance) combinedChartInstance.destroy();

  combinedChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: d.months,
      datasets: [
        {
          label: 'Peminjaman',
          data: d.peminjaman,
          borderColor: '#1B5E20',
          backgroundColor: 'rgba(27, 94, 32, 0.15)',
          tension: 0.3
        },
        {
          label: 'Produksi',
          data: d.produksi,
          borderColor: '#8A6D00',
          backgroundColor: 'rgba(138, 109, 0, 0.15)',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}
