import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  GraduationCap,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  RefreshCw,
  ClipboardX,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Formats "YYYY-MM-DD" or ISO string to "18 Nov 2026"
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = String(d).padStart(2, '0');
  const month = months[m - 1] || '';
  return `${day} ${month} ${y}`;
};

/**
 * Derives day of week from date string (e.g. "Wednesday")
 */
const getDayOfWeek = (dateStr) => {
  if (!dateStr) return '—';
  const cleanStr = String(dateStr).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return '—';
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return '—';

  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
};

/**
 * Maps session key to friendly name: session1 -> Morning, session2 -> Afternoon
 */
const formatSession = (session) => {
  if (!session) return 'Morning';
  const lower = String(session).toLowerCase();
  if (lower === 'session1') return 'Morning';
  if (lower === 'session2') return 'Afternoon';
  return session.charAt(0).toUpperCase() + session.slice(1);
};

export const AttendanceHistory = () => {
  const auth = useAuth() || {};

  // ─── Lookups State ─────────────────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState([]);
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // ─── Filter Bar State ──────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    // Default to first day of current month
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    // Default to today
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedSession, setSelectedSession] = useState('');

  // ─── Table Data & Actions State ────────────────────────────────────────────
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [quickSearch, setQuickSearch] = useState('');

  // ─── Sorting State ─────────────────────────────────────────────────────────
  // Default sort: Date descending
  const [sortField, setSortField] = useState('date'); // 'date' | 'name' | 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // ─── Pagination State ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // ─── Load Lookups on Mount ─────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const loadLookups = async () => {
      setLookupsLoading(true);
      try {
        const [yearsRes, branchRes, classRes] = await Promise.allSettled([
          api.get('/academic-years').catch(() => api.get('/settings/academic-years')),
          api.get('/branches').catch(() => api.get('/settings/branches')),
          api.get('/classes').catch(() => api.get('/academics/classes')),
        ]);

        if (!isMounted) return;

        // Academic Years
        if (yearsRes.status === 'fulfilled' && yearsRes.value) {
          const yData = yearsRes.value;
          const yList = yData.academicYears || yData.academic_years || yData.data || (Array.isArray(yData) ? yData : []);
          setAcademicYears(yList);
          const activeYear = yList.find((y) => y.is_current || y.status === 'active') || yList[0];
          if (activeYear) {
            setSelectedYear(String(activeYear.id));
          }
        }

        // Branches
        if (branchRes.status === 'fulfilled' && branchRes.value) {
          const bData = branchRes.value;
          const bList = bData.branches || bData.data || (Array.isArray(bData) ? bData : []);
          setBranches(bList);
          // Default to user branch or first branch
          const defaultBranchId =
            auth.selectedBranch && auth.selectedBranch.id !== 'all'
              ? String(auth.selectedBranch.id)
              : auth.user?.branch_id
              ? String(auth.user.branch_id)
              : bList[0]?.id
              ? String(bList[0].id)
              : '';
          if (defaultBranchId) {
            setSelectedBranch(defaultBranchId);
          }
        }

        // Classes
        if (classRes.status === 'fulfilled' && classRes.value) {
          const cData = classRes.value;
          const cList = cData.classes || cData.data || (Array.isArray(cData) ? cData : []);
          setClasses(cList);
        }
      } catch (err) {
        console.error('Failed to load filter lookups:', err);
      } finally {
        if (isMounted) setLookupsLoading(false);
      }
    };

    loadLookups();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Fetch Sections when selectedClass changes ──────────────────────────────
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }

    let isMounted = true;
    const fetchSections = async () => {
      try {
        const query = selectedBranch ? `?class_id=${selectedClass}&branch_id=${selectedBranch}` : `?class_id=${selectedClass}`;
        const res = await api
          .get(`/sections${query}`)
          .catch(() => api.get(`/academics/sections${query}`));

        if (!isMounted) return;
        const list = res.sections || res.data || (Array.isArray(res) ? res : []);
        setSections(list);
      } catch (err) {
        console.error('Failed to load sections for class:', err);
        if (isMounted) setSections([]);
      }
    };

    fetchSections();
    setSelectedSection('');

    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedBranch]);

  // ─── Fetch Attendance History ──────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (selectedBranch) params.append('branch_id', selectedBranch);
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedSection) params.append('section_id', selectedSection);
      if (fromDate) params.append('date_from', fromDate);
      if (toDate) params.append('date_to', toDate);
      if (selectedSession) params.append('session', selectedSession);

      const res = await api.get(`/attendance?${params.toString()}`);
      const data = Array.isArray(res) ? res : res.data || res.attendance || [];
      setRecords(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
      setRecords([]);
      setErrorMessage(err.message || 'Failed to load attendance records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranch,
    selectedYear,
    selectedClass,
    selectedSection,
    fromDate,
    toDate,
    selectedSession,
  ]);

  // Auto-fetch on initial load once lookups are ready
  useEffect(() => {
    if (!lookupsLoading) {
      fetchAttendance();
    }
  }, [lookupsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filter & Sort Processing ──────────────────────────────────────────────
  const processedRecords = useMemo(() => {
    let result = [...records];

    // Quick search filter (student name or roll number)
    if (quickSearch.trim()) {
      const q = quickSearch.trim().toLowerCase();
      result = result.filter(
        (rec) =>
          (rec.student_name && rec.student_name.toLowerCase().includes(q)) ||
          (rec.roll_no && String(rec.roll_no).toLowerCase().includes(q)) ||
          (rec.marked_by_name && rec.marked_by_name.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = a.attendance_date || '';
        const dateB = b.attendance_date || '';
        comparison = dateA.localeCompare(dateB);
        if (comparison === 0) {
          // tie breaker by roll_no
          const rollA = a.roll_no || '';
          const rollB = b.roll_no || '';
          comparison = String(rollA).localeCompare(String(rollB), undefined, { numeric: true });
        }
      } else if (sortField === 'name') {
        const nameA = a.student_name || '';
        const nameB = b.student_name || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'status') {
        const statusA = a.status || '';
        const statusB = b.status || '';
        comparison = statusA.localeCompare(statusB);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [records, quickSearch, sortField, sortOrder]);

  // ─── Pagination Calculations ───────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedRecords.slice(startIndex, startIndex + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // ─── Stats Summary ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    records.forEach((r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'present') present++;
      else if (s === 'absent') absent++;
      else if (s === 'late') late++;
    });
    return {
      total: records.length,
      present,
      absent,
      late,
      presentPct: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
    };
  }, [records]);

  // ─── CSV Export Functionality ──────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all records with current filter params without client pagination
      const params = new URLSearchParams();
      if (selectedBranch) params.append('branch_id', selectedBranch);
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedSection) params.append('section_id', selectedSection);
      if (fromDate) params.append('date_from', fromDate);
      if (toDate) params.append('date_to', toDate);
      if (selectedSession) params.append('session', selectedSession);

      const res = await api.get(`/attendance?${params.toString()}`);
      const allRecords = Array.isArray(res) ? res : res.data || res.attendance || [];

      if (allRecords.length === 0) {
        alert('No records available to export for the current filters.');
        setExporting(false);
        return;
      }

      // Prepare CSV Columns: Roll, Student Name, Date, Day, Session, Status, Marked By
      const headers = ['Roll', 'Student Name', 'Date', 'Day', 'Session', 'Status', 'Marked By'];
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = allRecords.map((rec) => [
        escapeCSV(rec.roll_no || ''),
        escapeCSV(rec.student_name || ''),
        escapeCSV(formatDate(rec.attendance_date)),
        escapeCSV(getDayOfWeek(rec.attendance_date)),
        escapeCSV(formatSession(rec.session)),
        escapeCSV(rec.status ? rec.status.charAt(0).toUpperCase() + rec.status.slice(1) : ''),
        escapeCSV(rec.marked_by_name || 'System / Auto'),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateSuffix = fromDate && toDate ? `_${fromDate}_to_${toDate}` : `_${new Date().toISOString().slice(0, 10)}`;
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_History${dateSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export attendance records. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Status Badge Renderer ─────────────────────────────────────────────────
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Present</span>
        </span>
      );
    }
    if (s === 'absent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Absent</span>
        </span>
      );
    }
    if (s === 'late') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Late</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
        {status || '—'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-xs">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance History</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Audit and inspect detailed daily and session-wise student attendance logs
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <span>Total:</span>
            <span className="font-bold font-mono">{stats.total}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Present:</span>
            <span className="font-bold font-mono">{stats.present}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <UserX className="w-3.5 h-3.5 text-rose-600" />
            <span>Absent:</span>
            <span className="font-bold font-mono">{stats.absent}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Late:</span>
            <span className="font-bold font-mono">{stats.late}</span>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filter Bar Card ─────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-border shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Academic Year
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.year_name || ay.name || ay.code || `AY-${ay.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Branch */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Branch / Campus
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Class */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Class
            </label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.class_name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Section
            </label>
            <div className="relative">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name || sec.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. From Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* 6. To Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Buttons Row & Optional Session Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Session:</span>
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSession('')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedSession === ''
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('session1')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedSession === 'session1'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Morning
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('session2')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedSession === 'session2'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Afternoon
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 7. Apply Filters Button (Primary) */}
            <button
              type="button"
              onClick={fetchAttendance}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Filter className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Apply Filters</span>
            </button>

            {/* 8. Export CSV Button (Secondary, outline with Download icon) */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || loading || records.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              title="Download full results as CSV"
            >
              <Download className={`w-4 h-4 text-slate-500 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Results Table Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Table Subheader with Quick Search & Refresh */}
        <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Attendance Records</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
              {processedRecords.length} {processedRecords.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick in-table search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search student or roll..."
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 sm:w-64 text-xs rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={fetchAttendance}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Roll</th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Session</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-slate-700">
              {loading ? (
                // ── Loading Skeleton State ──
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-7 h-7 animate-spin text-brand-600" />
                      <span className="text-sm font-medium text-slate-600">
                        Retrieving attendance logs...
                      </span>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Querying date range and class session records
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                // ── Empty State ──
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        <ClipboardX className="w-7 h-7 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        No attendance records found
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        No attendance records found. Try adjusting your filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // ── Data Rows ──
                paginatedRecords.map((record) => {
                  const dayName = getDayOfWeek(record.attendance_date);
                  const sessionLabel = formatSession(record.session);
                  const dateFormatted = formatDate(record.attendance_date);

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Roll */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {record.roll_no || '—'}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {record.student_name ? record.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <span className="font-semibold text-slate-900">
                            {record.student_name}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      {/* Day of Week */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-medium text-[11px] text-slate-700">
                          {dayName}
                        </span>
                      </td>

                      {/* Session */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            sessionLabel === 'Morning'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {sessionLabel}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(record.status)}
                      </td>

                      {/* Marked By */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {record.marked_by_name || 'System / Auto'}
                          </span>
                          {record.timing_name && (
                            <span className="text-[10px] text-slate-400">
                              {record.timing_name}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Pagination ───────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
          <div>
            {processedRecords.length > 0 ? (
              <span>
                Showing{' '}
                <strong className="text-slate-900">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {Math.min(currentPage * pageSize, processedRecords.length)}
                </strong>{' '}
                of <strong className="text-slate-900">{processedRecords.length}</strong> records
              </span>
            ) : (
              <span>0 records</span>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
