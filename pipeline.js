/*
 * Pipeline board logic for SSO CRM Ultimate.
 *
 * Displays leads grouped by stage in separate columns. Allows
 * changing the stage of each lead directly from the board. Only
 * users with roles seller or admin may access this page.
 */

(function() {
  const stages = ['new', 'contact', 'negotiation', 'won', 'lost'];

  function renderBoard() {
    const board = document.getElementById('pipeline-board');
    board.innerHTML = '';
    const leads = DataStore.getLeads();
    // Group leads by stage
    const grouped = stages.reduce((acc, st) => { acc[st] = []; return acc; }, {});
    leads.forEach(lead => {
      const st = lead.stage || 'new';
      if (!grouped[st]) grouped[st] = [];
      grouped[st].push(lead);
    });
    // Create columns
    stages.forEach(stage => {
      const col = document.createElement('div');
      col.className = 'pipeline-column';
      const title = document.createElement('h4');
      title.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);
      col.appendChild(title);
      const leadsList = grouped[stage];
      leadsList.forEach(lead => {
        const card = document.createElement('div');
        card.className = 'lead-card';
        card.innerHTML = `
          <p><strong>${lead.name}</strong></p>
          <p>${lead.company || ''}</p>
        `;
        // Stage selector
        const select = document.createElement('select');
        stages.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          if (lead.stage === s) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener('change', function() {
          changeLeadStage(lead.id || leads.indexOf(lead), this.value);
        });
        card.appendChild(select);
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', function() {
          deleteLeadById(lead.id || leads.indexOf(lead));
        });
        card.appendChild(delBtn);
        col.appendChild(card);
      });
      board.appendChild(col);
    });
  }

  function changeLeadStage(id, newStage) {
    const leads = DataStore.getLeads();
    const lead = leads.find(l => (l.id || leads.indexOf(l)) === id);
    if (lead) {
      lead.stage = newStage;
      DataStore.setLeads(leads);
      renderBoard();
    }
  }

  function deleteLeadById(id) {
    if (!confirm('¿Está seguro de eliminar este lead?')) return;
    let leads = DataStore.getLeads();
    const lead = leads.find(l => (l.id || leads.indexOf(l)) === id);
    if (!lead) return;
    leads = leads.filter(l => (l.id || leads.indexOf(l)) !== id);
    DataStore.setLeads(leads);
    // Remove associated tasks
    let tasks = DataStore.getTasks();
    tasks = tasks.filter(t => t.leadId !== id);
    DataStore.setTasks(tasks);
    renderBoard();
  }

  function init() {
    if (!checkRole(['seller', 'admin'])) return;
    renderBoard();
  }

  document.addEventListener('DOMContentLoaded', init);
})();