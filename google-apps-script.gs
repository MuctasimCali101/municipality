/* ============================================================
   MUNICIPALITY — Google Apps Script Backend
   Deploy as Web App: Execute as Me, Access: Anyone
   ============================================================ */

// =========================================
// CONFIGURATION — Update these values
// =========================================
const CONFIG = {
  SPREADSHEET_ID: '1QflM2tBBx2VH2IsmV8ghJcYf52DyxbKmxd0996Ii-Tg',
  ADMIN_MASTER_PASSWORD: PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || 'admin123',
  TOKEN_SALT: 'MUNICIPALITY_BOSASO_2024_SECRET',
  SHEETS: {
    USERS: 'Users',
    CITIES: 'Cities',
    SUBMISSIONS_PREFIX: 'Submissions_',  // e.g. Submissions_BOS
  }
};

// =========================================
// DO GET — Handle all API requests
// =========================================
function doGet(e) {
  seedDefaultData(); // Auto-create default data if sheets are empty
  const action = e.parameter.action || '';
  const params = e.parameter;

  try {
    switch (action) {
      case 'login':
        return handleLogin(params);
      case 'adminLogin':
        return handleAdminLogin(params);
      case 'getSubmissions':
        return handleGetSubmissions(params);
      case 'getSubmissionById':
        return handleGetSubmissionById(params);
      case 'getUsers':
        return handleGetUsers(params);
      case 'getCities':
        return handleGetCities();
      case 'getDashboardStats':
        return handleGetDashboardStats(params);
      case 'exportCSV':
        return handleExportCSV(params);
      case 'exportAllCSV':
        return handleExportAllCSV();
      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// =========================================
// DO POST — Handle mutations
// =========================================
function doPost(e) {
  seedDefaultData(); // Auto-create default data if sheets are empty
  const action = e.parameter.action || '';
  const data = JSON.parse(e.postData.contents || '{}');

  try {
    switch (action) {
      case 'submit':
        return handleSubmit(data);
      case 'updateSubmission':
        return handleUpdateSubmission(data);
      case 'addUser':
        return handleAddUser(data);
      case 'updateUser':
        return handleUpdateUser(data);
      default:
        return jsonResponse({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

// =========================================
// AUTH HELPERS
// =========================================
function validateToken(username, token) {
  if (!username || !token) return false;
  const user = getUserByUsername(username);
  if (!user || !user.active) return false;
  const expected = generateToken(username);
  return token === expected;
}

function generateToken(username) {
  const timestamp = Math.floor(Date.now() / 60000); // valid for ~1 minute
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    username + timestamp + CONFIG.TOKEN_SALT
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function requireAdmin(params) {
  if (params.action === 'getUsers' || params.action === 'addUser' || params.action === 'updateUser') {
    const user = getUserByUsername(params.username);
    return user && user.role === 'admin' && validateToken(params.username, params.token);
  }
  return true;
}

// =========================================
// SHEET HELPERS
// =========================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Create if doesn't exist
    ss.insertSheet(name);
    return ss.getSheetByName(name);
  }
  return sheet;
}

function getSheetData(name) {
  const sheet = getSheet(name);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(name, data) {
  const sheet = getSheet(name);
  const headers = sheet.getDataRange().getValues()[0] || [];
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
}

function updateRow(name, rowIndex, data) {
  const sheet = getSheet(name);
  const headers = sheet.getDataRange().getValues()[0] || [];
  headers.forEach((h, i) => {
    if (data[h] !== undefined) {
      sheet.getRange(rowIndex + 1, i + 1).setValue(data[h]);
    }
  });
}

function getColumnIndex(name, colName) {
  const sheet = getSheet(name);
  const headers = sheet.getDataRange().getValues()[0] || [];
  return headers.indexOf(colName);
}

function getSheetNameForCity(cityCode) {
  return CONFIG.SHEETS.SUBMISSIONS_PREFIX + (cityCode || '').toUpperCase();
}

// =========================================
// USER MANAGEMENT
// =========================================
function getUserByUsername(username) {
  const users = getSheetData(CONFIG.SHEETS.USERS);
  return users.find(u => u.username === username);
}

function hashPassword(password) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + CONFIG.TOKEN_SALT
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// =========================================
// HANDLERS
// =========================================

function handleLogin(params) {
  const { username, password, cityCode } = params;
  const user = getUserByUsername(username);

  if (!user) {
    return jsonResponse({ success: false, message: 'Username-ka ama furaha waa qalad' });
  }

  if (!user.active) {
    return jsonResponse({ success: false, message: 'Xisaabtaan waa la joojiyay' });
  }

  const hashed = hashPassword(password);
  if (user.password_hash !== hashed) {
    return jsonResponse({ success: false, message: 'Username-ka ama furaha waa qalad' });
  }

  if (user.city_code !== cityCode) {
    return jsonResponse({ success: false, message: 'Koodhka magaalada waa qalad' });
  }

  // Update last login
  const usersSheet = getSheet(CONFIG.SHEETS.USERS);
  const usersData = usersSheet.getDataRange().getValues();
  const userRow = usersData.findIndex(r => r[0] === username);
  if (userRow > 0) {
    const lastLoginCol = getColumnIndex(CONFIG.SHEETS.USERS, 'last_login');
    if (lastLoginCol > 0) {
      usersSheet.getRange(userRow + 1, lastLoginCol + 1).setValue(new Date().toISOString());
    }
  }

  // Get city name
  const city = getSheetData(CONFIG.SHEETS.CITIES).find(c => c.city_code === cityCode);

  return jsonResponse({
    success: true,
    username: user.username,
    role: user.role,
    cityCode: user.city_code,
    cityName: city ? city.city_name : cityCode,
    name: user.name || user.username,
    token: generateToken(username),
  });
}

function handleAdminLogin(params) {
  const { masterPassword } = params;

  if (masterPassword !== CONFIG.ADMIN_MASTER_PASSWORD) {
    return jsonResponse({ success: false, message: 'Furaha admin-ka waa qalad' });
  }

  return jsonResponse({
    success: true,
    username: 'admin',
    role: 'admin',
    cityCode: 'ALL',
    cityName: 'All Cities',
    name: 'Administrator',
    token: generateToken('admin'),
  });
}

function handleGetSubmissions(params) {
  const { cityCode, engineer, subDistrict, startDate, endDate, page, limit } = params;

  let allData = [];
  const user = getUserByUsername(params.username);

  if (user && user.role === 'admin') {
    // Admin sees all cities
    const cities = getSheetData(CONFIG.SHEETS.CITIES);
    cities.forEach(c => {
      const sheetName = getSheetNameForCity(c.city_code);
      try {
        const data = getSheetData(sheetName);
        data.forEach(d => d.city_code = c.city_code);
        allData = allData.concat(data);
      } catch (e) {}
    });
  } else if (cityCode) {
    const sheetName = getSheetNameForCity(cityCode);
    try {
      allData = getSheetData(sheetName);
      // Filter by engineer if field_engineer
      if (user && user.role === 'field_engineer') {
        allData = allData.filter(d => d.engineer_name === user.name || d.engineer_name === user.username);
      }
    } catch (e) {}
  }

  // Apply filters
  if (subDistrict) {
    allData = allData.filter(d => d.sub_district === subDistrict);
  }
  if (startDate) {
    allData = allData.filter(d => d.survey_date >= startDate);
  }
  if (endDate) {
    allData = allData.filter(d => d.survey_date <= endDate);
  }

  // Sort by date descending
  allData.sort((a, b) => (b.survey_date || '').localeCompare(a.survey_date || ''));

  // Pagination
  const pg = parseInt(page) || 1;
  const lim = parseInt(limit) || 100;
  const start = (pg - 1) * lim;
  const paged = allData.slice(start, start + lim);

  return jsonResponse({
    success: true,
    data: paged,
    total: allData.length,
    page: pg,
    limit: lim,
  });
}

function handleGetSubmissionById(params) {
  const { id, cityCode } = params;
  const sheetName = getSheetNameForCity(cityCode);

  try {
    const data = getSheetData(sheetName);
    const submission = data.find(d => d.submission_id === id);
    if (submission) {
      return jsonResponse({ success: true, data: submission });
    }
    return jsonResponse({ success: false, message: 'Submission not found' });
  } catch (e) {
    return jsonResponse({ success: false, message: e.toString() });
  }
}

function handleSubmit(data) {
  const cityCode = data.city_code || 'BOS';
  const sheetName = getSheetNameForCity(cityCode);

  // Ensure sheet exists with headers
  const sheet = getSheet(sheetName);
  const existingHeaders = sheet.getDataRange().getValues()[0] || [];

  // Define all possible columns
  const allHeaders = [
    'submission_id', 'engineer_name', 'survey_date', 'survey_time',
    'owner_name', 'owner_phone', 'mother_name', 'owner_gender',
    'ref_name', 'ref_gender', 'ref_phone', 'ref_relation',
    'land_type', 'land_width', 'land_length', 'land_area',
    'sub_district', 'section', 'street_name', 'landmark',
    'bound_north_name', 'bound_north_dist', 'bound_south_name', 'bound_south_dist',
    'bound_east_name', 'bound_east_dist', 'bound_west_name', 'bound_west_dist',
    'tix_number', 'tix_date', 'tix_authority',
    'gis_area', 'gis_perimeter', 'gis_points', 'gis_center_lat', 'gis_center_lng', 'gis_kml_file', 'gis_coords',
    'city_code', 'status', 'created_at',
  ];

  // Add missing headers
  if (existingHeaders.length === 0) {
    sheet.appendRow(allHeaders);
  } else {
    const missingHeaders = allHeaders.filter(h => !existingHeaders.includes(h));
    if (missingHeaders.length > 0) {
      const newHeaders = existingHeaders.concat(missingHeaders);
      sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    }
  }

  data.created_at = new Date().toISOString();
  data.status = data.status || 'completed';

  appendRow(sheetName, data);

  return jsonResponse({ success: true, message: 'Submission saved', id: data.submission_id });
}

function handleUpdateSubmission(data) {
  const { id, cityCode, ...fields } = data;
  const sheetName = getSheetNameForCity(cityCode);

  const sheet = getSheet(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex < 1) {
    return jsonResponse({ success: false, message: 'Submission not found' });
  }

  const updateData = {};
  headers.forEach((h, i) => {
    if (fields[h] !== undefined) {
      updateData[h] = fields[h];
    }
  });

  updateRow(sheetName, rowIndex, updateData);

  return jsonResponse({ success: true, message: 'Updated' });
}

function handleGetUsers(params) {
  if (!requireAdmin(params)) {
    return jsonResponse({ success: false, message: 'Unauthorized' });
  }

  const users = getSheetData(CONFIG.SHEETS.USERS);
  // Don't expose password hashes
  const safeUsers = users.map(u => ({
    username: u.username,
    role: u.role,
    city_code: u.city_code,
    active: u.active,
    last_login: u.last_login,
  }));

  return jsonResponse({ success: true, data: safeUsers });
}

function handleAddUser(data) {
  const { username, password, role, cityCode } = data;

  if (!username || !password || !role) {
    return jsonResponse({ success: false, message: 'Missing required fields' });
  }

  const existing = getUserByUsername(username);
  if (existing) {
    return jsonResponse({ success: false, message: 'Username already exists' });
  }

  const userData = {
    username: username,
    password_hash: hashPassword(password),
    role: role,
    city_code: cityCode || '',
    active: true,
    last_login: '',
    name: username,
  };

  // Ensure headers exist
  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const headers = sheet.getDataRange().getValues()[0] || [];
  const userHeaders = ['username', 'password_hash', 'role', 'city_code', 'active', 'last_login', 'name'];
  if (headers.length === 0) {
    sheet.appendRow(userHeaders);
  }

  appendRow(CONFIG.SHEETS.USERS, userData);

  return jsonResponse({ success: true, message: 'User created' });
}

function handleUpdateUser(data) {
  const { username, action, password } = data;

  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const rowIndex = rows.findIndex(r => r[0] === username);

  if (rowIndex < 1) {
    return jsonResponse({ success: false, message: 'User not found' });
  }

  if (action === 'toggleActive') {
    const activeCol = headers.indexOf('active');
    const currentValue = sheet.getRange(rowIndex + 1, activeCol + 1).getValue();
    sheet.getRange(rowIndex + 1, activeCol + 1).setValue(!currentValue);
  } else if (action === 'resetPassword' && password) {
    const passCol = headers.indexOf('password_hash');
    sheet.getRange(rowIndex + 1, passCol + 1).setValue(hashPassword(password));
  } else if (action === 'changeAdminPassword' && password) {
    PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', password);
    CONFIG.ADMIN_MASTER_PASSWORD = password;
    return jsonResponse({ success: true, message: 'Admin password changed successfully!' });
  }

  return jsonResponse({ success: true, message: 'User updated' });
}

function handleGetCities() {
  const cities = getSheetData(CONFIG.SHEETS.CITIES);

  // If no cities exist, seed default data
  if (cities.length === 0) {
    const defaultCities = [
      { city_code: 'BOS', city_name: 'Bosaso', active: true },
      { city_code: 'GRW', city_name: 'Garowe', active: true },
      { city_code: 'GLK', city_name: 'Galkayo', active: true },
    ];
    defaultCities.forEach(c => appendRow(CONFIG.SHEETS.CITIES, c));
    return jsonResponse({ success: true, data: defaultCities });
  }

  return jsonResponse({ success: true, data: cities });
}

function handleGetDashboardStats(params) {
  const { cityCode } = params;
  const sheetName = getSheetNameForCity(cityCode);
  let submissions = [];

  try {
    submissions = getSheetData(sheetName);
  } catch (e) {}

  const user = getUserByUsername(params.username);
  if (user && user.role === 'field_engineer') {
    submissions = submissions.filter(d =>
      d.engineer_name === user.name || d.engineer_name === user.username
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const todayCount = submissions.filter(d => d.survey_date === today).length;
  const monthCount = submissions.filter(d => (d.survey_date || '').startsWith(thisMonth)).length;
  const totalArea = submissions.reduce((sum, d) => sum + parseFloat(d.land_area || d.gis_area || 0), 0);
  const pendingCount = submissions.filter(d => d.status === 'draft').length;
  const maleCount = submissions.filter(d => d.owner_gender === 'Male').length;
  const femaleCount = submissions.filter(d => d.owner_gender === 'Female').length;
  const recent = submissions.sort((a, b) => (b.survey_date || '').localeCompare(a.survey_date || '')).slice(0, 10);

  return jsonResponse({
    success: true,
    data: {
      today: todayCount,
      month: monthCount,
      totalArea: totalArea,
      pending: pendingCount,
      male: maleCount,
      female: femaleCount,
      recent: recent,
    }
  });
}

function handleExportCSV(params) {
  const sheetName = getSheetNameForCity(params.cityCode);

  try {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const csv = data.map(row => row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');

    return jsonResponse({ success: true, csv: csv });
  } catch (e) {
    return jsonResponse({ success: false, message: e.toString() });
  }
}

function handleExportAllCSV() {
  const cities = getSheetData(CONFIG.SHEETS.CITIES);
  let allRows = [];
  let allHeaders = [];

  cities.forEach(c => {
    const sheetName = getSheetNameForCity(c.city_code);
    try {
      const sheet = getSheet(sheetName);
      const data = sheet.getDataRange().getValues();
      if (data.length > 0) {
        const headers = data[0];
        if (allHeaders.length === 0) allHeaders = ['city_code', ...headers];
        data.slice(1).forEach(row => {
          allRows.push([c.city_code, ...row]);
        });
      }
    } catch (e) {}
  });

  // Add city_code column to header
  const csv = [allHeaders.join(',')].concat(
    allRows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ).join('\n');

  return jsonResponse({ success: true, csv: csv });
}

// =========================================
// SEED DEFAULT DATA — Auto-runs on first access
// =========================================
function seedDefaultData() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // --- Seed Cities ---
  let citySheet = ss.getSheetByName(CONFIG.SHEETS.CITIES);
  if (!citySheet) {
    citySheet = ss.insertSheet(CONFIG.SHEETS.CITIES);
    citySheet.appendRow(['city_code', 'city_name', 'active']);
    citySheet.appendRow(['BOS', 'Bosaso', true]);
    citySheet.appendRow(['GRW', 'Garowe', true]);
    citySheet.appendRow(['GLK', 'Galkayo', true]);
  } else if (citySheet.getDataRange().getValues().length <= 1) {
    citySheet.appendRow(['BOS', 'Bosaso', true]);
    citySheet.appendRow(['GRW', 'Garowe', true]);
    citySheet.appendRow(['GLK', 'Galkayo', true]);
  }

  // --- Seed Users ---
  let userSheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
  const userHeaders = ['username', 'password_hash', 'role', 'city_code', 'active', 'last_login', 'name'];
  if (!userSheet) {
    userSheet = ss.insertSheet(CONFIG.SHEETS.USERS);
    userSheet.appendRow(userHeaders);
    // Default users (password = "123456" for all)
    userSheet.appendRow(['engineer1', hashPassword('123456'), 'field_engineer', 'BOS', true, '', 'Ahmed Maxamed']);
    userSheet.appendRow(['engineer2', hashPassword('123456'), 'field_engineer', 'BOS', true, '', 'Cali Yuusuf']);
    userSheet.appendRow(['supervisor1', hashPassword('123456'), 'supervisor', 'BOS', true, '', 'Xasan Cali']);
    userSheet.appendRow(['engineer3', hashPassword('123456'), 'field_engineer', 'GRW', true, '', 'Maxamed Cabdi']);
    userSheet.appendRow(['supervisor2', hashPassword('123456'), 'supervisor', 'GRW', true, '', 'Faadumo Cumar']);
  } else if (userSheet.getDataRange().getValues().length <= 1) {
    userSheet.appendRow(['engineer1', hashPassword('123456'), 'field_engineer', 'BOS', true, '', 'Ahmed Maxamed']);
    userSheet.appendRow(['engineer2', hashPassword('123456'), 'field_engineer', 'BOS', true, '', 'Cali Yuusuf']);
    userSheet.appendRow(['supervisor1', hashPassword('123456'), 'supervisor', 'BOS', true, '', 'Xasan Cali']);
    userSheet.appendRow(['engineer3', hashPassword('123456'), 'field_engineer', 'GRW', true, '', 'Maxamed Cabdi']);
    userSheet.appendRow(['supervisor2', hashPassword('123456'), 'supervisor', 'GRW', true, '', 'Faadumo Cumar']);
  }

  // --- Seed Submissions sheet for BOS ---
  let subSheet = ss.getSheetByName(getSheetNameForCity('BOS'));
  if (!subSheet) {
    subSheet = ss.insertSheet(getSheetNameForCity('BOS'));
    const subHeaders = [
      'submission_id', 'engineer_name', 'survey_date', 'owner_name', 'owner_phone',
      'mother_name', 'owner_gender', 'land_type', 'land_width', 'land_length',
      'land_area', 'sub_district', 'section', 'street_name',
      'bound_north_name', 'bound_north_dist', 'bound_south_name', 'bound_south_dist',
      'bound_east_name', 'bound_east_dist', 'bound_west_name', 'bound_west_dist',
      'tix_number', 'tix_date', 'tix_authority', 'status', 'created_at'
    ];
    subSheet.appendRow(subHeaders);
  }
}

// =========================================
// RESPONSE HELPER
// =========================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
