/*
 * Agreement generation logic for SSO CRM Ultimate.
 *
 * Allows the user to select an approved quote and generate a
 * service agreement using a template with placeholders. The
 * agreement can be copied to clipboard or downloaded as a text
 * file. Only users with roles seller or admin may access this
 * page.
 */

(function() {
  let currentQuote = null;

  function loadApprovedQuotes() {
    const select = document.getElementById('agreement-quote-select');
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
    select.addEventListener('change', onQuoteSelect);
  }

  function onQuoteSelect() {
    const select = document.getElementById('agreement-quote-select');
    const id = select.value;
    const section = document.getElementById('agreement-section');
    if (!id) {
      section.style.display = 'none';
      currentQuote = null;
      return;
    }
    const quotes = DataStore.getQuotes();
    const quote = quotes.find(q => q.id == id);
    if (!quote) return;
    currentQuote = quote;
    const template = DataStore.getAgreementTemplate();
    // Replace placeholders
    let text = template;
    text = text.replace(/__EMPRESA__/g, quote.company);
    text = text.replace(/__REPRESENTANTE__/g, quote.rep);
    text = text.replace(/__RUC__/g, quote.ruc);
    text = text.replace(/__FECHA__/g, quote.date);
    // Additional optional replacements
    // Insert list of approved exams.  If exams are stored as objects
    // with quantity, include the quantity in parentheses.
    const examsList = quote.exams.map(ex => {
      if (typeof ex === 'string') {
        return ex;
      } else {
        return `${ex.name} (${ex.quantity})`;
      }
    }).join(', ');
    text = text.replace(/__EXÁMENES__/g, examsList);
    // Show output
    document.getElementById('agreement-output').value = text;
    section.style.display = '';
    // Save agreement into quote (for record)
    quote.agreement = text;
    DataStore.setQuotes(quotes);
  }

  function copyToClipboard() {
    const textarea = document.getElementById('agreement-output');
    const text = textarea.value;
    if (!text) {
      UI.showWarning('No hay información para copiar');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        UI.showSuccess('Convenio copiado al portapapeles');
      }).catch(() => {
        fallbackCopy(textarea);
      });
    } else {
      fallbackCopy(textarea);
    }
  }

  function fallbackCopy(textarea) {
    textarea.select();
    const ok = document.execCommand('copy');
    if (ok) {
      UI.showSuccess('Convenio copiado al portapapeles');
    } else {
      UI.showError('No se pudo copiar el convenio');
    }
  }

  function downloadAgreement() {
    if (!currentQuote) return;
    const text = document.getElementById('agreement-output').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `convenio_${currentQuote.company}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.showSuccess('Archivo descargado');
  }

  function init() {
    if (!checkRole(['seller', 'admin'])) return;
    loadApprovedQuotes();
    document.getElementById('copyAgreementBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadAgreementBtn').addEventListener('click', downloadAgreement);
  }

  document.addEventListener('DOMContentLoaded', init);
})();