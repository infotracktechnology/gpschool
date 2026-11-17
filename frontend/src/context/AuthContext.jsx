import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('school_erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(() => {
    const saved = localStorage.getItem('school_erp_selected_ay');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchAcademicYears = useCallback(async () => {
    const token = localStorage.getItem('school_erp_token');
    if (!token) return;

    try {
      const data = await api.get('/settings/academic-years');
      const years = data.academicYears || [];
      setAcademicYears(years);

      // Initialize selected year if not already set or invalid
      setSelectedAcademicYear((prev) => {
        if (prev && years.some((y) => y.id === prev.id)) {
          return prev;
        }
        // Priority: institution default year (is_current), or first year
        const defaultYear = years.find((y) => y.is_current) || years[0] || null;
        if (defaultYear) {
          localStorage.setItem('school_erp_selected_ay', JSON.stringify(defaultYear));
        }
        return defaultYear;
      });
    } catch (err) {
      console.error('Failed to fetch academic years in AuthContext:', err);
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('school_erp_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      localStorage.setItem('school_erp_user', JSON.stringify(data.user));

      await fetchAcademicYears();
    } catch (err) {
      console.error('Failed to restore session:', err);
      setUser(null);
      localStorage.removeItem('school_erp_token');
      localStorage.removeItem('school_erp_user');
      localStorage.removeItem('school_erp_selected_ay');
    } finally {
      setLoading(false);
    }
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('school_erp_token', data.token);
    localStorage.setItem('school_erp_user', JSON.stringify(data.user));
    setUser(data.user);

    if (data.user?.current_academic_year) {
      setSelectedAcademicYear(data.user.current_academic_year);
      localStorage.setItem(
        'school_erp_selected_ay',
        JSON.stringify(data.user.current_academic_year)
      );
    }

    await fetchAcademicYears();
    return data;
  };

  const changeAcademicYear = (year) => {
    setSelectedAcademicYear(year);
    if (year) {
      localStorage.setItem('school_erp_selected_ay', JSON.stringify(year));
    } else {
      localStorage.removeItem('school_erp_selected_ay');
    }
  };

  const logout = () => {
    localStorage.removeItem('school_erp_token');
    localStorage.removeItem('school_erp_user');
    localStorage.removeItem('school_erp_selected_ay');
    setUser(null);
    setSelectedAcademicYear(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
    await fetchAcademicYears();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        academicYears,
        selectedAcademicYear,
        changeAcademicYear,
        fetchAcademicYears,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
