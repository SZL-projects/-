import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { authAPI, permissionsAPI, setLogoutCallback } from '../services/api';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState(null);
  const location = useLocation();

  // רענון מידע משתמש מהשרת (תפקידים עדכניים)
  const refreshUserFromServer = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      const updatedUser = response.data.user;
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      // אם ה-token לא תקין או המשתמש לא פעיל - נתק
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        setUserPermissions(null);
      }
    }
  }, []);

  useEffect(() => {
    // בדיקה אם יש משתמש מחובר (גם ב-localStorage וגם ב-sessionStorage)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (token && savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // רענן מהשרת ורק אז הצג את הדף - כדי למנוע הצגת נתונים ישנים
        refreshUserFromServer().finally(() => setLoading(false));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials, rememberMe = false) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;

      // אם "זכור אותי" מסומן - שמור ב-localStorage (קבוע)
      // אחרת - שמור ב-sessionStorage (עד סגירת הדפדפן)
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem('token', token);
      storage.setItem('user', JSON.stringify(userData));

      // ניקוי מהאחסון השני (במקרה שיש)
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('token');
      otherStorage.removeItem('user');

      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);

      let message = 'שגיאה בהתחברות';

      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'שגיאת רשת - השרת לא זמין';
      } else if (error.code === 'ERR_CONNECTION_REFUSED') {
        message = 'לא ניתן להתחבר לשרת';
      } else if (error.response) {
        message = error.response.data?.message || `שגיאה: ${error.response.status}`;
      }

      return {
        success: false,
        message
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'שגיאה ברישום'
      };
    }
  };

  // טעינת הרשאות המשתמש
  const loadPermissions = async () => {
    try {
      const response = await permissionsAPI.getMy();
      setUserPermissions(response.data.permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // טעינת הרשאות כאשר המשתמש מתחבר
  useEffect(() => {
    if (user) {
      loadPermissions();
    } else {
      setUserPermissions(null);
    }
  }, [user?.id]);

  // רענון הרשאות ומידע משתמש בעת ניווט בין מסכים
  useEffect(() => {
    if (user) {
      refreshUserFromServer();
      loadPermissions();
    }
  }, [location.pathname]);

  // האזנה ל-Firestore - ריענון הרשאות מיידי כשמנהל משנה אותן
  useEffect(() => {
    if (!user) return;

    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const levelPriority = { none: 0, self: 1, view: 2, edit: 3 };
    const entities = ['riders','vehicles','tasks','faults','monthly_checks','maintenance','garages','insurance_claims','users','reports','settings','audit_logs','donations'];

    const permissionsDoc = doc(db, 'permissions', 'default');
    const unsubscribe = onSnapshot(
      permissionsDoc,
      () => {
        // כשמשהו משתנה (הרשאות תפקיד או תפקיד משתמש) - טען נתונים עדכניים מהשרת
        refreshUserFromServer().then(() => loadPermissions());
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error.code, error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setUserPermissions(null);
  }, []);

  // חיבור logout ל-axios interceptor (בלי רענון דף מלא)
  useEffect(() => {
    setLogoutCallback(logout);
  }, [logout]);

  // פונקציה לבדיקה אם למשתמש יש תפקיד מסוים
  const hasRole = (role) => {
    if (!user) return false;
    // תמיכה גם ב-role בודד וגם ב-roles מערך
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    return userRoles.includes(role);
  };

  // פונקציה לבדיקה אם למשתמש יש לפחות אחד מהתפקידים
  const hasAnyRole = (rolesArray) => {
    if (!user) return false;
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    return rolesArray.some(role => userRoles.includes(role));
  };

  // בדיקת הרשאה לישות מסוימת
  // entity: 'riders', 'vehicles', 'tasks'...
  // requiredLevel: 'view', 'edit'
  const hasPermission = (entity, requiredLevel = 'view') => {
    if (!user) return false;
    // super_admin תמיד מקבל הכל
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (userRoles.includes('super_admin')) return true;

    if (!userPermissions) return false;
    const level = userPermissions[entity];
    if (!level || level === 'none') return false;

    const levelPriority = { none: 0, self: 1, view: 2, edit: 3 };
    return (levelPriority[level] || 0) >= (levelPriority[requiredLevel] || 0);
  };

  // קבלת רמת הגישה לישות
  const getPermissionLevel = (entity) => {
    if (!user) return 'none';
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (userRoles.includes('super_admin')) return 'edit';
    if (!userPermissions) return 'none';
    return userPermissions[entity] || 'none';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    hasPermission,
    getPermissionLevel,
    userPermissions,
    refreshPermissions: loadPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
