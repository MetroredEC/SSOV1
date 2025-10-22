/*
 * Worksheet logic for SSO CRM Ultimate.
 *
 * Allows the user to assign approved exams from a quote to a list of
 * employees. The assignments are stored inside the quote object
 * under the 'worksheet' property. Only quotes with status
 * 'approved' are available for selection. Only users with roles
 * seller or admin may access this page.
 */

(function() {
  let currentQuoteId = null;
  // List of exam names for the current quote
  let currentExams = [];
  // Map of exam name to quantity allowed (Infinity for legacy quotes)
  let currentExamQuantities = {};

  function loadQuotes() {
    const select = document.getElementById('quote-select');
    const quotes = DataStore.getQuotes().filter(q => q.status === 'approved');
    select.innerHTML = '';
    if (quotes.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No hay cotizaciones aprobadas';
      select.appendChild(opt);
      select.disabled = true;
    } else {
      select.disabled = false;
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '--Seleccione--';
      select.appendChild(defaultOpt);
      quotes.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = `${q.id} – ${q.company}`;
        select.appendChild(opt);
      });
    }
    select.addEventListener('change', onQuoteChange);
  }

  function onQuoteChange() {
    const select = document.getElementById('quote-select');
    const id = select.value;
    const container = document.getElementById('worksheet-container');
    if (!id) {
      container.style.display = 'none';
      currentQuoteId = null;
      currentExams = [];
      currentExamQuantities = {};
      return;
    }
    currentQuoteId = parseInt(id);
    const quotes = DataStore.getQuotes();
    const quote = quotes.find(q => q.id === currentQuoteId);
    if (!quote) return;
    // Normalize exams: if stored as strings use Infinity limit,
    // otherwise extract name and quantity.
    currentExams = [];
    currentExamQuantities = {};
    quote.exams.forEach(ex => {
      if (typeof ex === 'string') {
        currentExams.push(ex);
        currentExamQuantities[ex] = Infinity;
      } else {
        currentExams.push(ex.name);
        currentExamQuantities[ex.name] = ex.quantity;
      }
    });
    container.style.display = '';
    buildWorksheetHeader();
    loadWorksheetRows(quote.worksheet || []);
  }

  function buildWorksheetHeader() {
    const thead = document.getElementById('worksheet-head');
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Nombre</th><th>Cédula</th><th>Sexo</th><th>Fecha de nacimiento</th><th>Teléfono</th>';
    currentExams.forEach(exam => {
      const th = document.createElement('th');
      const limit = currentExamQuantities[exam];
      if (limit && limit !== Infinity) {
        th.textContent = `${exam} (max ${limit})`;
      } else {
        th.textContent = exam;
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  }

  function loadWorksheetRows(rows) {
    const tbody = document.getElementById('worksheet-body');
    tbody.innerHTML = '';
    if (rows.length === 0) {
      addEmployeeRow();
    } else {
      rows.forEach(emp => {
        const tr = createEmployeeRow();
        // Fill values
        tr.querySelector('input[name="empName"]').value = emp.name;
        tr.querySelector('input[name="empId"]').value = emp.id;
        tr.querySelector('select[name="empSex"]').value = emp.sex;
        tr.querySelector('input[name="empDob"]').value = emp.dob;
        tr.querySelector('input[name="empPhone"]').value = emp.phone;
        // exams
        emp.exams.forEach(exName => {
          const idx = currentExams.indexOf(exName);
          if (idx >= 0) {
            const checkbox = tr.querySelectorAll('input[type="checkbox"]')[idx];
            checkbox.checked = true;
          }
        });
        tbody.appendChild(tr);
      });
    }
  }

  window.addEmployeeRow = function() {
    const tbody = document.getElementById('worksheet-body');
    const tr = createEmployeeRow();
    tbody.appendChild(tr);
  };

  function createEmployeeRow() {
    const tr = document.createElement('tr');
    let html = '';
    html += '<td><input type="text" name="empName" placeholder="Nombre"></td>';
    html += '<td><input type="text" name="empId" placeholder="Cédula"></td>';
    html += '<td><select name="empSex"><option value="M">M</option><option value="F">F</option></select></td>';
    html += '<td><input type="date" name="empDob"></td>';
    html += '<td><input type="text" name="empPhone" placeholder="Teléfono"></td>';
    currentExams.forEach(() => {
      html += '<td><input type="checkbox"></td>';
    });
    tr.innerHTML = html;
    return tr;
  }

  window.saveWorksheet = function() {
    if (!currentQuoteId) {
      UI.showWarning('Seleccione una cotización');
      return;
    }
    const tbody = document.getElementById('worksheet-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const employees = [];
    let valid = true;
    // Track how many times each exam has been assigned
    const examCounts = {};
    rows.forEach(row => {
      const empName = row.querySelector('input[name="empName"]').value.trim();
      const empId = row.querySelector('input[name="empId"]').value.trim();
      const empSex = row.querySelector('select[name="empSex"]').value;
      const empDob = row.querySelector('input[name="empDob"]').value;
      const empPhone = row.querySelector('input[name="empPhone"]').value.trim();
      if (!empName || !empId) {
        valid = false;
        return;
      }
      const checkboxes = row.querySelectorAll('input[type="checkbox"]');
      const selectedExams = [];
      checkboxes.forEach((cb, idx) => {
        if (cb.checked) {
          const examName = currentExams[idx];
          selectedExams.push(examName);
          examCounts[examName] = (examCounts[examName] || 0) + 1;
        }
      });
      employees.push({
        name: empName,
        id: empId,
        sex: empSex,
        dob: empDob,
        phone: empPhone,
        exams: selectedExams
      });
    });
    if (!valid) {
      UI.showError('Debe ingresar al menos nombre y cédula para cada colaborador');
      return;
    }
    // Validate assignment limits
    for (const examName in examCounts) {
      if (Object.prototype.hasOwnProperty.call(examCounts, examName)) {
        const count = examCounts[examName];
        const max = currentExamQuantities[examName] || Infinity;
        if (max !== Infinity && count > max) {
          UI.showError(`El número de asignaciones para el examen "${examName}" (${count}) supera la cantidad cotizada (${max}). Ajuste la hoja de trabajo.`);
          return;
        }
      }
    }
    // Save to quote
    const quotes = DataStore.getQuotes();
    const quote = quotes.find(q => q.id === currentQuoteId);
    if (quote) {
      quote.worksheet = employees;
      DataStore.setQuotes(quotes);
      UI.showSuccess('Hoja de trabajo guardada');
    }
  };

  function init() {
    if (!checkRole(['seller', 'admin'])) return;
    loadQuotes();
  }

  document.addEventListener('DOMContentLoaded', init);
})();