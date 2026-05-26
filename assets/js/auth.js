/* ============================================================
   MUNICIPALITY — Auth Module
   Login, Token Management, Role Checking
   ============================================================ */

const AUTH = (() => {
  const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyD3vSLm7nY-LlPtZFXxaW-mb0jG_K7P09yc1yPGgQW3PK78I2gV2wylFNTJuENH2gH/exec';
  const TOKEN_KEY = 'mun_token';
  const USER_KEY = 'mun_user';
  const CITY_KEY = 'mun_city_code';
  const CITY_NAME_KEY = 'mun_city_name';
  const LANG_KEY = 'mun_lang';

  function getStoredCityCode() {
    return localStorage.getItem(CITY_KEY) || '';
  }

  function setStoredCityCode(code) {
    localStorage.setItem(CITY_KEY, code);
  }

  function getStoredCityName() {
    return localStorage.getItem(CITY_NAME_KEY) || '';
  }

  function setStoredCityName(name) {
    localStorage.setItem(CITY_NAME_KEY, name);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'so';
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken() && !!getCurrentUser();
  }

  function getRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
  }

  function isAdmin() {
    return getRole() === 'admin';
  }

  function isSupervisor() {
    return getRole() === 'supervisor';
  }

  function isFieldEngineer() {
    return getRole() === 'field_engineer';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function requireRole(roles) {
    if (!requireAuth()) return false;
    if (!roles.includes(getRole())) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  async function login(username, password, cityCode) {
    const url = `${APP_SCRIPT_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&cityCode=${encodeURIComponent(cityCode)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    const user = {
      username: data.username,
      role: data.role,
      cityCode: data.cityCode,
      cityName: data.cityName,
      name: data.name || data.username,
    };

    setToken(data.token);
    setCurrentUser(user);
    setStoredCityCode(data.cityCode);
    setStoredCityName(data.cityName || cityCode);

    return user;
  }

  async function adminLogin(masterPassword) {
    const url = `${APP_SCRIPT_URL}?action=adminLogin&masterPassword=${encodeURIComponent(masterPassword)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Admin login failed');
    }

    const user = {
      username: 'admin',
      role: 'admin',
      cityCode: 'ALL',
      cityName: 'All Cities',
      name: 'Administrator',
    };

    setToken(data.token);
    setCurrentUser(user);

    return user;
  }

  function logout() {
    clearSession();
    window.location.href = 'index.html';
  }

  function updateNavbar() {
    const user = getCurrentUser();
    if (!user) return;

    const cityEl = document.getElementById('navCity');
    const userEl = document.getElementById('navUser');
    const brandEl = document.querySelector('.nav-brand span');

    if (cityEl) {
      cityEl.textContent = user.cityName || user.cityCode;
      cityEl.style.display = 'inline';
    }
    if (userEl) {
      userEl.textContent = user.name || user.username;
      userEl.style.display = 'inline';
    }
    if (brandEl && user.cityName) {
      brandEl.textContent = user.cityName;
      brandEl.style.display = 'inline';
    }
  }

  return {
    APP_SCRIPT_URL,
    getStoredCityCode,
    setStoredCityCode,
    getStoredCityName,
    setStoredCityName,
    getToken,
    getCurrentUser,
    setCurrentUser,
    getLang,
    setLang,
    clearSession,
    isLoggedIn,
    getRole,
    isAdmin,
    isSupervisor,
    isFieldEngineer,
    requireAuth,
    requireRole,
    login,
    adminLogin,
    logout,
    updateNavbar,
  };
})();
