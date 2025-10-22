/*
 * Utility helpers for SSO CRM Ultimate.
 *
 * Provides UI helpers (toasts and confirmations), role validation,
 * navigation adjustments and formatting helpers used across the
 * application. Every page loads this module after data.js so the
 * helpers can access DataStore safely.
 */

const UI = (() => {
  const containerId = 'toast-container';

  function ensureContainer() {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, { type = 'info', duration = 4000 } = {}) {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    container.appendChild(toast);
    // Allow CSS transitions to kick in
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
    return toast;
  }

  function showSuccess(message, options = {}) {
    return showToast(message, { ...options, type: 'success' });
  }

  function showError(message, options = {}) {
    return showToast(message, { ...options, type: 'error' });
  }

  function showWarning(message, options = {}) {
    return showToast(message, { ...options, type: 'warning' });
  }

  function confirm(message) {
    return window.confirm(message);
  }

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    confirm
  };
})();
window.UI = UI;

// Determine whether current user has one of the allowed roles.
function checkRole(allowedRoles) {
  const current = DataStore.getCurrentUser();
  if (!current) {
    UI.showWarning('Debe iniciar sesión para continuar. Redireccionando…', { duration: 5000 });
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
    return false;
  }
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && allowedRoles.indexOf(current.role) === -1) {
    UI.showError('No tiene permisos para acceder a esta sección.');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
    return false;
  }
  return true;
}

// Format a date object as YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function highlightNavLink(link, currentPage) {
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href) return;
  const pageName = href.split('/').pop().replace('.html', '');
  if (pageName === currentPage) {
    link.classList.add('active');
  } else {
    link.classList.remove('active');
  }
}

// Adjust navigation links based on the current user's role. Links
// pointing to pages that are not permitted for the role are hidden.
function setupNav() {
  const current = DataStore.getCurrentUser();
  const links = document.querySelectorAll('nav a');
  const pageName = document.body ? document.body.dataset.page : '';
  links.forEach(a => {
    highlightNavLink(a, pageName);
    if (!current) {
      return;
    }
    const role = current.role;
    const href = a.getAttribute('href') || '';
    // Admin page only for admins
    if (href.endsWith('admin.html') && role !== 'admin') {
      a.style.display = 'none';
      return;
    }
    // Quoting, CRM, Pipeline, Agreements and Worksheet only for seller or admin
    if ((href.endsWith('quoting.html') || href.endsWith('crm.html') || href.endsWith('pipeline.html') || href.endsWith('agreements.html') || href.endsWith('worksheet.html')) && !['seller', 'admin'].includes(role)) {
      a.style.display = 'none';
      return;
    }
    // Logs page only for control or admin
    if (href.endsWith('logs.html') && !['control', 'admin'].includes(role)) {
      a.style.display = 'none';
      return;
    }
    a.style.display = '';
  });
}

function updateUserInfo() {
  const infoEl = document.querySelector('[data-user-info], #user-info');
  if (!infoEl) return;
  const current = DataStore.getCurrentUser();
  if (current) {
    infoEl.textContent = `${current.name} (${current.role})`;
  } else {
    infoEl.textContent = '';
  }
}

function attachLogoutHandlers() {
  const links = document.querySelectorAll('[data-logout]');
  links.forEach(link => {
    if (link.dataset.boundLogout) return;
    link.addEventListener('click', () => {
      DataStore.clearCurrentUser();
      UI.showSuccess('Sesión cerrada correctamente.');
    });
    link.dataset.boundLogout = 'true';
  });
}

// Automatically configure navigation and session UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  updateUserInfo();
  attachLogoutHandlers();
});
