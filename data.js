/*
 * Data storage module for SSO CRM Ultimate.
 *
 * Centralises access to browser localStorage for various entities
 * required by the CRM: tariffs, margins, users, quotes,
 * leads, tasks, agreements and dashboard preferences. Provides
 * sensible defaults and helpers for JSON serialisation.
 */

const DataStore = (() => {
  // Default price list: basic exams and costs.  This is only used as a
  // fallback when no tariff has been loaded yet and no external
  // SSOTariff array has been defined.  When the file tariff.js is
  // included in the page it exposes a global window.SSOTariff array
  // containing the full list of medical exams and their costs.  The
  // DataStore.getTariff() method will detect that array and seed
  // localStorage on first access.
  const defaultTariff = [
    { name: "Laboratorio Básico", cost: 30 },
    { name: "Ecografía", cost: 50 },
    { name: "Mamografía", cost: 60 },
    { name: "Valoración Ocupacional", cost: 80 },
    { name: "Audiometría", cost: 40 }
  ];

  // Default users with roles and passwords.  These credentials are
  // intended only for demonstration purposes and should be changed
  // when deploying the application.  Admin users can create and
  // remove additional accounts from the Admin panel.
  const defaultUsers = [
    { name: 'admin', role: 'admin', password: 'admin123' },
    { name: 'vendedor', role: 'seller', password: '123' },
    { name: 'control', role: 'control', password: 'control123' }
  ];

  // Default empty logs array.  Each log entry should be an object
  // containing at least a date, user, action and quoteId.  Logs are
  // consumed by the logs page for the control role.
  const defaultLogs = [];

  // Default margins: these can be edited from the admin screen
  const defaultMargins = [18, 21, 25, 30];

  // Default service agreement template
  const defaultAgreementTemplate =
    "Convenio de servicios de Salud Ocupacional\n\n" +
    "Entre __EMPRESA__ y SSO Metrored se acuerda la prestación de servicios de chequeos ocupacionales.\n" +
    "La empresa __EMPRESA__ representada por __REPRESENTANTE__ se compromete a cumplir con las disposiciones legales vigentes.\n" +
    "Se proporcionarán los exámenes aprobados y los resultados serán entregados de acuerdo con la normativa.\n" +
    "Este convenio se firma en Sangolquí, Ecuador, a la fecha de la cotización.";

  // Generic getter with fallback
  function _get(key, fallback) {
    const str = localStorage.getItem(key);
    try {
      return str ? JSON.parse(str) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  // Generic setter
  function _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  return {
    // Tariff: list of exams with costs
    getTariff() {
      // Attempt to retrieve the tariff from storage.  If none exists
      // and a global SSOTariff array has been defined (via
      // project/tariff.js) then seed localStorage with that array.
      const saved = _get('ssocrmTariff', null);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        return saved;
      }
      if (typeof window !== 'undefined' && Array.isArray(window.SSOTariff)) {
        _set('ssocrmTariff', window.SSOTariff);
        return window.SSOTariff;
      }
      return defaultTariff;
    },
    setTariff(tariff) {
      _set('ssocrmTariff', tariff);
    },
    // Margins: array of numbers representing margin percentages
    getMargins() {
      return _get('ssocrmMargins', defaultMargins);
    },
    setMargins(margins) {
      _set('ssocrmMargins', margins);
    },
    // Users: list of user objects {name, role}
    getUsers() {
      return _get('ssocrmUsers', defaultUsers);
    },
    setUsers(users) {
      _set('ssocrmUsers', users);
    },

    /**
     * Authenticate a user by name and password.  Returns the user
     * object (without the password) if the credentials match, or
     * null otherwise.
     * @param {string} name
     * @param {string} password
     */
    authenticateUser(name, password) {
      const users = _get('ssocrmUsers', defaultUsers);
      const user = users.find(u => u.name === name && u.password === password);
      if (user) {
        // Return a copy without the password field
        const { password: _pwd, ...rest } = user;
        return rest;
      }
      return null;
    },
    // Quotes: list of quote objects
    getQuotes() {
      return _get('ssocrmQuotes', []);
    },
    setQuotes(quotes) {
      _set('ssocrmQuotes', quotes);
    },
    // Leads: list of lead objects
    getLeads() {
      return _get('ssocrmLeads', []);
    },
    setLeads(leads) {
      _set('ssocrmLeads', leads);
    },
    // Tasks: list of task objects
    getTasks() {
      return _get('ssocrmTasks', []);
    },
    setTasks(tasks) {
      _set('ssocrmTasks', tasks);
    },
    // Current user: stored as {name, role}
    getCurrentUser() {
      return _get('ssocrmCurrentUser', null);
    },
    setCurrentUser(user) {
      _set('ssocrmCurrentUser', user);
    },
    clearCurrentUser() {
      localStorage.removeItem('ssocrmCurrentUser');
    },

    // Logs: list of log entries for auditing quotes
    getLogs() {
      return _get('ssocrmLogs', defaultLogs);
    },
    /**
     * Add a log entry.  The entry should include at least
     * date, user, action and quoteId properties.  Additional
     * fields (company, margin, total, status) may also be
     * provided.
     * @param {Object} entry
     */
    addLog(entry) {
      const logs = _get('ssocrmLogs', defaultLogs);
      logs.push(entry);
      _set('ssocrmLogs', logs);
    },
    // Agreement template: a string with placeholders
    getAgreementTemplate() {
      return localStorage.getItem('ssocrmAgreementTemplate') || defaultAgreementTemplate;
    },
    setAgreementTemplate(template) {
      localStorage.setItem('ssocrmAgreementTemplate', template);
    },
    // Dashboard preferences: list of keys indicating which KPIs/charts to show
    getDashboardPrefs() {
      return _get('ssocrmDashboardPrefs', []);
    },
    setDashboardPrefs(prefs) {
      _set('ssocrmDashboardPrefs', prefs);
    }
  };
})();