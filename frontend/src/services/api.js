import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== מערכת Cache פשוטה לשיפור ביצועים =====
const cache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 שניות

// פונקציה לקבלת מפתח cache
const getCacheKey = (url, params) => {
  return `${url}${params ? JSON.stringify(params) : ''}`;
};

// פונקציה לבדיקת תקינות cache
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

// פונקציה לניקוי cache לפי prefix (לאחר עדכון/יצירה/מחיקה)
export const invalidateCache = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

// פונקציה לניקוי כל ה-cache
export const clearAllCache = () => {
  cache.clear();
};

// פונקציה עטיפה ל-GET requests עם cache
const cachedGet = async (url, config = {}) => {
  const cacheKey = getCacheKey(url, config.params);
  const cachedData = cache.get(cacheKey);

  // אם יש cache תקין, החזר אותו
  if (isCacheValid(cachedData)) {
    return cachedData.data;
  }

  // אחרת, בצע קריאה לשרת
  const response = await api.get(url, config);

  // שמור ב-cache
  cache.set(cacheKey, {
    data: response,
    timestamp: Date.now()
  });

  return response;
};

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

// Riders API - עם cache לשיפור ביצועים
export const ridersAPI = {
  getAll: (params) => cachedGet('/riders', { params }),
  getById: (id) => cachedGet(`/riders/${id}`),
  create: (data) => {
    invalidateCache('/riders');
    return api.post('/riders', data);
  },
  update: (id, data) => {
    invalidateCache('/riders');
    return api.put(`/riders/${id}`, data);
  },
  delete: (id) => {
    invalidateCache('/riders');
    return api.delete(`/riders/${id}`);
  },
  // Google Drive file operations for riders
  createFolder: (riderId) => api.post(`/riders/${riderId}/create-folder`),
  uploadFile: (formData, folderId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return axios.post(`${API_URL}/riders/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
  },
  listFiles: (folderId, riderId = null, viewAsRider = false) => {
    let params = `folderId=${folderId}`;
    if (riderId) params += `&riderId=${riderId}`;
    if (viewAsRider) params += `&viewAsRider=true`;
    return cachedGet(`/riders/list-files?${params}`);
  },
  deleteFile: (fileId, recursive = false) => {
    invalidateCache('/riders');
    return api.delete(`/riders/delete-file?fileId=${fileId}${recursive ? '&recursive=true' : ''}`);
  },
  updateFileVisibility: (riderId, fileId, visibleToRider) => {
    invalidateCache('/riders');
    return api.patch('/riders/update-file-visibility', { riderId, fileId, visibleToRider });
  },
  moveFile: (riderId, fileId, targetFolderId) => {
    invalidateCache('/riders');
    return api.post('/riders/move-file', { riderId, fileId, targetFolderId });
  },
  addCustomFolder: (riderId, folderName) => {
    invalidateCache('/riders');
    return api.post('/riders/add-custom-folder', { riderId, folderName });
  },
  deleteCustomFolder: (riderId, folderId) => {
    invalidateCache('/riders');
    return api.post('/riders/delete-custom-folder', { riderId, folderId });
  },
  deleteDefaultFolder: (riderId, folderKey, folderId) => {
    invalidateCache('/riders');
    return api.post('/riders/delete-default-folder', { riderId, folderKey, folderId });
  },
  renameFolder: (riderId, folderId, newName, folderKey, isCustom) => {
    invalidateCache('/riders');
    return api.post('/riders/rename-folder', { riderId, folderId, newName, folderKey, isCustom });
  },
};

// Vehicles API - עם cache לשיפור ביצועים
export const vehiclesAPI = {
  getAll: (params) => cachedGet('/vehicles', { params }),
  getById: (id) => cachedGet(`/vehicles/${id}`),
  create: (data) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles', data);
  },
  update: (id, data) => {
    invalidateCache('/vehicles');
    return api.put(`/vehicles/${id}`, data);
  },
  delete: (id) => {
    invalidateCache('/vehicles');
    return api.delete(`/vehicles/${id}`);
  },
  updateKilometers: (id, data) => {
    invalidateCache('/vehicles');
    return api.patch(`/vehicles/${id}/kilometers`, data);
  },
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
    return cachedGet(`/vehicles/list-files?${params}`);
  },
  deleteFile: (fileId, recursive = false) => {
    invalidateCache('/vehicles');
    return api.delete(`/vehicles/delete-file?fileId=${fileId}${recursive ? '&recursive=true' : ''}`);
  },
  updateFileVisibility: (vehicleId, fileId, visibleToRider) => {
    invalidateCache('/vehicles');
    return api.patch('/vehicles/update-file-visibility', { vehicleId, fileId, visibleToRider });
  },
  moveToArchive: (vehicleId, fileId) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/move-to-archive', { vehicleId, fileId });
  },
  moveFile: (vehicleId, fileId, targetFolderId) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/move-file', { vehicleId, fileId, targetFolderId });
  },
  addCustomFolder: (vehicleId, folderName) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/add-custom-folder', { vehicleId, folderName });
  },
  deleteCustomFolder: (vehicleId, folderId) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/delete-custom-folder', { vehicleId, folderId });
  },
  deleteDefaultFolder: (vehicleId, folderKey, folderId) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/delete-default-folder', { vehicleId, folderKey, folderId });
  },
  renameFolder: (vehicleId, folderId, newName, folderKey, isCustom) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/rename-folder', { vehicleId, folderId, newName, folderKey, isCustom });
  },
  refreshFolders: (vehicleId) => {
    invalidateCache('/vehicles');
    return api.post('/vehicles/refresh-folders', { vehicleId });
  },
  assign: (vehicleId, riderId) => {
    invalidateCache('/vehicles');
    invalidateCache('/riders');
    return api.post(`/vehicles/${vehicleId}/assign`, { riderId });
  },
  unassign: (vehicleId) => {
    invalidateCache('/vehicles');
    invalidateCache('/riders');
    return api.post(`/vehicles/${vehicleId}/unassign`);
  },
};

// Tasks API - עם cache לשיפור ביצועים
export const tasksAPI = {
  getAll: (params) => cachedGet('/tasks', { params }),
  getById: (id) => cachedGet(`/tasks/${id}`),
  create: (data) => {
    invalidateCache('/tasks');
    return api.post('/tasks', data);
  },
  update: (id, data) => {
    invalidateCache('/tasks');
    return api.put(`/tasks/${id}`, data);
  },
  delete: (id) => {
    invalidateCache('/tasks');
    return api.delete(`/tasks/${id}`);
  },
};

// Monthly Checks API - עם cache לשיפור ביצועים
export const monthlyChecksAPI = {
  getAll: (params) => cachedGet('/monthly-checks', { params }),
  getById: (id) => cachedGet(`/monthly-checks/${id}`),
  create: (data) => {
    invalidateCache('/monthly-checks');
    return api.post('/monthly-checks', data);
  },
  update: (id, data) => {
    invalidateCache('/monthly-checks');
    return api.put(`/monthly-checks/${id}`, data);
  },
  delete: (id) => {
    invalidateCache('/monthly-checks');
    return api.delete(`/monthly-checks/${id}`);
  },
  sendNotification: (id) => api.post(`/monthly-checks/${id}/send-notification`),
};

// Faults API - עם cache לשיפור ביצועים
export const faultsAPI = {
  getAll: (params) => cachedGet('/faults', { params }),
  getById: (id) => cachedGet(`/faults/${id}`),
  create: (data) => {
    invalidateCache('/faults');
    return api.post('/faults', data);
  },
  update: (id, data) => {
    invalidateCache('/faults');
    return api.put(`/faults/${id}`, data);
  },
  delete: (id) => {
    invalidateCache('/faults');
    return api.delete(`/faults/${id}`);
  },
};

export default api;
