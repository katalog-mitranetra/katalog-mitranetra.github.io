const logState = {
  page: 1,
  pageSize: 50,
  q: '',
  sortField: 'Waktu',
  sortDir: 'desc'
};

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  if (!user || user.role !== 'admin') {
    document.getElementById('log-content').innerHTML =
      '<div class="card"><p>Halaman ini khusus admin.</p></div>';
    return;
  }

  loadLogs();

  document.getElementById('log-search').addEventListener('input', debounce(onLogSearch, 300));

  TableControls.bindSortableHeaders(
    document.getElementById('log-thead'),
    () => logState,
    (field, dir) => {
      logState.sortField = field;
      logState.sortDir = dir;
      logState.page = 1;
      loadLogs();
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

async function onLogSearch(e) {
  logState.q = e.target.value;
  logState.page = 1;
  loadLogs();
}

async function loadLogs() {
  const res = await API.get('activityLogs', {
    q: logState.q, page: logState.page, pageSize: logState.pageSize,
    sortField: logState.sortField, sortDir: logState.sortDir
  });
  const tbody = document.getElementById('log-tbody');
  const emptyState = document.getElementById('log-empty');

  if (!res || !res.success) {
    tbody.innerHTML = '';
    emptyState.textContent = (res && res.message) || 'Gagal memuat log aktivitas.';
    emptyState.classList.remove('hidden');
    document.getElementById('log-pagination').innerHTML = '';
    return;
  }

  const items = res.data.items;
  const total = res.data.total;
  logState.sortField = res.data.sortField || logState.sortField;
  logState.sortDir = res.data.sortDir || logState.sortDir;

  if (!items.length) {
    tbody.innerHTML = '';
    emptyState.textContent = 'Belum ada aktivitas tercatat.';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tbody.innerHTML = items.map(logRowTemplate).join('');
  }
  document.getElementById('log-count').textContent = total + ' aktivitas tercatat';

  TableControls.updateSortIndicators(document.getElementById('log-thead'), logState);
  TableControls.renderPagination(document.getElementById('log-pagination'), { page: logState.page, pageSize: logState.pageSize, total: total }, {
    onPageChange: (page) => { logState.page = page; loadLogs(); },
    onPageSizeChange: (pageSize) => { logState.pageSize = pageSize; logState.page = 1; loadLogs(); }
  });
}

function logRowTemplate(l) {
  return `
    <tr>
      <td data-label="Waktu">${escapeHtml(l.Waktu)}</td>
      <td data-label="User">${escapeHtml(l.User)}</td>
      <td data-label="Aktivitas">${escapeHtml(l.Aktivitas)}</td>
      <td data-label="Data">${escapeHtml(l.Data || '-')}</td>
      <td data-label="Info">${escapeHtml(l.Info || '-')}</td>
    </tr>`;
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
