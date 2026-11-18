const API_BASE_URL = '/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('school_erp_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (!isFormData && options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('school_erp_token');
    localStorage.removeItem('school_erp_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'An unexpected error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  get: (url, options) => apiClient(url, { ...options, method: 'GET' }),
  post: (url, body, options) => apiClient(url, { ...options, method: 'POST', body }),
  put: (url, body, options) => apiClient(url, { ...options, method: 'PUT', body }),
  patch: (url, body, options) => apiClient(url, { ...options, method: 'PATCH', body }),
  delete: (url, options) => apiClient(url, { ...options, method: 'DELETE' }),
  upload: (url, formData, options) => apiClient(url, { ...options, method: 'POST', body: formData }),
};
