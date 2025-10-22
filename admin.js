/*
 * Administration logic for SSO CRM Ultimate.
 *
 * Provides interfaces to manage tariffs (price lists), margin
 * options, user accounts, service agreement templates and
 * dashboard display preferences. Data is persisted to
 * localStorage via DataStore. Only users with role admin may
 * access this page.
 */

(function() {
  // Tariff management
  function renderAdminTariff() {
    const tariff = DataStore.getTariff();
    const tbody = document.getElementById('admin-tariff-body');
    tbody.innerHTML = '';
    tariff.forEach((exam, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exam.name}</td>
        <td><input type="number" class="cost-input" value="${exam.cost}" min="0" step="0.01" data-index="${index}"></td>
        <td><button class="btn-action" onclick="removeExam(${index})">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });
    // Cost input change event
    tbody.querySelectorAll('.cost-input').forEach(input => {
      input.addEventListener('change', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        const newCost = parseFloat(this.value);
        if (!isNaN(newCost) && newCost >= 0) {
          const tariff = DataStore.getTariff();
          tariff[idx].cost = newCost;
          DataStore.setTariff(tariff);
        }
      });
    });
  }
  // Add new exam from admin
  window.adminAddExam = function() {
    const name = document.getElementById('adminNewExamName').value.trim();
    const cost = parseFloat(document.getElementById('adminNewExamCost').value);
    if (!name || isNaN(cost) || cost < 0) {
      UI.showError('Ingrese un nombre y costo válidos');
      return;
    }
    const tariff = DataStore.getTariff();
    tariff.push({ name: name, cost: cost });
    DataStore.setTariff(tariff);
    document.getElementById('adminNewExamName').value = '';
    document.getElementById('adminNewExamCost').value = '';
    renderAdminTariff();
    UI.showSuccess('Examen agregado');
  };
  // Remove exam by index
  window.removeExam = function(idx) {
    const tariff = DataStore.getTariff();
    tariff.splice(idx, 1);
    DataStore.setTariff(tariff);
    renderAdminTariff();
    UI.showSuccess('Examen eliminado');
  };
  // Import tariff from CSV
  document.addEventListener('DOMContentLoaded', () => {
    const upload = document.getElementById('tariffUpload');
    if (upload) {
      upload.addEventListener('change', function(evt) {
        const file = evt.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
          const lines = e.target.result.split(/\r?\n/);
          const newTariff = [];
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
              const name = parts[0].trim();
              const cost = parseFloat(parts[1]);
              if (name && !isNaN(cost)) {
                newTariff.push({ name: name, cost: cost });
              }
            }
          });
          if (newTariff.length > 0) {
            DataStore.setTariff(newTariff);
            renderAdminTariff();
            UI.showSuccess('Tarifa importada correctamente');
          } else {
            UI.showError('No se pudo importar la tarifa (formato inválido)');
          }
        };
        reader.readAsText(file);
      });
    }
  });
  // Export tariff to CSV
  window.exportTariff = function() {
    const tariff = DataStore.getTariff();
    const rows = tariff.map(e => `${e.name},${e.cost}`);
    rows.unshift('Examen,Costo');
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarifario_ssocrm.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // Margin management
  function renderMargins() {
    const container = document.getElementById('margins-container');
    const margins = DataStore.getMargins();
    container.innerHTML = '';
    margins.forEach((m, idx) => {
      const div = document.createElement('div');
      div.style.marginBottom = '5px';
      div.innerHTML = `<input type="number" value="${m}" min="0" step="0.01" data-index="${idx}" style="width:80px;"> <button class="btn-action" onclick="removeMargin(${idx})">Eliminar</button>`;
      container.appendChild(div);
    });
    // Change event for margin inputs
    container.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('change', function() {
        const idx = parseInt(this.getAttribute('data-index'));
        const newVal = parseFloat(this.value);
        if (!isNaN(newVal) && newVal > 0) {
          const margins = DataStore.getMargins();
          margins[idx] = newVal;
          DataStore.setMargins(margins);
        }
      });
    });
  }
  window.addMargin = function() {
    const val = parseFloat(document.getElementById('newMarginValue').value);
    if (isNaN(val) || val <= 0) {
      UI.showError('Ingrese un margen válido');
      return;
    }
    const margins = DataStore.getMargins();
    margins.push(val);
    DataStore.setMargins(margins);
    document.getElementById('newMarginValue').value = '';
    renderMargins();
    UI.showSuccess('Margen agregado');
  };
  window.removeMargin = function(idx) {
    const margins = DataStore.getMargins();
    margins.splice(idx, 1);
    DataStore.setMargins(margins);
    renderMargins();
    UI.showSuccess('Margen eliminado');
  };
  // User management
  function renderUsers() {
    const tbody = document.getElementById('users-body');
    const users = DataStore.getUsers();
    tbody.innerHTML = '';
    users.forEach((user, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.role}</td>
        <td><button class="btn-action" onclick="removeUser(${idx})">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
  window.addUser = function() {
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;
    const password = document.getElementById('newUserPassword').value;
    if (!name || !password) {
      UI.showError('Ingrese un nombre de usuario y una contraseña');
      return;
    }
    const users = DataStore.getUsers();
    users.push({ name: name, role: role, password: password });
    DataStore.setUsers(users);
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserPassword').value = '';
    renderUsers();
    UI.showSuccess('Usuario agregado');
  };
  window.removeUser = function(idx) {
    const users = DataStore.getUsers();
    users.splice(idx, 1);
    DataStore.setUsers(users);
    renderUsers();
    UI.showSuccess('Usuario eliminado');
  };
  // Agreement template management
  function loadAgreementTemplate() {
    const textarea = document.getElementById('agreementTemplate');
    textarea.value = DataStore.getAgreementTemplate();
  }
  window.saveAgreementTemplate = function() {
    const text = document.getElementById('agreementTemplate').value;
    DataStore.setAgreementTemplate(text);
    UI.showSuccess('Plantilla guardada');
  };
  // Dashboard preferences management
  const dashboardItems = [
    { key: 'totalQuotes', label: 'Cotizaciones Totales' },
    { key: 'approvedQuotes', label: 'Cotizaciones Aprobadas' },
    { key: 'pendingQuotes', label: 'Cotizaciones Pendientes' },
    { key: 'revenue', label: 'Ingresos Totales' },
    { key: 'leads', label: 'Leads Totales' },
    { key: 'tasks', label: 'Tareas Pendientes' },
    { key: 'quotesByStatus', label: 'Gráfica: Estados de cotizaciones' },
    { key: 'marginDistribution', label: 'Gráfica: Distribución de márgenes' },
    { key: 'leadsByStage', label: 'Gráfica: Etapas de leads' },
    { key: 'tasksByStatus', label: 'Gráfica: Estados de tareas' },
    { key: 'revenueByMargin', label: 'Gráfica: Ingresos por margen' }
  ];
  function renderDashboardPrefs() {
    const container = document.getElementById('dashboardPrefs');
    const prefs = DataStore.getDashboardPrefs();
    container.innerHTML = '';
    dashboardItems.forEach(item => {
      const id = 'pref_' + item.key;
      const checked = prefs.length === 0 || prefs.includes(item.key);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<label><input type="checkbox" id="${id}" value="${item.key}" ${checked ? 'checked' : ''}> ${item.label}</label>`;
      container.appendChild(wrapper);
    });
  }
  window.saveDashboardPrefs = function() {
    const selected = [];
    dashboardItems.forEach(item => {
      const checkbox = document.getElementById('pref_' + item.key);
      if (checkbox && checkbox.checked) {
        selected.push(item.key);
      }
    });
    DataStore.setDashboardPrefs(selected);
    UI.showSuccess('Preferencias guardadas');
  };
  // Remove margin function needs global scope for inline onclick
  window.removeMargin = window.removeMargin;
  // Remove user function global for inline onclick
  window.removeUser = window.removeUser;
  // Remove exam function global for inline onclick
  window.removeExam = window.removeExam;
  // Add margin function global for inline onclick
  window.addMargin = window.addMargin;
  // Add exam function global for inline onclick
  window.adminAddExam = window.adminAddExam;
  // Add user function global for inline onclick
  window.addUser = window.addUser;
  // Save agreement template global
  window.saveAgreementTemplate = window.saveAgreementTemplate;
  // Save dashboard prefs global
  window.saveDashboardPrefs = window.saveDashboardPrefs;
  // Load functions when DOM ready
  function initAdmin() {
    if (!checkRole(['admin'])) return;
    renderAdminTariff();
    renderMargins();
    renderUsers();
    loadAgreementTemplate();
    renderDashboardPrefs();
  }
  document.addEventListener('DOMContentLoaded', initAdmin);
})();