const API_BASE = 'https://fdrflow-sih-backend.onrender.com/api';

export function getToken() {
  return localStorage.getItem('fdr_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('fdr_token', token);
  } else {
    localStorage.removeItem('fdr_token');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('fdr_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('fdr_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('fdr_user');
  }
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { ...options.headers };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  // Handle json bodies unless already FormData
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType.includes('text/csv')) {
    data = await response.text();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let msg = 'An unexpected server error occurred.';
    if (typeof data === 'object' && data !== null) {
      if (data.error) {
        msg = data.error;
      } else if (data.detail) {
        msg = data.detail;
      } else if (data.non_field_errors) {
        msg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
      } else {
        const fieldErrors = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ');
        if (fieldErrors) msg = fieldErrors;
      }
    } else if (typeof data === 'string' && data) {
      msg = data.slice(0, 200);
    }
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Authentication
  login: async (username, password) => {
    const res = await request('/auth/login/', {
      method: 'POST',
      body: { username, password },
    });
    setToken(res.token);
    setStoredUser(res.user);
    return res;
  },

  quickSwitch: async (role) => {
    const res = await request('/auth/quick-switch/', {
      method: 'POST',
      body: { role },
    });
    setToken(res.token);
    setStoredUser(res.user);
    return res;
  },

  getMe: async () => {
    const user = await request('/auth/me/');
    setStoredUser(user);
    return user;
  },

  logout: () => {
    setToken('');
    setStoredUser(null);
  },

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats/'),

  // FDR Instruments
  getFDRs: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All statuses' && v !== 'All banks') {
        query.append(k, v);
      }
    });
    const qs = query.toString();
    return request(`/fdrs/${qs ? `?${qs}` : ''}`);
  },

  getFDR: (id) => request(`/fdrs/${id}/`),

  createFDR: (formData) => {
    return request('/fdrs/', {
      method: 'POST',
      body: formData,
    });
  },

  updateFDR: (id, data) => {
    return request(`/fdrs/${id}/`, {
      method: 'PATCH',
      body: data,
    });
  },

  deleteFDR: (id) => {
    return request(`/fdrs/${id}/`, {
      method: 'DELETE',
    });
  },

  verifyFDR: (id, { decision, remarks, verification_method }) => {
    return request(`/fdrs/${id}/verify/`, {
      method: 'POST',
      body: { decision, remarks, verification_method },
    });
  },

  renewFDR: (id, renewalData) => {
    return request(`/fdrs/${id}/renew/`, {
      method: 'POST',
      body: renewalData,
    });
  },

  requestRelease: (id, releaseData) => {
    return request(`/fdrs/${id}/request_release/`, {
      method: 'POST',
      body: releaseData,
    });
  },

  downloadDocumentUrl: (id) => `${API_BASE}/fdrs/${id}/download_document/`,

  exportCsvUrl: () => `${API_BASE}/fdrs/export_csv/`,

  // Release Requests
  getReleaseRequests: () => request('/release-requests/'),

  reviewReleaseRequest: (id, { decision, reviewer_remarks }) => {
    return request(`/release-requests/${id}/review/`, {
      method: 'POST',
      body: { decision, reviewer_remarks },
    });
  },

  // Alerts
  getAlerts: () => request('/alerts/'),

  markAlertRead: (id) => request(`/alerts/${id}/mark_read/`, { method: 'POST' }),

  markAllAlertsRead: () => request('/alerts/mark_all_read/', { method: 'POST' }),

  syncAlerts: () => request('/alerts/sync/', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request('/audit-logs/'),
};
