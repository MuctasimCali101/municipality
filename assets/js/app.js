/* ============================================================
   MUNICIPALITY — App Utilities Module
   Navigation, Toast, Loading, Translations, Helpers
   ============================================================ */

const APP = (() => {
  /* --- Translations (Somali / English) --- */
  const TRANSLATIONS = {
    so: {
      app_name: 'Nidaamka Diwaangelinta Dhulka',
      login: 'Gal',
      username: 'Magaca isticmaale',
      password: 'Furaha sirta ah',
      city_code: 'Koodhka Magaalada',
      sign_in: 'Gal',
      admin_login: 'Admin Galid',
      admin_password: 'Furaha Admin-ka',
      dashboard: 'Dashboard',
      new_reg: 'Diwaan Cusub',
      map: 'Khariidad',
      profile: 'Profile',
      logout: 'Ka bax',
      total_today: 'Diwaan Maanta',
      total_month: 'Diwaan Bishan',
      total_area: 'Bed Dhul (m²)',
      pending: 'Qabyo',
      male: 'Lab',
      female: 'Dhedig',
      recent_submissions: 'Diwaanadii danbe',
      view_all: 'Dhammaan',
      save_draft: 'Qabyo Kaydi',
      next: 'Xiga',
      back: 'Dib',
      submit: 'Gudbi',
      success: 'Guul',
      error: 'Khalad',
      loading: 'Sug...',
      no_data: 'Wax macluumaad ah lama helin',
      search: 'Raadi',
      filter: 'Shaandhee',
      export: 'Soo saar CSV',
      print: 'Daabac',
      edit: 'Tafatir',
      delete: 'Tirtir',
      confirm: 'Xaqiiji',
      cancel: 'Jooji',
      required: 'Loo baahan yahay',
      phone_invalid: 'Lambarka taleefanka waa qalad',
      area_calc: 'Bed: {area} m²',
      digitize: 'Dhulka ku sawir khariidadda',
      download_kml: 'Soo deji KML',
      gps_location: 'Goobta GPS',
      undo: 'Ka noqo',
      clear: 'Nadiifi',
      coords: 'Isuduwaha',
      owner_name: 'Magaca Milkiilaha',
      survey_date: 'Taariikhda Sahanka',
      sub_district: 'Degmada',
      section: 'Xaafada',
      all: 'Dhammaan',
      export_to_csv: 'Soo saar CSV',
      print_report: 'Daabac Warbixin',
      go_back: 'Noqo',
      kml_downloaded: 'KML waa la soo dejiyay',
      registration_success: 'Diwaangelinta waa la gudbiyay. ID: {id}',
      login_error: 'Galitaanka waa qalad. Fadlan hubi macluumaadka.',
      network_error: 'Khadka internetka ayaa xiran. Fadlan isku day mar kale.',
    },
    en: {
      app_name: 'Land Registration System',
      login: 'Login',
      username: 'Username',
      password: 'Password',
      city_code: 'City Code',
      sign_in: 'Sign In',
      admin_login: 'Admin Login',
      admin_password: 'Admin Password',
      dashboard: 'Dashboard',
      new_reg: 'New Registration',
      map: 'Map',
      profile: 'Profile',
      logout: 'Logout',
      total_today: 'Today\'s Records',
      total_month: 'This Month',
      total_area: 'Land Area (m²)',
      pending: 'Drafts',
      male: 'Male',
      female: 'Female',
      recent_submissions: 'Recent Submissions',
      view_all: 'View All',
      save_draft: 'Save Draft',
      next: 'Next',
      back: 'Back',
      submit: 'Submit',
      success: 'Success',
      error: 'Error',
      loading: 'Loading...',
      no_data: 'No data found',
      search: 'Search',
      filter: 'Filter',
      export: 'Export CSV',
      print: 'Print',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      cancel: 'Cancel',
      required: 'Required',
      phone_invalid: 'Invalid phone number',
      area_calc: 'Area: {area} m²',
      digitize: 'Digitize on map',
      download_kml: 'Download KML',
      gps_location: 'GPS Location',
      undo: 'Undo',
      clear: 'Clear',
      coords: 'Coordinates',
      owner_name: 'Owner Name',
      survey_date: 'Survey Date',
      sub_district: 'Sub-District',
      section: 'Section',
      all: 'All',
      export_to_csv: 'Export to CSV',
      print_report: 'Print Report',
      go_back: 'Go Back',
      kml_downloaded: 'KML downloaded successfully',
      registration_success: 'Registration submitted. ID: {id}',
      login_error: 'Login failed. Please check your credentials.',
      network_error: 'Network error. Please try again.',
    }
  };

  function t(key, replacements = {}) {
    const lang = AUTH.getLang() || 'so';
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.so;
    let text = dict[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
  }

  /* --- Toast System --- */
  function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container') || (() => {
      const c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* --- Loading Overlay --- */
  function showLoading(text) {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner"></div><div class="loading-text" id="loadingText"></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#loadingText').textContent = text || t('loading');
    overlay.classList.add('active');
  }

  function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  /* --- Navigation Utilities --- */
  function goTo(path) {
    window.location.href = path;
  }

  function highlightActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.bottom-nav a').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === page);
    });
  }

  /* --- Form Utilities --- */
  function validateField(input) {
    const value = input.value.trim();
    const errorEl = input.parentElement.querySelector('.field-error');
    let valid = true;

    input.classList.remove('error');

    if (input.required && !value) {
      valid = false;
    }

    if (input.type === 'tel' && value && !/^\+?[\d\s\-]{6,15}$/.test(value)) {
      valid = false;
      if (errorEl) errorEl.textContent = t('phone_invalid');
    }

    if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      valid = false;
    }

    if (!valid) {
      input.classList.add('error');
    }

    return valid;
  }

  function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let allValid = true;
    inputs.forEach(input => {
      if (!validateField(input)) allValid = false;
    });
    return allValid;
  }

  /* --- Date Helpers --- */
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('so-SO', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function generateId() {
    const now = new Date();
    const ts = now.getTime().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MUN-${ts}-${rand}`;
  }

  /* --- localStorage Drafts --- */
  function saveDraft(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadDraft(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function removeDraft(key) {
    localStorage.removeItem(key);
  }

  /* --- CSV Export --- */
  function downloadCSV(headers, rows, filename) {
    const csvContent = [headers.join(','), ...rows.map(r =>
      r.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* --- Initialization --- */
  function init() {
    highlightActiveNav();
    AUTH.updateNavbar();

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('SW registered'))
        .catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    t,
    showToast,
    showLoading,
    hideLoading,
    goTo,
    highlightActiveNav,
    validateField,
    validateForm,
    todayISO,
    formatDate,
    generateId,
    saveDraft,
    loadDraft,
    removeDraft,
    downloadCSV,
    init,
  };
})();
