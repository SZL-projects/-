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
    // בדיקה גם ב-localStorage וגם ב-sessionStorage (בגלל "זכור אותי")
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      // ניקוי שני מקומות האחסון
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    console.log('🔐 Calling login API:', '/auth/login');
    return api.post('/auth/login', credentials);
  },
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getAllUsers: (params) => api.get('/users', { params }),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  sendCredentials: (userId) => api.post(`/users/${userId}/send-credentials`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  changePassword: (oldPassword, newPassword) => api.put('/auth/change-password', { oldPassword, newPassword }),
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
  createFolder: (vehicleNumber, vehicleId) => api.post('/vehicles/create-folder', { vehicleNumber, vehicleId }),
  uploadFile: (formData, folderId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return axios.post(`${API_URL}/vehicles/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
  },
  listFiles: (folderId, vehicleId = null, viewAsRider = false) => {
    let params = `folderId=${folderId}`;
    if (vehicleId) params += `&vehicleId=${vehicleId}`;
    if (viewAsRider) params += `&viewAsRider=true`;
    return api.get(`/vehicles/list-files?${params}`);
  },
  deleteFile: (fileId, recursive = false) => api.delete(`/vehicles/delete-file?fileId=${fileId}${recursive ? '&recursive=true' : ''}`),
  updateFileVisibility: (vehicleId, fileId, visibleToRider) => api.patch('/vehicles/update-file-visibility', { vehicleId, fileId, visibleToRider }),
  moveToArchive: (vehicleId, fileId) => api.post('/vehicles/move-to-archive', { vehicleId, fileId }),
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
  sendNotification: (id) => api.post(`/monthly-checks/${id}/send-notification`),
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
