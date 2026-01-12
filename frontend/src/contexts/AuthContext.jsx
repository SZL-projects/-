import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // בדיקה אם יש משתמש מחובר (גם ב-localStorage וגם ב-sessionStorage)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (token && savedUser && savedUser !== 'undefined') {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        // ניקוי localStorage/sessionStorage אם יש בעיה
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

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

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
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
