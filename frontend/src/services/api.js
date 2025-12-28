import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// הוספת token לכל בקשה
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// טיפול בשגיאות
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Riders API
export const ridersAPI = {
  getAll: (params) => api.get('/riders', { params }),
  getById: (id) => api.get(`/riders/${id}`),
  create: (data) => api.post('/riders', data),
  update: (id, data) => api.put(`/riders/${id}`, data),
  delete: (id) => api.delete(`/riders/${id}`),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: (params) => api.get('/vehicles', { params }),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  updateKilometers: (id, data) => api.patch(`/vehicles/${id}/kilometers`, data),
  createFolder: (vehicleNumber) => api.post('/vehicles/create-folder', { vehicleNumber }),
  uploadFile: (formData, folderId) => {
    return axios.post(`${API_URL}/vehicles/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
  listFiles: (folderId) => api.get(`/vehicles/list-files?folderId=${folderId}`),
  deleteFile: (fileId) => api.delete(`/vehicles/delete-file?fileId=${fileId}`),
};

// Tasks API
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Monthly Checks API
export const monthlyChecksAPI = {
  getAll: (params) => api.get('/monthly-checks', { params }),
  getById: (id) => api.get(`/monthly-checks/${id}`),
  create: (data) => api.post('/monthly-checks', data),
  update: (id, data) => api.put(`/monthly-checks/${id}`, data),
  delete: (id) => api.delete(`/monthly-checks/${id}`),
};

// Faults API
export const faultsAPI = {
  getAll: (params) => api.get('/faults', { params }),
  getById: (id) => api.get(`/faults/${id}`),
  create: (data) => api.post('/faults', data),
  update: (id, data) => api.put(`/faults/${id}`, data),
  delete: (id) => api.delete(`/faults/${id}`),
};

export default api;
