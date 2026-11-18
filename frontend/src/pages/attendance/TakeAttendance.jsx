import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Users,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  Calendar,
  Layers,
  Building2,
  GraduationCap,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';

export const TakeAttendance = () => {
  const {
    user,
    branches: authBranches = [],
    selectedBranch: authSelectedBranch,
    academicYears: authYears = [],
    selectedAcademicYear: authSelectedAY,
  } = useAuth();

  // Filters state
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Loaded attendance state
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({}); // { [studentId]: 'present' | 'absent' | 'late' }
  const [timingConfig, setTimingConfig] = useState(null);
  const [currentSession, setCurrentSession] = useState('session1'); // 'session1' | 'session2'
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Toast & Modal state
  const [toastMessage, setToastMessage] = useState(null);
  const [unmarkedModalOpen, setUnmarkedModalOpen] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api
          .get('/branches')
          .catch(() => api.get('/settings/branches'));
        const list = res.branches || res.data || (Array.isArray(res) ? res : []);
        setBranches(list);

        if (authSelectedBranch && authSelectedBranch.id !== 'all') {
          setSelectedBranchId(String(authSelectedBranch.id));
        } else if (list.length > 0 && !selectedBranchId) {
          const userBranch = list.find((b) => Number(b.id) === Number(user?.branch_id));
          setSelectedBranchId(String(userBranch ? userBranch.id : list[0].id));
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, [authSelectedBranch, user]);

  // Load academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const res = await api
          .get('/settings/academic-years')
          .catch(() => api.get('/academic-years'));
        const list = res.academicYears || res.data || (Array.isArray(res) ? res : []);
        setAcademicYears(list);

        if (authSelectedAY) {
          setSelectedYearId(String(authSelectedAY.id));
        } else if (list.length > 0 && !selectedYearId) {
          const activeYear = list.find((y) => y.is_current) || list[0];
          setSelectedYearId(String(activeYear.id));
        }
      } catch (err) {
        console.error('Failed to load academic years:', err);
      }
    };
    fetchAcademicYears();
  }, [authSelectedAY]);

  // Fetch classes when branch changes
  useEffect(() => {
    if (!selectedBranchId) {
      setClasses([]);
      setSelectedClassId('');
      setSections([]);
      setSelectedSectionId('');
      setAttendanceLoaded(false);
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await api
          .get(`/academics/classes?branch_id=${selectedBranchId}`)
          .catch(() => api.get(`/classes?branch_id=${selectedBranchId}`));
        const list = res.classes || res.data || (Array.isArray(res) ? res : []);
        setClasses(list);
        setSelectedClassId((prev) => (list.some((c) => String(c.id) === String(prev)) ? prev : ''));
        setAttendanceLoaded(false);
      } catch (err) {
        console.error('Failed to load classes:', err);
        setClasses([]);
      }
    };
    fetchClasses();
  }, [selectedBranchId]);

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedBranchId || !selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      setAttendanceLoaded(false);
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await api
          .get(`/academics/sections?branch_id=${selectedBranchId}&class_id=${selectedClassId}`)
          .catch(() => api.get(`/sections?class_id=${selectedClassId}`));
        const list = res.sections || res.data || (Array.isArray(res) ? res : []);
        setSections(list);
        setSelectedSectionId((prev) => (list.some((s) => String(s.id) === String(prev)) ? prev : ''));
        setAttendanceLoaded(false);
      } catch (err) {
        console.error('Failed to load sections:', err);
        setSections([]);
      }
    };
    fetchSections();
  }, [selectedBranchId, selectedClassId]);

  // Check attendance for a given session
  const checkAttendanceForSession = useCallback(
    async (sessionToInspect) => {
      if (!selectedBranchId || !selectedYearId || !selectedClassId || !selectedSectionId || !selectedDate) {
        return;
      }
      try {
        const checkRes = await api.get(
          `/attendance/check?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}&class_id=${selectedClassId}&section_id=${selectedSectionId}&attendance_date=${selectedDate}&session=${sessionToInspect}`
        );

        if (checkRes?.marked && Array.isArray(checkRes?.records)) {
          setIsAlreadyMarked(true);
          const initialMap = {};
          checkRes.records.forEach((rec) => {
            if (rec.student_id && rec.status) {
              initialMap[rec.student_id] = rec.status;
            }
          });
          setStudentStatuses(initialMap);
        } else {
          setIsAlreadyMarked(false);
          setStudentStatuses({});
        }
      } catch (err) {
        console.error('Failed to check attendance records:', err);
        setIsAlreadyMarked(false);
        setStudentStatuses({});
      }
    },
    [selectedBranchId, selectedYearId, selectedClassId, selectedSectionId, selectedDate]
  );

  // Load Attendance Handler
  const handleLoadAttendance = async () => {
    if (!selectedBranchId || !selectedYearId || !selectedClassId || !selectedSectionId || !selectedDate) {
      return;
    }

    setLoading(true);
    setSearchTerm('');
    try {
      // 1. Session Detection & Timing Configuration
      let detectedTiming = null;
      let targetSession = 'session1';

      try {
        const timingRes = await api.get(
          `/attendance/session-detect?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}`
        );
        detectedTiming = timingRes?.timing || null;
        targetSession = timingRes?.suggested_session || 'session1';
      } catch (timingErr) {
        console.warn('Session detection failed or not configured:', timingErr);
      }

      setTimingConfig(detectedTiming);
      setCurrentSession(targetSession);

      // 2. Fetch Students for the selected class and section
      const studentQuery = new URLSearchParams({
        branch_id: selectedBranchId,
        academic_year_id: selectedYearId,
        class_id: selectedClassId,
        section_id: selectedSectionId,
        status: 'active',
      });

      let studentList = [];
      try {
        const studentRes = await api.get(`/students?${studentQuery.toString()}`);
        studentList = Array.isArray(studentRes)
          ? studentRes
          : studentRes.students || studentRes.data || [];
      } catch (stErr) {
        // Fallback without status filter if needed
        const fallbackRes = await api
          .get(
            `/students?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}&class_id=${selectedClassId}&section_id=${selectedSectionId}`
          )
          .catch(() => []);
        studentList = Array.isArray(fallbackRes)
          ? fallbackRes
          : fallbackRes.students || fallbackRes.data || [];
      }

      // Sort students by roll_no (numeric ascending, then alphanumeric)
      studentList.sort((a, b) => {
        const rollA = parseInt(a.roll_no, 10);
        const rollB = parseInt(b.roll_no, 10);
        if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
        if (a.roll_no && b.roll_no) return String(a.roll_no).localeCompare(String(b.roll_no));
        return String(a.student_name || '').localeCompare(String(b.student_name || ''));
      });

      setStudents(studentList);

      // 3. Check for existing attendance in this date & session
      const checkRes = await api.get(
        `/attendance/check?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}&class_id=${selectedClassId}&section_id=${selectedSectionId}&attendance_date=${selectedDate}&session=${targetSession}`
      );

      if (checkRes?.marked && Array.isArray(checkRes?.records) && checkRes.records.length > 0) {
        setIsAlreadyMarked(true);
        const map = {};
        checkRes.records.forEach((r) => {
          if (r.student_id && r.status) {
            map[r.student_id] = r.status;
          }
        });
        setStudentStatuses(map);
      } else {
        setIsAlreadyMarked(false);
        setStudentStatuses({});
      }

      setAttendanceLoaded(true);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      alert(err.message || 'Error loading attendance roster.');
    } finally {
      setLoading(false);
    }
  };

  // Switch between Session 1 and Session 2
  const handleSwitchSession = async (newSession) => {
    if (newSession === currentSession) return;
    setCurrentSession(newSession);
    await checkAttendanceForSession(newSession);
  };

  // Single student status toggle
  const handleSetStatus = (studentId, status) => {
    setStudentStatuses((prev) => {
      // Toggle off if already selected, or select new
      if (prev[studentId] === status) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return {
        ...prev,
        [studentId]: status,
      };
    });
  };

  // Mark all unset students as Present
  const handleMarkAllPresent = () => {
    setStudentStatuses((prev) => {
      const next = { ...prev };
      const hasUnset = students.some((s) => !next[s.id]);
      students.forEach((s) => {
        if (hasUnset) {
          if (!next[s.id]) next[s.id] = 'present';
        } else {
          next[s.id] = 'present';
        }
      });
      return next;
    });
  };

  // Summary statistics
  const summary = useMemo(() => {
    let p = 0;
    let a = 0;
    let l = 0;
    students.forEach((st) => {
      const s = studentStatuses[st.id];
      if (s === 'present') p++;
      else if (s === 'absent') a++;
      else if (s === 'late') l++;
    });
    const markedCount = p + a + l;
    const unmarkedCount = students.length - markedCount;
    return {
      p,
      a,
      l,
      markedCount,
      unmarkedCount,
      total: students.length,
    };
  }, [students, studentStatuses]);

  // Execute Save API Call
  const executeSave = async (statusesToSubmit) => {
    setSaving(true);
    try {
      const records = Object.entries(statusesToSubmit).map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
      }));

      if (records.length === 0) {
        alert('No attendance records to save.');
        setSaving(false);
        return;
      }

      const payload = {
        branch_id: Number(selectedBranchId),
        academic_year_id: Number(selectedYearId),
        class_id: Number(selectedClassId),
        section_id: Number(selectedSectionId),
        attendance_date: selectedDate,
        session: currentSession,
        timing_id: timingConfig?.id || null,
        records,
      };

      await api.post('/attendance/bulk-save', payload);

      setToastMessage(`Attendance saved! ${summary.p} Present · ${summary.a} Absent · ${summary.l} Late`);
      setIsAlreadyMarked(true);
      setUnmarkedModalOpen(false);
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Click Save Attendance
  const handleSaveAttendance = () => {
    if (students.length === 0) return;

    if (summary.unmarkedCount > 0) {
      setUnmarkedModalOpen(true);
      return;
    }

    executeSave(studentStatuses);
  };

  // Confirm unmarked as Absent & Save
  const handleMarkUnmarkedAbsentAndSave = () => {
    const updated = { ...studentStatuses };
    students.forEach((st) => {
      if (!updated[st.id]) {
        updated[st.id] = 'absent';
      }
    });
    setStudentStatuses(updated);
    executeSave(updated);
  };

  // Helper format time
  const formatTime = (t) => {
    if (!t) return '';
    const parts = String(t).split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  // Filter students for search
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase().trim();
    return students.filter(
      (st) =>
        (st.student_name && st.student_name.toLowerCase().includes(q)) ||
        (st.roll_no && String(st.roll_no).toLowerCase().includes(q)) ||
        (st.admission_no && String(st.admission_no).toLowerCase().includes(q))
    );
  }, [students, searchTerm]);

  const isFormComplete =
    Boolean(selectedBranchId) &&
    Boolean(selectedYearId) &&
    Boolean(selectedClassId) &&
    Boolean(selectedSectionId) &&
    Boolean(selectedDate);

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Take Student Attendance
            </h1>
            <p className="text-sm text-slate-500">
              Record daily classroom attendance by section and track real-time headcount
            </p>
          </div>
        </div>
      </div>

      {/* Top Filter Bar (Sticky, Card-Style) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xs transition-shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* 1. Branch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Campus / Branch <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setAttendanceLoaded(false);
              }}
              disabled={user?.role !== 'super_admin' && Boolean(user?.branch_id)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Academic Year Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value);
                setAttendanceLoaded(false);
              }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Year</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.year_name || ay.name || ay.code}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Class Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setAttendanceLoaded(false);
              }}
              disabled={!selectedBranchId}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Section Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Section <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setAttendanceLoaded(false);
              }}
              disabled={!selectedClassId}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setAttendanceLoaded(false);
              }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* 6. Primary Action: Load Attendance */}
          <div>
            <button
              type="button"
              onClick={handleLoadAttendance}
              disabled={!isFormComplete || loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Load Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {attendanceLoaded && (
        <div className="space-y-5 animate-fade-in">
          {/* Missing Timings Warning Card */}
          {!timingConfig && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 shadow-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No attendance timing configured for this branch and academic year.
                  </p>
                  <p className="text-xs text-amber-700">
                    Default timing windows and automated session detection will not apply.
                  </p>
                </div>
              </div>
              <Link
                to="/settings/attendance-timings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-100/70 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors w-fit"
              >
                <span>Configure Timings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Session Tabs (Rendered ONLY if timing config has session2_enabled = 1) */}
          {timingConfig && Boolean(timingConfig.session2_enabled) && (
            <div className="flex flex-col sm:flex-row items-center gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => handleSwitchSession('session1')}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  currentSession === 'session1'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Clock className="w-4 h-4 text-brand-600" />
                <span>
                  Session 1: {timingConfig.timing_name || 'Morning'}{' '}
                  {timingConfig.session1_start && timingConfig.session1_end && (
                    <span className="font-mono text-slate-500 font-normal">
                      ({formatTime(timingConfig.session1_start)} – {formatTime(timingConfig.session1_end)})
                    </span>
                  )}
                </span>
                {currentSession === 'session1' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchSession('session2')}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  currentSession === 'session2'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  Session 2: {timingConfig.session2_name || 'Afternoon Session'}{' '}
                  {timingConfig.session2_start && timingConfig.session2_end && (
                    <span className="font-mono text-slate-500 font-normal">
                      ({formatTime(timingConfig.session2_start)} – {formatTime(timingConfig.session2_end)})
                    </span>
                  )}
                </span>
                {currentSession === 'session2' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>
            </div>
          )}

          {/* Existing Attendance Notice Banner */}
          {isAlreadyMarked && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">Attendance already recorded for this session.</span>{' '}
                <span className="text-amber-800">You are editing existing records.</span>
              </div>
            </div>
          )}

          {/* Student Roster Header & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Enrolled Students</span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full font-mono">
                {students.length} Students
              </span>
            </div>

            {/* Quick in-page Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search by name or roll..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Student Attendance Grid */}
          {students.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">No students found</p>
              <p className="text-xs text-slate-400 mt-1">
                There are no active enrolled students found in this section.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-sm font-medium text-slate-600">No matching students found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredStudents.map((st) => {
                const currentStatus = studentStatuses[st.id] || null;

                return (
                  <div
                    key={st.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 sm:py-3.5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all gap-3"
                  >
                    {/* Left: Roll No badge + Student Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Roll No badge */}
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 font-mono shrink-0">
                        {st.roll_no ? `#${st.roll_no}` : '—'}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {st.student_name ? st.student_name.charAt(0).toUpperCase() : 'S'}
                      </div>

                      {/* Name & metadata */}
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {st.student_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                          <span>Adm: {st.admission_no || 'N/A'}</span>
                          {st.gender && <span className="capitalize">· {st.gender}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Three status pill buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Present Pill */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, 'present')}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white border border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                            : 'border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Present</span>
                      </button>

                      {/* Absent Pill */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, 'absent')}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white border border-rose-600 shadow-xs ring-2 ring-rose-600/20'
                            : 'border border-rose-300 text-rose-700 bg-white hover:bg-rose-50'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </button>

                      {/* Late Pill */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, 'late')}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white border border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                            : 'border border-amber-300 text-amber-700 bg-white hover:bg-amber-50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Late</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          {students.length > 0 && (
            <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Quick Action: Mark All Present */}
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark All Present</span>
              </button>

              {/* Headcount Live Summary */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 font-mono shadow-inner">
                <span className="text-slate-500">Summary:</span>
                <span className="text-emerald-700 font-bold">{summary.p}P</span>
                <span className="text-slate-300">·</span>
                <span className="text-rose-700 font-bold">{summary.a}A</span>
                <span className="text-slate-300">·</span>
                <span className="text-amber-700 font-bold">{summary.l}L</span>
                <span className="text-slate-500 font-normal">of {summary.total}</span>
                {summary.unmarkedCount > 0 && (
                  <span className="ml-1 text-amber-600 text-xs font-medium">
                    ({summary.unmarkedCount} unmarked)
                  </span>
                )}
              </div>

              {/* Save Attendance Button */}
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm shadow-brand-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Attendance...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Attendance</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Unmarked Students */}
      <Modal
        isOpen={unmarkedModalOpen}
        onClose={() => setUnmarkedModalOpen(false)}
        title="Unmarked Students Warning"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {summary.unmarkedCount} student{summary.unmarkedCount === 1 ? '' : 's'} still unmarked
              </p>
              <p className="text-amber-700 mt-1 leading-relaxed">
                Some students in this section do not have an attendance status selected. How would you like to proceed?
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleMarkUnmarkedAbsentAndSave}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <XCircle className="w-4 h-4" />
              <span>Mark Unmarked as Absent & Save</span>
            </button>

            <button
              type="button"
              onClick={() => executeSave(studentStatuses)}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Save Marked Only ({summary.markedCount} students)</span>
            </button>

            <button
              type="button"
              onClick={() => setUnmarkedModalOpen(false)}
              className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-700 text-center transition-colors"
            >
              Cancel & Review Roster
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification (Fixed bottom-right div, auto-dismisses after 3s) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl animate-fade-in border border-slate-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
export default TakeAttendance;