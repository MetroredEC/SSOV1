/*
 * Utility functions for SSO CRM Ultimate.
 *
 * Contains helpers for authorisation and navigation. Pages should
 * call checkRole() at the beginning of their scripts to
 * enforce access control based on the current user's role.
 */

// Determine whether current user has one of the allowed roles.
function checkRole(allowedRoles) {
  const current = DataStore.getCurrentUser();
  if (!current || allowedRoles.indexOf(current.role) === -1) {
    alert('Acceso no autorizado');
    window.location.href = 'index.html';
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

// Adjust navigation links based on the current user's role.  Links
// pointing to pages that are not permitted for the role are hidden.
function setupNav() {
  const current = DataStore.getCurrentUser();
  if (!current) return;
  const role = current.role;
  const links = document.querySelectorAll('nav a');
  links.forEach(a => {
    const href = a.getAttribute('href');
    // Admin page only for admins
    if (href && href.endsWith('admin.html') && role !== 'admin') {
      a.style.display = 'none';
    }
    // Quoting, CRM, Pipeline, Agreements and Worksheet only for seller or admin
    if (href && (href.endsWith('quoting.html') || href.endsWith('crm.html') || href.endsWith('pipeline.html') || href.endsWith('agreements.html') || href.endsWith('worksheet.html')) && !['seller', 'admin'].includes(role)) {
      a.style.display = 'none';
    }
    // Logs page only for control or admin
    if (href && href.endsWith('logs.html') && !['control', 'admin'].includes(role)) {
      a.style.display = 'none';
    }
  });
}

// Automatically run setupNav when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
});