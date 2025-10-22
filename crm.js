/*
 * CRM logic for SSO CRM Ultimate.
 *
 * Supports lead and task management: adding leads,
 * updating their stages, deleting leads, adding tasks associated
 * with leads, marking tasks complete and removing tasks. All
 * data is persisted using the DataStore module. Only users
 * with roles seller or admin may access this page.
 */

(function() {
  function renderLeads() {
    const tbody = document.getElementById('leads-body');
    const leads = DataStore.getLeads();
    tbody.innerHTML = '';
    leads.forEach((lead, idx) => {
      const tr = document.createElement('tr');
      // Build stage select
      let stageSelect = '<select data-index="' + idx + '" class="lead-stage-select">';
      ['new','contact','negotiation','won','lost'].forEach(stage => {
        stageSelect += `<option value="${stage}" ${lead.stage === stage ? 'selected' : ''}>${stage}</option>`;
      });
      stageSelect += '</select>';
      tr.innerHTML = `
        <td>${lead.name}</td>
        <td>${lead.company || ''}</td>
        <td>${lead.email || ''}</td>
        <td>${lead.phone || ''}</td>
        <td>${stageSelect}</td>
        <td><button class="btn-action" onclick="deleteLead(${idx})">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });
    // Attach change handler to stage selects
    document.querySelectorAll('.lead-stage-select').forEach(sel => {
      sel.addEventListener('change', function() {
        const index = parseInt(this.getAttribute('data-index'));
        const leads = DataStore.getLeads();
        leads[index].stage = this.value;
        DataStore.setLeads(leads);
        renderLeads();
        renderTasks();
        renderLeadOptions();
      });
    });
  }
  function renderLeadOptions() {
    const select = document.getElementById('taskLead');
    if (!select) return;
    const leads = DataStore.getLeads();
    select.innerHTML = '';
    leads.forEach((lead, idx) => {
      const opt = document.createElement('option');
      opt.value = lead.id || idx;
      opt.textContent = lead.name;
      select.appendChild(opt);
    });
  }
  // Add a new lead
  window.addLead = function() {
    const name = document.getElementById('leadName').value.trim();
    const company = document.getElementById('leadCompany').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const phone = document.getElementById('leadPhone').value.trim();
    const stage = document.getElementById('leadStage').value;
    if (!name) {
      UI.showError('Ingrese un nombre para el lead');
      return;
    }
    const leads = DataStore.getLeads();
    const id = Date.now();
    leads.push({ id: id, name: name, company: company, email: email, phone: phone, stage: stage });
    DataStore.setLeads(leads);
    document.getElementById('lead-form').reset();
    renderLeads();
    renderLeadOptions();
    UI.showSuccess('Lead agregado');
  };
  // Delete a lead by index
  window.deleteLead = function(idx) {
    const leads = DataStore.getLeads();
    const lead = leads[idx];
    if (!UI.confirm('¿Está seguro de eliminar este lead?')) return;
    leads.splice(idx, 1);
    DataStore.setLeads(leads);
    // Remove tasks associated with this lead
    let tasks = DataStore.getTasks();
    tasks = tasks.filter(t => t.leadId !== (lead.id || idx));
    DataStore.setTasks(tasks);
    renderLeads();
    renderLeadOptions();
    renderTasks();
    UI.showSuccess('Lead eliminado');
  };
  // Render tasks list
  function renderTasks() {
    const tbody = document.getElementById('tasks-body');
    const tasks = DataStore.getTasks();
    const leads = DataStore.getLeads();
    tbody.innerHTML = '';
    tasks.forEach((task, idx) => {
      const lead = leads.find(l => (l.id || leads.indexOf(l)) === task.leadId);
      const leadName = lead ? lead.name : '—';
      const statusLabel = task.status === 'done' ? '<span class="badge done">Hecho</span>' : '<span class="badge open">Abierto</span>';
      const actionButtons = task.status === 'open'
        ? `<button class="btn-action" onclick="markTaskDone(${idx})">Marcar como hecho</button>`
        : '';
      const deleteBtn = `<button class="btn-action" onclick="deleteTask(${idx})">Eliminar</button>`;
      const due = task.dueDate || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${task.desc}</td>
        <td>${leadName}</td>
        <td>${due}</td>
        <td>${statusLabel}</td>
        <td>${actionButtons} ${deleteBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  // Add new task
  window.addTask = function() {
    const desc = document.getElementById('taskDesc').value.trim();
    const leadSelect = document.getElementById('taskLead');
    const leadId = leadSelect.value;
    const due = document.getElementById('taskDue').value;
    if (!desc || !leadId) {
      UI.showError('Ingrese descripción y seleccione un lead');
      return;
    }
    const tasks = DataStore.getTasks();
    tasks.push({ id: Date.now(), desc: desc, leadId: leadId, dueDate: due, status: 'open' });
    DataStore.setTasks(tasks);
    document.getElementById('task-form').reset();
    renderTasks();
    UI.showSuccess('Tarea agregada');
  };
  // Mark task done
  window.markTaskDone = function(idx) {
    const tasks = DataStore.getTasks();
    if (tasks[idx]) {
      tasks[idx].status = 'done';
      DataStore.setTasks(tasks);
      renderTasks();
      UI.showSuccess('Tarea completada');
    }
  };
  // Delete task
  window.deleteTask = function(idx) {
    if (!UI.confirm('¿Eliminar esta tarea?')) return;
    const tasks = DataStore.getTasks();
    tasks.splice(idx, 1);
    DataStore.setTasks(tasks);
    renderTasks();
    UI.showSuccess('Tarea eliminada');
  };

  function init() {
    // Only sellers or admins may access CRM
    if (!checkRole(['seller', 'admin'])) return;
    renderLeads();
    renderLeadOptions();
    renderTasks();
  }
  document.addEventListener('DOMContentLoaded', init);
})();