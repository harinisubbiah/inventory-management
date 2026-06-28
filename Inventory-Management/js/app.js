/* ==========================================================================
   app.js
   --------------------------------------------------------------------------
   Entry point / controller for dashboard.html. Wires the sidebar,
   top nav, stat cards, charts, inventory table, modals, and settings
   actions together. Reads/writes through Inventory + InventoryStorage,
   and reports outcomes through Notify — this file itself touches only
   the DOM, never localStorage directly.
   ========================================================================== */

(function () {
  'use strict';

  // Safety-net auth guard (primary guard runs inline in <head>)
  if (!InventoryStorage.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const STATUS_LABELS = {
    'in-stock': 'In Stock',
    'low-stock': 'Low Stock',
    'out-of-stock': 'Out of Stock',
  };
  const STATUS_COLORS = {
    'in-stock': '#2dd4bf',
    'low-stock': '#ff8a3d',
    'out-of-stock': '#fb7185',
  };
  const CHART_PALETTE = ['#ff8a3d', '#2dd4bf', '#60a5fa', '#f472b6', '#a78bfa', '#94a3b8'];

  const tableState = { query: '', status: 'all', sortKey: 'name', sortDir: 'asc' };
  let pendingDeleteId = null;

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function money(n) {
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Sidebar navigation (in-page sections; Analytics is its own file)
  // ---------------------------------------------------------------------
  function initSidebar() {
    const links = $$('.sidebar-link[data-section]');
    const pageTitle = $('#pageTitle');

    links.forEach(link => {
      link.addEventListener('click', () => {
        const section = link.dataset.section;
        links.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');

        $$('.dash-section').forEach(s => s.classList.remove('is-active'));
        $(`#section-${section}`).classList.add('is-active');

        pageTitle.textContent = link.dataset.label || link.textContent.trim();
        closeMobileSidebar();

        if (section === 'reports') renderActivityLog();
        if (section === 'inventory') renderTable();
        if (section === 'dashboard') renderCharts();
      });
    });

    $('#sidebarToggle')?.addEventListener('click', () => {
      document.querySelector('.dash-shell').classList.toggle('sidebar-open');
    });
    $('#sidebarScrim')?.addEventListener('click', closeMobileSidebar);

    // Deep-link support: dashboard.html#inventory opens straight to that section
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const target = document.querySelector(`.sidebar-link[data-section="${hash}"]`);
      if (target) target.click();
    }
  }

  function closeMobileSidebar() {
    document.querySelector('.dash-shell').classList.remove('sidebar-open');
  }

  // ---------------------------------------------------------------------
  // Theme toggle (shared pattern with the landing page)
  // ---------------------------------------------------------------------
  function initTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', InventoryStorage.getTheme());

    $$('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        InventoryStorage.setTheme(next);
        renderCharts(); // canvas text colors need a redraw on theme change
      });
    });
  }

  // ---------------------------------------------------------------------
  // Top nav: search, notifications, profile/logout
  // ---------------------------------------------------------------------
  function initTopbar() {
    const topSearch = $('#topSearchInput');
    topSearch?.addEventListener('input', () => {
      // Global search jumps to Inventory and filters it
      $('.sidebar-link[data-section="inventory"]').click();
      $('#inventorySearchInput').value = topSearch.value;
      tableState.query = topSearch.value;
      renderTable();
    });

    setupDropdown('#notifToggle', '#notifPanel');
    setupDropdown('#profileToggle', '#profilePanel');

    const authUser = InventoryStorage.getAuthUser();
    if (authUser?.email) {
      $('#profileEmail').textContent = authUser.email;
      $('#profileInitial').textContent = authUser.email.charAt(0).toUpperCase();
    }

    $('#logoutBtn').addEventListener('click', () => {
      InventoryStorage.logout();
      window.location.href = 'login.html';
    });
  }

  function setupDropdown(toggleSel, panelSel) {
    const toggle = $(toggleSel);
    const panel = $(panelSel);
    if (!toggle || !panel) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains('is-open');
      $$('.dropdown-panel').forEach(p => p.classList.remove('is-open'));
      panel.classList.toggle('is-open', !isOpen);
    });
  }

  document.addEventListener('click', () => {
    $$('.dropdown-panel').forEach(p => p.classList.remove('is-open'));
  });

  // ---------------------------------------------------------------------
  // Stat cards
  // ---------------------------------------------------------------------
  function renderStats() {
    const products = Inventory.getAll();
    const lowStock = Inventory.getLowStockItems();
    const recent = Inventory.getRecentlyUpdated();

    $('#statTotalProducts').textContent = products.length;
    $('#statTotalValue').textContent = money(Inventory.getTotalValue());
    $('#statLowStock').textContent = lowStock.length;
    $('#statRecentCount').textContent = recent.length;
    $('#statRecentSub').textContent = recent.length
      ? `Last: ${recent[0].name} · ${relativeTime(recent[0].updatedAt)}`
      : 'No updates in the last 24h';
  }

  // ---------------------------------------------------------------------
  // Charts
  // ---------------------------------------------------------------------
  function renderCharts() {
    const products = Inventory.getAll();

    // Inventory Distribution — top 5 by value + "Other"
    const byValue = [...products].sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
    const top = byValue.slice(0, 5);
    const rest = byValue.slice(5);
    const restValue = rest.reduce((s, p) => s + p.quantity * p.price, 0);
    const distSegments = top.map((p, i) => ({
      label: p.name, value: p.quantity * p.price, color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
    if (restValue > 0) distSegments.push({ label: 'Other', value: restValue, color: '#94a3b8' });
    Charts.donut('chartDistribution', distSegments, {
      centerLabel: 'Total value', centerValue: money(Inventory.getTotalValue()),
    });

    // Product Quantities — top 6 by quantity
    const byQty = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 6);
    Charts.bar('chartQuantities', byQty.map(p => ({ label: p.name, value: p.quantity, color: '#ff8a3d' })));

    // Stock Status — counts
    const counts = { 'in-stock': 0, 'low-stock': 0, 'out-of-stock': 0 };
    products.forEach(p => counts[Inventory.getStatus(p)]++);
    Charts.donut('chartStatus', [
      { label: 'In Stock', value: counts['in-stock'], color: STATUS_COLORS['in-stock'] },
      { label: 'Low Stock', value: counts['low-stock'], color: STATUS_COLORS['low-stock'] },
      { label: 'Out of Stock', value: counts['out-of-stock'], color: STATUS_COLORS['out-of-stock'] },
    ], { centerLabel: 'Products', centerValue: String(products.length) });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 150);
  });

  // ---------------------------------------------------------------------
  // Inventory table — search, filter, sort, actions
  // ---------------------------------------------------------------------
  function getVisibleProducts() {
    let items = tableState.query ? Inventory.search(tableState.query) : Inventory.getAll();

    if (tableState.status !== 'all') {
      items = items.filter(p => Inventory.getStatus(p) === tableState.status);
    }

    const { sortKey, sortDir } = tableState;
    items = [...items].sort((a, b) => {
      let av, bv;
      if (sortKey === 'value') { av = a.quantity * a.price; bv = b.quantity * b.price; }
      else { av = a[sortKey]; bv = b[sortKey]; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return items;
  }

  function renderTable() {
    const tbody = $('#inventoryTableBody');
    const items = getVisibleProducts();

    if (!items.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No products match your search or filter.</td></tr>`;
    } else {
      tbody.innerHTML = items.map(p => {
        const status = Inventory.getStatus(p);
        const total = p.quantity * p.price;
        return `
          <tr data-id="${p.id}">
            <td class="cell-name">${escapeHtml(p.name)}</td>
            <td>${p.quantity}</td>
            <td>${money(p.price)}</td>
            <td>${money(total)}</td>
            <td><span class="status-pill status-pill--${status}">${STATUS_LABELS[status]}</span></td>
            <td class="cell-actions">
              <button class="icon-btn" data-action="edit" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button class="icon-btn icon-btn--danger" data-action="delete" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>`;
      }).join('');
    }

    updateSortIndicators();
    $('#inventoryCount').textContent = `${items.length} of ${Inventory.getAll().length} products`;
  }

  function updateSortIndicators() {
    $$('th[data-sort]').forEach(th => {
      th.classList.toggle('is-sorted', th.dataset.sort === tableState.sortKey);
      th.dataset.dir = th.dataset.sort === tableState.sortKey ? tableState.sortDir : '';
    });
  }

  function initTable() {
    $('#inventorySearchInput').addEventListener('input', (e) => {
      tableState.query = e.target.value;
      renderTable();
    });

    $('#statusFilter').addEventListener('change', (e) => {
      tableState.status = e.target.value;
      renderTable();
    });

    $$('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (tableState.sortKey === key) {
          tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          tableState.sortKey = key;
          tableState.sortDir = 'asc';
        }
        renderTable();
      });
    });

    $('#inventoryTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-btn');
      if (!btn) return;
      const id = btn.closest('tr').dataset.id;
      if (btn.dataset.action === 'edit') openProductModal('edit', Inventory.getById(id));
      if (btn.dataset.action === 'delete') confirmDelete(id);
    });

    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#exportJsonBtn').addEventListener('click', exportJson);
  }

  function exportCsv() {
    const items = Inventory.getAll();
    const header = ['Name', 'Quantity', 'Price', 'Total Value', 'Status'];
    const rows = items.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.quantity,
      p.price.toFixed(2),
      (p.quantity * p.price).toFixed(2),
      STATUS_LABELS[Inventory.getStatus(p)],
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    downloadFile(csv, 'inventory.csv', 'text/csv');
    Notify.toast('Inventory exported as CSV.', 'success');
  }

  function exportJson() {
    const json = JSON.stringify(Inventory.getAll(), null, 2);
    downloadFile(json, 'inventory.json', 'application/json');
    Notify.toast('Inventory exported as JSON.', 'success');
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------------
  // Add / Edit product modal
  // ---------------------------------------------------------------------
  function openProductModal(mode, product = null) {
    const modal = $('#productModal');
    const form = $('#productForm');
    form.reset();
    $('#productId').value = product?.id || '';
    $('#productName').value = product?.name || '';
    $('#productName').disabled = mode === 'edit';
    $('#productQuantity').value = product?.quantity ?? '';
    $('#productPrice').value = product?.price ?? '';
    $('#productModalTitle').textContent = mode === 'edit' ? 'Edit product' : 'Add product';
    $('#productModalSubmit').textContent = mode === 'edit' ? 'Save changes' : 'Add product';
    modal.classList.add('is-open');
    setTimeout(() => $('#productName').focus(), 50);
  }

  function closeProductModal() {
    $('#productModal').classList.remove('is-open');
  }

  function initProductModal() {
    $$('[data-open-add-product]').forEach(btn => {
      btn.addEventListener('click', () => openProductModal('add'));
    });
    $('#productModalClose').addEventListener('click', closeProductModal);
    $('#productModalCancel').addEventListener('click', closeProductModal);
    $('#productModal').addEventListener('click', (e) => {
      if (e.target.id === 'productModal') closeProductModal();
    });

    $('#productForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#productId').value;
      const name = $('#productName').value;
      const quantity = $('#productQuantity').value;
      const price = $('#productPrice').value;

      const result = id
        ? Inventory.updateProduct(id, { quantity, price })
        : Inventory.addProduct(name, quantity, price);

      if (result.success) {
        Notify.toast(result.message, result.unchanged ? 'info' : 'success');
        closeProductModal();
        refreshAll();
      } else {
        Notify.toast(result.message, result.duplicate ? 'warning' : 'error');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Delete confirmation modal
  // ---------------------------------------------------------------------
  function confirmDelete(id) {
    const product = Inventory.getById(id);
    if (!product) return;
    pendingDeleteId = id;
    $('#confirmMessage').textContent = `Delete "${product.name}" from inventory? This can't be undone.`;
    $('#confirmModal').classList.add('is-open');
  }

  function initConfirmModal() {
    $('#confirmCancel').addEventListener('click', () => {
      pendingDeleteId = null;
      $('#confirmModal').classList.remove('is-open');
    });
    $('#confirmAccept').addEventListener('click', () => {
      if (pendingDeleteId) {
        const result = Inventory.removeProduct(pendingDeleteId);
        Notify.toast(result.message, result.success ? 'success' : 'error');
        refreshAll();
      }
      pendingDeleteId = null;
      $('#confirmModal').classList.remove('is-open');
    });
  }

  // ---------------------------------------------------------------------
  // Reports — activity log
  // ---------------------------------------------------------------------
  const ACTIVITY_LABELS = {
    add: 'Added', 'update-quantity': 'Quantity updated', 'update-price': 'Price updated',
    delete: 'Deleted', 'duplicate-blocked': 'Duplicate blocked',
  };

  function renderActivityLog() {
    const log = InventoryStorage.loadActivityLog();
    const list = $('#activityLogBody');
    if (!log.length) {
      list.innerHTML = `<tr class="empty-row"><td colspan="4">No activity recorded yet.</td></tr>`;
      return;
    }
    list.innerHTML = log.map(entry => `
      <tr>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
        <td><span class="activity-tag activity-tag--${entry.type}">${ACTIVITY_LABELS[entry.type] || entry.type}</span></td>
        <td>${escapeHtml(entry.productName || '—')}</td>
        <td class="cell-muted">${escapeHtml(entry.detail || '')}</td>
      </tr>
    `).join('');
  }

  function renderNotificationsDropdown() {
    const log = InventoryStorage.loadActivityLog().slice(0, 5);
    const panel = $('#notifList');
    const badge = $('#notifBadge');
    if (!log.length) {
      panel.innerHTML = `<li class="notif-empty">No recent activity.</li>`;
      badge.style.display = 'none';
      return;
    }
    badge.style.display = 'block';
    badge.textContent = log.length;
    panel.innerHTML = log.map(entry => `
      <li>
        <span class="notif-dot notif-dot--${entry.type}"></span>
        <div>
          <p>${ACTIVITY_LABELS[entry.type] || entry.type} — ${escapeHtml(entry.productName || '')}</p>
          <span>${relativeTime(entry.timestamp)}</span>
        </div>
      </li>
    `).join('');
  }

  function initReports() {
    $('#clearActivityLogBtn').addEventListener('click', () => {
      InventoryStorage.clearActivityLog();
      renderActivityLog();
      renderNotificationsDropdown();
      Notify.toast('Activity log cleared.', 'info');
    });
  }

  // ---------------------------------------------------------------------
  // Settings (a couple of functional actions; the rest is UI-only,
  // exactly as scoped — clearly labeled in the markup)
  // ---------------------------------------------------------------------
  function initSettings() {
    $('#resetDemoDataBtn').addEventListener('click', () => {
      InventoryStorage.resetInventoryToSeed();
      Inventory.reload();
      refreshAll();
      Notify.toast('Inventory reset to demo data.', 'success');
    });

    $('#clearAllDataBtn').addEventListener('click', () => {
      InventoryStorage.clearInventory();
      InventoryStorage.clearActivityLog();
      Inventory.reload();
      refreshAll();
      Notify.toast('All inventory data cleared.', 'warning');
    });
  }

  // ---------------------------------------------------------------------
  // Ripple effect (shared with the landing page)
  // ---------------------------------------------------------------------
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const circle = document.createElement('span');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
      circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
      circle.classList.add('ripple', 'is-active');
      btn.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  function refreshAll() {
    renderStats();
    renderCharts();
    renderTable();
    renderActivityLog();
    renderNotificationsDropdown();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebar();
    initTopbar();
    initTable();
    initProductModal();
    initConfirmModal();
    initReports();
    initSettings();
    initRipple();
    refreshAll();
  });
})();
