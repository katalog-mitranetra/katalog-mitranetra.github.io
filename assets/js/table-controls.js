/**
 * Komponen bersama untuk tabel: pagination bar (dropdown ukuran halaman +
 * tombol Sebelumnya/Berikutnya) dan header kolom yang bisa diklik untuk
 * mengurutkan data (A-Z untuk teks, kronologis untuk kolom tanggal --
 * urutan sebenarnya dihitung di backend lewat sortObjects()).
 */
const TableControls = (() => {
  const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];

  function renderPagination(container, state, callbacks) {
    if (!container) return;
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    const currentPage = Math.min(Math.max(1, state.page), totalPages);

    container.innerHTML =
      '<div class="pagination-bar">' +
      '<div class="pagination-size">' +
      '<label for="' + container.id + '-size" class="sr-only">Baris per halaman</label>' +
      '<select id="' + container.id + '-size">' +
      PAGE_SIZE_OPTIONS.map(n =>
        '<option value="' + n + '"' + (n === state.pageSize ? ' selected' : '') + '>' + n + ' / halaman</option>'
      ).join('') +
      '</select>' +
      '</div>' +
      '<div class="pagination-nav">' +
      '<button type="button" class="btn btn-outline" data-nav="prev"' + (currentPage <= 1 ? ' disabled' : '') + '>&larr; Sebelumnya</button>' +
      '<span class="pagination-info">Halaman ' + currentPage + ' dari ' + totalPages + ' &middot; ' + state.total + ' data</span>' +
      '<button type="button" class="btn btn-outline" data-nav="next"' + (currentPage >= totalPages ? ' disabled' : '') + '>Berikutnya &rarr;</button>' +
      '</div>' +
      '</div>';

    const sizeSelect = document.getElementById(container.id + '-size');
    sizeSelect.addEventListener('change', (e) => callbacks.onPageSizeChange(Number(e.target.value)));

    const prevBtn = container.querySelector('[data-nav="prev"]');
    const nextBtn = container.querySelector('[data-nav="next"]');
    if (!prevBtn.disabled) prevBtn.addEventListener('click', () => callbacks.onPageChange(currentPage - 1));
    if (!nextBtn.disabled) nextBtn.addEventListener('click', () => callbacks.onPageChange(currentPage + 1));
  }

  /**
   * Pasang sekali saat halaman dimuat. th yang bisa diurutkan diberi
   * atribut data-sort-field="NamaKolom" (harus sama persis dengan nama
   * kolom di sheet). Opsional: data-sort-default-dir="desc" untuk kolom
   * yang wajar diurutkan menurun di klik pertama (mis. tanggal terbaru dulu).
   */
  function bindSortableHeaders(theadEl, getState, onSortChange) {
    if (!theadEl) return;
    theadEl.querySelectorAll('th[data-sort-field]').forEach(th => {
      th.classList.add('sortable-th');
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      const field = th.dataset.sortField;
      const label = th.dataset.sortLabel || th.textContent.trim();
      th.setAttribute('aria-label', 'Urutkan berdasarkan ' + label);

      function activate() {
        const state = getState();
        let dir = th.dataset.sortDefaultDir || 'asc';
        if (state.sortField === field) {
          dir = state.sortDir === 'asc' ? 'desc' : 'asc';
        }
        onSortChange(field, dir);
      }

      th.addEventListener('click', activate);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  /** Panggil setiap kali data selesai dimuat, supaya tanda panah ▲▼ ikut update. */
  function updateSortIndicators(theadEl, state) {
    if (!theadEl) return;
    theadEl.querySelectorAll('th[data-sort-field]').forEach(th => {
      th.querySelectorAll('.sort-indicator').forEach(el => el.remove());
      const field = th.dataset.sortField;
      if (state.sortField === field) {
        const span = document.createElement('span');
        span.className = 'sort-indicator';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = state.sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
        th.appendChild(span);
        th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
  }

  return { renderPagination, bindSortableHeaders, updateSortIndicators };
})();
