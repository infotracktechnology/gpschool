import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const ALL_CAMPUSES_BRANCH = { id: 'all', name: 'All Campuses' };

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
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const saved =
        localStorage.getItem('school_erp_selected_branch') ||
        localStorage['school_erp_selected_branch'];
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Cascading Academic Hierarchy: Classes & Sections
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  const fetchBranches = useCallback(async (overrideUser) => {
    const token = localStorage.getItem('school_erp_token');
    if (!token) return;

    try {
      const data = await api.get('/settings/branches');
      const branchList = data.branches || [];
      setBranches(branchList);

      const activeUser =
        overrideUser ||
        userRef.current ||
        (localStorage.getItem('school_erp_user')
          ? JSON.parse(localStorage.getItem('school_erp_user'))
          : null);

      const isSuperAdmin = activeUser?.role === 'super_admin';
      const isBranchRestricted = Boolean(activeUser?.branch_id && !isSuperAdmin);

      if (isBranchRestricted) {
        // If user is branch-restricted, set selectedBranch to their branch object and lock it
        const userBranch =
          branchList.find((b) => Number(b.id) === Number(activeUser.branch_id)) || {
            id: activeUser.branch_id,
            name: activeUser.branch_name || 'My Campus',
          };
        setSelectedBranch(userBranch);
        localStorage.setItem('school_erp_selected_branch', JSON.stringify(userBranch));
      } else if (isSuperAdmin) {
        // If user is super_admin: allow selecting any branch or { id: 'all', name: 'All Campuses' }.
        // Auto-default to first branch if not already set.
        setSelectedBranch((prev) => {
          if (prev?.id === 'all') {
            return prev;
          }
          if (prev?.id && branchList.some((b) => b.id === prev.id)) {
            const updated = branchList.find((b) => b.id === prev.id);
            localStorage.setItem('school_erp_selected_branch', JSON.stringify(updated));
            return updated;
          }
          const defaultBranch = branchList[0] || ALL_CAMPUSES_BRANCH;
          if (defaultBranch) {
            localStorage.setItem('school_erp_selected_branch', JSON.stringify(defaultBranch));
          }
          return defaultBranch;
        });
      } else {
        // Fallback for any other user role
        if (activeUser?.branch_id) {
          const userBranch =
            branchList.find((b) => Number(b.id) === Number(activeUser.branch_id)) || {
              id: activeUser.branch_id,
              name: activeUser.branch_name || 'My Campus',
            };
          setSelectedBranch(userBranch);
          localStorage.setItem('school_erp_selected_branch', JSON.stringify(userBranch));
        } else {
          setSelectedBranch((prev) => {
            if (prev) return prev;
            const defaultBranch = branchList[0] || ALL_CAMPUSES_BRANCH;
            if (defaultBranch) {
              localStorage.setItem('school_erp_selected_branch', JSON.stringify(defaultBranch));
            }
            return defaultBranch;
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches in AuthContext:', err);
    }
  }, []);

  const changeBranch = useCallback((branch) => {
    const currentUser = userRef.current;
    if (currentUser?.branch_id && currentUser?.role !== 'super_admin') {
      return;
    }

    let target = null;
    if (branch === 'all' || branch?.id === 'all') {
      target = ALL_CAMPUSES_BRANCH;
    } else if (typeof branch === 'object' && branch !== null) {
      target = branch;
    } else if (typeof branch === 'number' || typeof branch === 'string') {
      target = branches.find((b) => String(b.id) === String(branch)) || null;
    }

    setSelectedBranch(target);
    if (target) {
      localStorage.setItem('school_erp_selected_branch', JSON.stringify(target));
    } else {
      localStorage.removeItem('school_erp_selected_branch');
    }
  }, [branches]);

  // Load classes whenever selectedBranch changes
  const fetchClassesForBranch = useCallback(async (branchId) => {
    try {
      const url =
        branchId && branchId !== 'all'
          ? `/academics/classes?branch_id=${branchId}`
          : '/academics/classes';
      const res = await api.get(url);
      const list = res.classes || res.data || [];
      setClasses(list);
      return list;
    } catch (err) {
      console.error('Failed to load classes in AuthContext cascade:', err);
      setClasses([]);
      return [];
    }
  }, []);

  // Load sections whenever selectedClass and selectedBranch change
  const fetchSectionsForClass = useCallback(async (classId, branchId) => {
    if (!classId) {
      setSections([]);
      return [];
    }
    try {
      const bId = branchId && branchId !== 'all' ? branchId : '';
      const url = bId
        ? `/academics/sections?branch_id=${bId}&class_id=${classId}`
        : `/academics/sections?class_id=${classId}`;
      const res = await api.get(url);
      const list = res.sections || res.data || [];
      setSections(list);
      return list;
    } catch (err) {
      console.error('Failed to load sections in AuthContext cascade:', err);
      setSections([]);
      return [];
    }
  }, []);

  // Cascade 1: When selectedBranch changes -> refresh classes and reset class & section
  useEffect(() => {
    if (selectedBranch) {
      fetchClassesForBranch(selectedBranch.id);
    } else {
      setClasses([]);
    }
    setSelectedClass(null);
    setSelectedSection(null);
    setSections([]);
  }, [selectedBranch, fetchClassesForBranch]);

  // Cascade 2: When selectedClass changes -> refresh sections and reset section
  useEffect(() => {
    if (selectedClass) {
      fetchSectionsForClass(selectedClass.id, selectedBranch?.id);
    } else {
      setSections([]);
    }
    setSelectedSection(null);
  }, [selectedClass, selectedBranch, fetchSectionsForClass]);

  const changeClass = useCallback((cls) => {
    if (!cls) {
      setSelectedClass(null);
      return;
    }
    if (typeof cls === 'object') {
      setSelectedClass(cls);
    } else {
      const found = classes.find((c) => String(c.id) === String(cls)) || null;
      setSelectedClass(found || (cls ? { id: cls, name: `Class ${cls}` } : null));
    }
  }, [classes]);

  const changeSection = useCallback((sec) => {
    if (!sec) {
      setSelectedSection(null);
      return;
    }
    if (typeof sec === 'object') {
      setSelectedSection(sec);
    } else {
      const found = sections.find((s) => String(s.id) === String(sec)) || null;
      setSelectedSection(found || (sec ? { id: sec, name: `Section ${sec}` } : null));
    }
  }, [sections]);

  const setSelectedClassId = useCallback((id) => {
    changeClass(id ? String(id) : null);
  }, [changeClass]);

  const setSelectedSectionId = useCallback((id) => {
    changeSection(id ? String(id) : null);
  }, [changeSection]);

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
      userRef.current = data.user;
      localStorage.setItem('school_erp_user', JSON.stringify(data.user));

      await Promise.all([
        fetchAcademicYears(),
        fetchBranches(data.user),
      ]);
    } catch (err) {
      console.error('Failed to restore session:', err);
      setUser(null);
      localStorage.removeItem('school_erp_token');
      localStorage.removeItem('school_erp_user');
      localStorage.removeItem('school_erp_selected_ay');
      localStorage.removeItem('school_erp_selected_branch');
    } finally {
      setLoading(false);
    }
  }, [fetchAcademicYears, fetchBranches]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('school_erp_token', data.token);
    localStorage.setItem('school_erp_user', JSON.stringify(data.user));
    setUser(data.user);
    userRef.current = data.user;

    if (data.user?.current_academic_year) {
      setSelectedAcademicYear(data.user.current_academic_year);
      localStorage.setItem(
        'school_erp_selected_ay',
        JSON.stringify(data.user.current_academic_year)
      );
    }

    await Promise.all([
      fetchAcademicYears(),
      fetchBranches(data.user),
    ]);
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
    localStorage.removeItem('school_erp_selected_branch');
    setUser(null);
    setSelectedAcademicYear(null);
    setSelectedBranch(null);
    setSelectedClass(null);
    setSelectedSection(null);
    setBranches([]);
    setClasses([]);
    setSections([]);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
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
        branches,
        selectedBranch,
        changeBranch,
        fetchBranches,
        // Academic Hierarchy Cascade: Classes & Sections
        classes,
        selectedClass,
        selectedClassId: selectedClass?.id ? String(selectedClass.id) : '',
        changeClass,
        setSelectedClassId,
        fetchClassesForBranch,
        sections,
        selectedSection,
        selectedSectionId: selectedSection?.id ? String(selectedSection.id) : '',
        changeSection,
        setSelectedSectionId,
        fetchSectionsForClass,
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
