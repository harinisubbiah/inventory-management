/* ==========================================================================
   notifications.js
   --------------------------------------------------------------------------
   Toast notification system. Expects a <div id="toastContainer"> to
   exist in the page. Call Notify.toast(message, type) wherever an
   action needs to surface feedback — add/update/delete/duplicate, etc.
   ========================================================================== */

const Notify = (() => {

  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2 19h20L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
  };

  function toast(message, type = 'info', duration = 3600) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.warn('Notify: #toastContainer not found in DOM.');
      return;
    }

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Dismiss notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    `;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));

    const remove = () => {
      el.classList.remove('is-visible');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    };

    const timer = setTimeout(remove, duration);
    el.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  }

  return { toast };
})();
