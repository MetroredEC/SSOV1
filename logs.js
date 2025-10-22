/*
 * Logs viewer for SSO CRM Ultimate.
 *
 * Displays a simple table with the history of quote actions.  Only
 * users with the control or admin roles may access this page.  The
 * logs are stored in localStorage via DataStore.addLog().  Each
 * entry should include a date (ISO string), user name, action,
 * quoteId, company, margin and total.  Additional fields are
 * ignored by the renderer.
 */

(function() {
  function renderLogs() {
    const tbody = document.getElementById('logs-body');
    const logs = DataStore.getLogs();
    // Sort logs by date descending
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    tbody.innerHTML = '';
    logs.forEach(log => {
      const tr = document.createElement('tr');
      const dateStr = new Date(log.date).toLocaleString();
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${log.user || ''}</td>
        <td>${log.action}</td>
        <td>${log.quoteId || ''}</td>
        <td>${log.company || ''}</td>
        <td>${log.margin != null ? log.margin : ''}</td>
        <td>${log.total != null ? (typeof log.total === 'number' ? log.total.toFixed(2) : log.total) : ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  function init() {
    if (!checkRole(['control', 'admin'])) return;
    renderLogs();
  }
  document.addEventListener('DOMContentLoaded', init);
})();