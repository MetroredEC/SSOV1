/*
 * Enhanced quoting logic for SSO CRM Ultimate.
 *
 * This script provides a fully featured quoting workflow that allows the
 * user to search the tariff by exam name, add exams to a selected list
 * with quantities, calculate the quote total with a selectable margin,
 * and persist quotes to localStorage via DataStore.  It also records
 * quote creation and status changes in the logs for the control role.
 * Only users with the seller or admin roles may access this page.
 */

(function() {
  // Internal state: full list of exams, filtered indexes for search,
  // and selected exams with quantities.
  let allExams = [];
  let filteredIndices = [];
  // selectedExams maps an exam index to an object with quantity
  const selectedExams = {};

  /**
   * Render the tariff table based on the current filteredIndices and
   * excluding any exams that have already been selected.
   */
  function renderTariff() {
    const tbody = document.getElementById('tariff-body');
    tbody.innerHTML = '';
    filteredIndices.forEach(idx => {
      // Skip exams already selected
      if (selectedExams[idx]) return;
      const exam = allExams[idx];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exam.name}</td>
        <td>${exam.cost.toFixed(2)}</td>
        <td><button class="btn-action" data-idx="${idx}">Añadir</button></td>
      `;
      tbody.appendChild(tr);
    });
    // Bind add buttons
    tbody.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        addExam(idx);
      });
    });
  }

  /**
   * Render the table of selected exams.  Each row shows the exam
   * name, cost, an input for quantity, the subtotal and a remove
   * button.
   */
  function renderSelected() {
    const tbody = document.getElementById('selected-body');
    tbody.innerHTML = '';
    Object.keys(selectedExams).forEach(key => {
      const idx = parseInt(key);
      const exam = allExams[idx];
      const quantity = selectedExams[idx].quantity;
      const subtotal = exam.cost * quantity;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exam.name}</td>
        <td>${exam.cost.toFixed(2)}</td>
        <td><input type="number" min="1" value="${quantity}" data-idx="${idx}" style="width:70px;"></td>
        <td>${subtotal.toFixed(2)}</td>
        <td><button class="btn-action" data-idx="${idx}">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });
    // Bind quantity change events
    tbody.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('change', function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        let val = parseInt(this.value);
        if (isNaN(val) || val <= 0) {
          val = 1;
          this.value = 1;
        }
        selectedExams[idx].quantity = val;
        renderSelected();
        updateQuoteSummary();
      });
    });
    // Bind remove buttons
    tbody.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        removeExam(idx);
      });
    });
    updateQuoteSummary();
  }

  /**
   * Compute and update the quote summary text.  Displays the number
   * of exam lines, the total quantity of exams, base cost, margin and
   * total.
   */
  function updateQuoteSummary() {
    const summaryEl = document.getElementById('quote-summary');
    const marginEl = document.getElementById('margin-select');
    if (!marginEl) return;
    const margin = parseFloat(marginEl.value);
    let totalQuantity = 0;
    let base = 0;
    Object.keys(selectedExams).forEach(key => {
      const idx = parseInt(key);
      const quantity = selectedExams[idx].quantity;
      totalQuantity += quantity;
      base += allExams[idx].cost * quantity;
    });
    if (Object.keys(selectedExams).length === 0) {
      summaryEl.textContent = 'Seleccione al menos un examen para cotizar.';
      return;
    }
    const total = base * (1 + (isNaN(margin) ? 0 : margin / 100));
    const lines = [];
    lines.push(`Exámenes distintos: ${Object.keys(selectedExams).length}`);
    lines.push(`Cantidad total de pruebas: ${totalQuantity}`);
    lines.push(`Costo base: $${base.toFixed(2)}`);
    if (!isNaN(margin)) {
      lines.push(`Margen aplicado: ${margin}%`);
    }
    lines.push(`Total: $${total.toFixed(2)}`);
    summaryEl.textContent = lines.join('\n');
  }

  /**
   * Filter the list of exams based on the current search term and
   * refresh the tariff table.  The search term is case-insensitive
   * and matches anywhere in the exam name.
   */
  function applySearch() {
    const term = document.getElementById('exam-search').value.trim().toLowerCase();
    filteredIndices = [];
    allExams.forEach((exam, idx) => {
      if (!term || exam.name.toLowerCase().includes(term)) {
        filteredIndices.push(idx);
      }
    });
    renderTariff();
  }

  /**
   * Add an exam to the selected list with default quantity of 1.
   * @param {number} idx
   */
  function addExam(idx) {
    if (!selectedExams[idx]) {
      selectedExams[idx] = { quantity: 1 };
    }
    renderSelected();
    renderTariff();
  }

  /**
   * Remove an exam from the selected list.
   * @param {number} idx
   */
  function removeExam(idx) {
    delete selectedExams[idx];
    renderSelected();
    renderTariff();
  }

  /**
   * Render the list of margin options from DataStore.  When the
   * selection changes the summary is recalculated.
   */
  function renderMargins() {
    const select = document.getElementById('margin-select');
    const margins = DataStore.getMargins();
    select.innerHTML = '';
    margins.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${m}%`;
      select.appendChild(opt);
    });
    select.addEventListener('change', updateQuoteSummary);
  }

  /**
   * Render the list of existing quotes.  Displays the quote ID,
   * company name, date, total, margin and status.  Allows the user
   * to approve or reject pending quotes.
   */
  function renderQuotesList() {
    const tbody = document.getElementById('quotes-body');
    const quotes = DataStore.getQuotes();
    tbody.innerHTML = '';
    quotes.forEach(q => {
      const tr = document.createElement('tr');
      const statusText = q.status.charAt(0).toUpperCase() + q.status.slice(1);
      tr.innerHTML = `
        <td>${q.id}</td>
        <td>${q.company}</td>
        <td>${q.date}</td>
        <td>${q.total.toFixed(2)}</td>
        <td>${q.margin}</td>
        <td><span class="badge ${q.status}">${statusText}</span></td>
        <td>
          ${q.status === 'pending' ? `<button class="btn-action" onclick="changeQuoteStatus(${q.id}, 'approved')">Aprobar</button> <button class="btn-action" onclick="changeQuoteStatus(${q.id}, 'rejected')">Rechazar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Change the status of a quote and persist the change.  A log
   * entry is recorded to capture the action.
   * @param {number} id
   * @param {string} newStatus
   */
  window.changeQuoteStatus = function(id, newStatus) {
    const quotes = DataStore.getQuotes();
    const quote = quotes.find(q => q.id === id);
    if (!quote) {
      UI.showError('No se encontró la cotización seleccionada.');
      return;
    }
    quote.status = newStatus;
    DataStore.setQuotes(quotes);
    // Log the status change
    const user = DataStore.getCurrentUser();
    DataStore.addLog({
      date: new Date().toISOString(),
      user: user ? user.name : 'unknown',
      action: `status:${newStatus}`,
      quoteId: id,
      company: quote.company,
      margin: quote.margin,
      total: quote.total
    });
    renderQuotesList();
    const statusText = newStatus === 'approved' ? 'aprobada' : newStatus === 'rejected' ? 'rechazada' : newStatus;
    UI.showSuccess(`Cotización ${statusText}.`);
  };

  /**
   * Save the current quote.  Validates that at least one exam has
   * been selected and that client fields are filled in.  The quote
   * object includes the exam list with quantities, margin, base
   * price, total price and client details.  A log entry is
   * recorded for the creation event.  Resets the selection and
   * form afterwards.
   */
  window.saveQuote = function() {
    if (Object.keys(selectedExams).length === 0) {
      UI.showWarning('Seleccione al menos un examen para cotizar');
      return;
    }
    const company = document.getElementById('clientName').value.trim();
    const address = document.getElementById('clientAddress').value.trim();
    const ruc = document.getElementById('clientRuc').value.trim();
    const rep = document.getElementById('clientRep').value.trim();
    if (!company || !address || !ruc || !rep) {
      UI.showError('Ingrese todos los datos del cliente');
      return;
    }
    const margin = parseFloat(document.getElementById('margin-select').value);
    let base = 0;
    const examsList = [];
    Object.keys(selectedExams).forEach(key => {
      const idx = parseInt(key);
      const quantity = selectedExams[idx].quantity;
      base += allExams[idx].cost * quantity;
      examsList.push({ name: allExams[idx].name, quantity: quantity });
    });
    const total = base * (1 + (isNaN(margin) ? 0 : margin / 100));
    const quotes = DataStore.getQuotes();
    const quoteId = Date.now();
    const dateStr = formatDate(new Date());
    quotes.push({
      id: quoteId,
      date: dateStr,
      exams: examsList,
      margin: margin,
      basePrice: base,
      total: total,
      company: company,
      address: address,
      ruc: ruc,
      rep: rep,
      status: 'pending'
    });
    DataStore.setQuotes(quotes);
    // Log creation
    const user = DataStore.getCurrentUser();
    DataStore.addLog({
      date: new Date().toISOString(),
      user: user ? user.name : 'unknown',
      action: 'create',
      quoteId: quoteId,
      company: company,
      margin: margin,
      total: total
    });
    UI.showSuccess('Cotización guardada');
    // Reset selections and form
    for (const k in selectedExams) {
      if (selectedExams.hasOwnProperty(k)) {
        delete selectedExams[k];
      }
    }
    document.getElementById('client-form').reset();
    renderSelected();
    renderTariff();
    renderQuotesList();
  };

  /**
   * Add a custom exam to the tariff.  Reads the name and cost from
   * the input fields and appends a new entry to the DataStore tariff.
   * Then refreshes the tariff table and clears the input fields.
   */
  window.addNewExam = function() {
    const nameInput = document.getElementById('newExamName');
    const costInput = document.getElementById('newExamCost');
    const name = nameInput.value.trim();
    const cost = parseFloat(costInput.value);
    if (!name || isNaN(cost) || cost < 0) {
      UI.showError('Ingrese un nombre y un costo válido');
      return;
    }
    const tariff = DataStore.getTariff();
    tariff.push({ name: name, cost: cost });
    DataStore.setTariff(tariff);
    // Update our internal list and refresh
    allExams = tariff;
    // If search filter is active we might need to reapply
    applySearch();
    nameInput.value = '';
    costInput.value = '';
    UI.showSuccess('Examen agregado al tarifario');
  };

  /**
   * Handle dynamic searching of exams.  This is bound to the
   * exam-search input.
   */
  function bindSearch() {
    const searchInput = document.getElementById('exam-search');
    searchInput.addEventListener('input', function() {
      applySearch();
    });
  }

  /**
   * Initialize quoting page: enforce access control, load exams,
   * render margins, setup search and existing quotes.
   */
  function init() {
    if (!checkRole(['seller', 'admin'])) return;
    // Load tariff list
    allExams = DataStore.getTariff();
    // Initially no search filter
    filteredIndices = allExams.map((_, idx) => idx);
    renderMargins();
    bindSearch();
    renderTariff();
    renderSelected();
    renderQuotesList();
  }

  document.addEventListener('DOMContentLoaded', init);
})();