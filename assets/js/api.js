/* ============================================================
   MUNICIPALITY — API Module
   All Google Sheets / Apps Script Communication
   ============================================================ */

const API = (() => {
  const BASE_URL = AUTH.APP_SCRIPT_URL;

  function getAuthParams() {
    return `&token=${encodeURIComponent(AUTH.getToken())}&username=${encodeURIComponent(AUTH.getCurrentUser()?.username || '')}`;
  }

  async function request(action, extraParams = '') {
    const url = `${BASE_URL}?action=${action}${extraParams}${getAuthParams()}`;
    const response = await fetch(url);
    return response.json();
  }

  async function postRequest(action, data) {
    const url = `${BASE_URL}?action=${action}${getAuthParams()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async function getCities() {
    return request('getCities');
  }

  async function submitRegistration(data) {
    return postRequest('submit', data);
  }

  async function getSubmissions(filters = {}) {
    let params = '';
    if (filters.cityCode) params += `&cityCode=${encodeURIComponent(filters.cityCode)}`;
    if (filters.engineer) params += `&engineer=${encodeURIComponent(filters.engineer)}`;
    if (filters.subDistrict) params += `&subDistrict=${encodeURIComponent(filters.subDistrict)}`;
    if (filters.startDate) params += `&startDate=${encodeURIComponent(filters.startDate)}`;
    if (filters.endDate) params += `&endDate=${encodeURIComponent(filters.endDate)}`;
    if (filters.page) params += `&page=${filters.page}`;
    if (filters.limit) params += `&limit=${filters.limit}`;
    return request('getSubmissions', params);
  }

  async function getSubmissionById(id, cityCode) {
    return request('getSubmissionById', `&id=${encodeURIComponent(id)}&cityCode=${encodeURIComponent(cityCode)}`);
  }

  async function updateSubmission(id, cityCode, data) {
    return postRequest('updateSubmission', { id, cityCode, ...data });
  }

  async function getUsers() {
    return request('getUsers');
  }

  async function addUser(data) {
    return postRequest('addUser', data);
  }

  async function updateUser(data) {
    return postRequest('updateUser', data);
  }

  async function exportCSV(cityCode) {
    return request('exportCSV', `&cityCode=${encodeURIComponent(cityCode)}`);
  }

  async function exportAllCSV() {
    return request('exportAllCSV');
  }

  async function getDashboardStats(cityCode) {
    return request('getDashboardStats', `&cityCode=${encodeURIComponent(cityCode)}`);
  }

  return {
    getCities,
    submitRegistration,
    getSubmissions,
    getSubmissionById,
    updateSubmission,
    getUsers,
    addUser,
    updateUser,
    exportCSV,
    exportAllCSV,
    getDashboardStats,
  };
})();
