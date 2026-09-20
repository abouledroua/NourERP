const API_BASE = '/api';

export function generateDeviceKey() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getWorkstationFingerprint() {
  let fp = localStorage.getItem('alnour_device_key') || localStorage.getItem('alnour_workstation_fp');
  // Enforce 5 to 8 uppercase characters and numbers
  if (!fp || !/^[A-Z0-9]{5,8}$/.test(fp)) {
    fp = generateDeviceKey();
    localStorage.setItem('alnour_device_key', fp);
  }
  return fp;
}

export function setWorkstationFingerprint(key) {
  if (key && /^[A-Z0-9]{5,8}$/.test(key)) {
    localStorage.setItem('alnour_device_key', key);
  }
}

export function getWorkstationName() {
  return localStorage.getItem('alnour_workstation_name') || '';
}

export function setWorkstationName(name) {
  if (name) {
    localStorage.setItem('alnour_workstation_name', String(name).trim());
  }
}

export async function syncDeviceIdentity() {
  try {
    const currentKey = getWorkstationFingerprint();
    const res = await apiRequest(`/auth/device-identity?key=${currentKey}`, { method: 'GET' });
    if (res && res.success && res.deviceKey) {
      setWorkstationFingerprint(res.deviceKey);
      if (res.workstationName) {
        setWorkstationName(res.workstationName);
      }
      return res;
    }
  } catch (err) {
    console.warn('[DEVICE-SYNC] Could not sync device identity:', err.message);
  }
  return { deviceKey: getWorkstationFingerprint(), exists: false };
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('alnour_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    'x-device-fingerprint': getWorkstationFingerprint(),
    'x-workstation-name': getWorkstationName(),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('alnour_token');
    localStorage.removeItem('alnour_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  // Handle file downloads
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('spreadsheetml') || contentType.includes('octet-stream'))) {
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export default {
  get: (url, options) => apiRequest(url, { method: 'GET', ...options }),
  post: (url, body, options) => apiRequest(url, { method: 'POST', body, ...options }),
  put: (url, body, options) => apiRequest(url, { method: 'PUT', body, ...options }),
  delete: (url, options) => apiRequest(url, { method: 'DELETE', ...options }),
  upload: (url, formData, options) => apiRequest(url, { method: 'POST', body: formData, ...options })
};
