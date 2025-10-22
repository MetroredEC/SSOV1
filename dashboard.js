/*
 * Dashboard logic for SSO CRM Ultimate.
 *
 * Computes key performance indicators (KPIs) and renders
 * bar charts on canvas elements. Applies user preferences to hide
 * unwanted KPIs or charts. Only users with roles seller,
 * admin or control may view this page.
 */

(function() {
  // Ensure user has access; dashboard can be viewed by all roles
  document.addEventListener('DOMContentLoaded', function() {
    // if no user, will redirect
    if (!checkRole(['seller', 'admin', 'control'])) return;
    init();
  });

  function updateKpis() {
    const quotes = DataStore.getQuotes();
    const leads = DataStore.getLeads();
    const tasks = DataStore.getTasks();
    // Totals
    const totalQuotes = quotes.length;
    const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
    const pendingQuotes = quotes.filter(q => q.status === 'pending').length;
    const rejectedQuotes = quotes.filter(q => q.status === 'rejected').length;
    // Revenue: sum of totals for approved quotes
    const revenue = quotes.reduce((sum, q) => {
      if (q.status === 'approved') {
        return sum + (q.total || 0);
      }
      return sum;
    }, 0);
    const leadsCount = leads.length;
    const tasksPending = tasks.filter(t => t.status !== 'done').length;
    // Update DOM
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setText('kpiTotalQuotes', totalQuotes);
    setText('kpiApprovedQuotes', approvedQuotes);
    setText('kpiPendingQuotes', pendingQuotes);
    setText('kpiRevenue', revenue.toFixed(2));
    setText('kpiLeads', leadsCount);
    setText('kpiTasks', tasksPending);
  }

  function groupBy(arr, field) {
    return arr.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
  }

  function groupSumBy(arr, field, sumField) {
    return arr.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      const val = item[sumField] || 0;
      if (!acc[key]) acc[key] = 0;
      acc[key] += val;
      return acc;
    }, {});
  }

  function drawBarChart(ctx, labels, values) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 20;
    const barSpace = width / labels.length;
    const barWidth = barSpace * 0.6;
    const maxVal = Math.max(...values, 1);
    // Clear
    ctx.clearRect(0, 0, width, height);
    // Draw bars
    values.forEach((val, i) => {
      const barHeight = (val / maxVal) * (height - 2 * padding);
      const x = i * barSpace + (barSpace - barWidth) / 2;
      const y = height - padding - barHeight;
      ctx.fillStyle = '#003366';
      ctx.fillRect(x, y, barWidth, barHeight);
      // Label below bar
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barWidth / 2, height - 5);
      // Value above bar
      ctx.font = '10px Arial';
      ctx.fillText(val, x + barWidth / 2, y - 5);
    });
  }

  function renderCharts() {
    const quotes = DataStore.getQuotes();
    const leads = DataStore.getLeads();
    const tasks = DataStore.getTasks();
    // Chart 1: Quotes by status
    const statusCounts = groupBy(quotes, 'status');
    const statuses = ['approved', 'pending', 'rejected'];
    const statusLabels = statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    const statusValues = statuses.map(s => statusCounts[s] || 0);
    const ctx1 = document.getElementById('chartQuotes').getContext('2d');
    drawBarChart(ctx1, statusLabels, statusValues);
    // Chart 2: Margins distribution
    const marginCounts = quotes.reduce((acc, q) => {
      const m = q.margin;
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {});
    const marginLabels = Object.keys(marginCounts);
    const marginValues = marginLabels.map(k => marginCounts[k]);
    const ctx2 = document.getElementById('chartMargins').getContext('2d');
    drawBarChart(ctx2, marginLabels, marginValues);
    // Chart 3: Leads by stage
    const stages = groupBy(leads, 'stage');
    const stageLabels = Object.keys(stages);
    const stageValues = stageLabels.map(k => stages[k]);
    const ctx3 = document.getElementById('chartLeads').getContext('2d');
    drawBarChart(ctx3, stageLabels, stageValues);
    // Chart 4: Tasks by status
    const taskStages = groupBy(tasks, 'status');
    const taskLabels = Object.keys(taskStages);
    const taskValues = taskLabels.map(k => taskStages[k]);
    const ctx4 = document.getElementById('chartTasks').getContext('2d');
    drawBarChart(ctx4, taskLabels, taskValues);
    // Chart 5: Revenue by margin
    const revenueByMargin = groupSumBy(quotes.filter(q => q.status === 'approved'), 'margin', 'total');
    const revLabels = Object.keys(revenueByMargin);
    const revValues = revLabels.map(k => revenueByMargin[k]);
    const ctx5 = document.getElementById('chartRevenue').getContext('2d');
    drawBarChart(ctx5, revLabels, revValues);
  }

  function init() {
    // Apply dashboard preferences: hide KPIs or charts not selected
    const prefs = DataStore.getDashboardPrefs();
    if (prefs && prefs.length > 0) {
      document.querySelectorAll('.kpi-card').forEach(card => {
        const key = card.dataset.key;
        if (prefs.indexOf(key) === -1) {
          card.style.display = 'none';
        }
      });
      document.querySelectorAll('.chart-box').forEach(box => {
        const key = box.dataset.key;
        if (prefs.indexOf(key) === -1) {
          box.style.display = 'none';
        }
      });
    }
    updateKpis();
    renderCharts();
  }
})();