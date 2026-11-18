import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Helper: Format "YYYY-MM" -> "November 2026"
const formatMonthYear = (monthStr) => {
  if (!monthStr) return '';
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
};

// Percentage pill styling based on value
const getPercentageBadgeClasses = (pct) => {
  const num = Number(pct) || 0;
  if (num >= 75) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (num >= 60) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

export const MonthlyAttendanceReport = () => {
  const {
    branches: authBranches = [],
    selectedBranch: authSelectedBranch,
    academicYears: authAcademicYears = [],
    selectedAcademicYear: authSelectedYear,
  } = useAuth() || {};

  // Filters State
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Default month: Current year-month (e.g. "2026-11")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Report Data State
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch initial branches and academic years
  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        let bList = [];
        try {
          const res = await api.get('/branches');
          bList = res.branches || res.data || (Array.isArray(res) ? res : []);
        } catch {
          const res = await api.get('/settings/branches');
          bList = res.branches || res.data || (Array.isArray(res) ? res : []);
        }

        let yList = [];
        try {
          const res = await api.get('/academic-years');
          yList = res.academicYears || res.data || (Array.isArray(res) ? res : []);
        } catch {
          const res = await api.get('/settings/academic-years');
          yList = res.academicYears || res.data || (Array.isArray(res) ? res : []);
        }

        if (!isMounted) return;

        const effectiveBranches = bList.length > 0 ? bList : authBranches;
        const effectiveYears = yList.length > 0 ? yList : authAcademicYears;

        setBranches(effectiveBranches);
        setAcademicYears(effectiveYears);

        // Auto-select initial branch
        if (effectiveBranches.length > 0) {
          const initialBranch =
            authSelectedBranch && authSelectedBranch.id !== 'all'
              ? String(authSelectedBranch.id)
              : String(effectiveBranches[0].id);
          setSelectedBranchId(initialBranch);
        }

        // Auto-select initial academic year
        if (effectiveYears.length > 0) {
          const activeYear =
            effectiveYears.find((y) => y.is_current || y.status === 'active') ||
            (authSelectedYear ? authSelectedYear : effectiveYears[0]);
          setSelectedAcademicYearId(String(activeYear.id));
        }
      } catch (err) {
        console.error('Failed to load branches/years lookups:', err);
      }
    };

    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, [authBranches, authAcademicYears, authSelectedBranch, authSelectedYear]);

  // 2. Fetch classes whenever branch changes
  useEffect(() => {
    let isMounted = true;
    const fetchClasses = async () => {
      if (!selectedBranchId) {
        setClasses([]);
        setSelectedClassId('');
        return;
      }
      try {
        let cList = [];
        try {
          const res = await api.get(`/classes?branch_id=${selectedBranchId}`);
          cList = res.classes || res.data || (Array.isArray(res) ? res : []);
        } catch {
          const res = await api.get(`/academics/classes?branch_id=${selectedBranchId}`);
          cList = res.classes || res.data || (Array.isArray(res) ? res : []);
        }

        if (!isMounted) return;
        setClasses(cList);
        if (cList.length > 0) {
          setSelectedClassId(String(cList[0].id));
        } else {
          setSelectedClassId('');
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
        if (isMounted) setClasses([]);
      }
    };

    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, [selectedBranchId]);

  // 3. Fetch sections whenever class changes
  useEffect(() => {
    let isMounted = true;
    const fetchSections = async () => {
      if (!selectedClassId) {
        setSections([]);
        setSelectedSectionId('');
        return;
      }
      try {
        let sList = [];
        try {
          const res = await api.get(
            `/sections?class_id=${selectedClassId}${
              selectedBranchId ? `&branch_id=${selectedBranchId}` : ''
            }`
          );
          sList = res.sections || res.data || (Array.isArray(res) ? res : []);
        } catch {
          const res = await api.get(
            `/academics/sections?class_id=${selectedClassId}${
              selectedBranchId ? `&branch_id=${selectedBranchId}` : ''
            }`
          );
          sList = res.sections || res.data || (Array.isArray(res) ? res : []);
        }

        if (!isMounted) return;
        setSections(sList);
        if (sList.length > 0) {
          setSelectedSectionId(String(sList[0].id));
        } else {
          setSelectedSectionId('');
        }
      } catch (err) {
        console.error('Failed to load sections:', err);
        if (isMounted) setSections([]);
      }
    };

    fetchSections();
    return () => {
      isMounted = false;
    };
  }, [selectedClassId, selectedBranchId]);

  // 4. Generate report handler
  const handleGenerateReport = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedMonth) {
      setError('Please select Class, Section, and Month to generate the report.');
      return;
    }

    setError(null);
    setLoading(true);
    setHasGenerated(true);

    try {
      const [yr, mo] = selectedMonth.split('-');
      const params = new URLSearchParams();
      params.append('class_id', selectedClassId);
      params.append('section_id', selectedSectionId);
      params.append('year', parseInt(yr, 10));
      params.append('month', parseInt(mo, 10));

      if (selectedBranchId) params.append('branch_id', selectedBranchId);
      if (selectedAcademicYearId) params.append('academic_year_id', selectedAcademicYearId);

      const res = await api.get(`/attendance/monthly-report?${params.toString()}`);
      const list = res.data || res.records || [];
      setReportData(list);
      setSummary(res.summary || null);

      const currClass = classes.find((c) => String(c.id) === String(selectedClassId));
      const currSection = sections.find((s) => String(s.id) === String(selectedSectionId));
      const currBranch = branches.find((b) => String(b.id) === String(selectedBranchId));
      const currYear = academicYears.find((y) => String(y.id) === String(selectedAcademicYearId));

      setReportMeta({
        className: currClass ? currClass.class_name || currClass.name : `Class ${selectedClassId}`,
        sectionName: currSection ? currSection.section_name || currSection.name : `Section ${selectedSectionId}`,
        branchName: currBranch ? currBranch.name : 'All Campuses',
        academicYearName: currYear ? currYear.name || currYear.year_label : '',
        formattedMonth: formatMonthYear(selectedMonth),
        monthStr: selectedMonth,
      });
    } catch (err) {
      console.error('Failed to fetch monthly report:', err);
      setError(err.message || 'Failed to generate report. Please check server connection.');
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // 5. Summary metrics calculations
  const schoolDays = useMemo(() => {
    if (summary && summary.total_days !== undefined) {
      return Number(summary.total_days);
    }
    return reportData[0]?.total_days ?? 0;
  }, [summary, reportData]);

  const summaryTotals = useMemo(() => {
    if (summary) {
      return {
        present: Number(summary.total_present) || 0,
        absent: Number(summary.total_absent) || 0,
        late: Number(summary.total_late) || 0,
      };
    }
    return reportData.reduce(
      (acc, curr) => ({
        present: acc.present + (Number(curr.present) || 0),
        absent: acc.absent + (Number(curr.absent) || 0),
        late: acc.late + (Number(curr.late) || 0),
      }),
      { present: 0, absent: 0, late: 0 }
    );
  }, [summary, reportData]);

  const classWidePct = useMemo(() => {
    if (!reportData || reportData.length === 0 || !schoolDays) return '0.0';
    const totalPossible = reportData.length * schoolDays;
    if (totalPossible <= 0) return '0.0';
    const attended = summaryTotals.present + summaryTotals.late;
    return Math.min(100, Math.max(0, (attended / totalPossible) * 100)).toFixed(1);
  }, [reportData, schoolDays, summaryTotals]);

  // 6. CSV Export handler
  const handleExportCSV = useCallback(() => {
    if (!reportData || reportData.length === 0) return;

    const headers = [
      'Roll',
      'Student Name',
      'Present',
      'Absent',
      'Late',
      'Total Days',
      'Attendance %',
    ];

    const rows = reportData.map((row) => [
      `"${row.roll_no ?? ''}"`,
      `"${String(row.student_name ?? '').replace(/"/g, '""')}"`,
      row.present ?? 0,
      row.absent ?? 0,
      row.late ?? 0,
      row.total_days ?? schoolDays,
      `"${Number(row.percentage ?? 0).toFixed(1)}%"`,
    ]);

    // Append Summary Row
    rows.push([
      '"Summary"',
      `"All Students (${reportData.length})"`,
      summaryTotals.present,
      summaryTotals.absent,
      summaryTotals.late,
      schoolDays,
      `"${classWidePct}%"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const safeClass = (reportMeta?.className || 'Class').replace(/\s+/g, '_');
    const safeSection = (reportMeta?.sectionName || 'Section').replace(/\s+/g, '_');
    link.download = `monthly_attendance_${safeClass}_${safeSection}_${selectedMonth}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [reportData, reportMeta, schoolDays, summaryTotals, classWidePct, selectedMonth]);

  // 7. Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-specific style injection */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, nav, aside, .sidebar {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .shadow-xs, .shadow-sm, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Page Header (Screen & Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Monthly Attendance Report</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Class-wise monthly attendance summary, school days worked, and attendance percentage analysis.
          </p>
        </div>

        {/* Top Action Quick Buttons */}
        <div className="flex items-center gap-2">
          {hasGenerated && reportData.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-brand-600" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Printable Letterhead (Print Only) */}
      <div className="print-only border-b-2 border-slate-800 pb-3 mb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
              Campus Eye School ERP
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Official Monthly Student Attendance Roster
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>Generated: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            {reportMeta?.academicYearName && <div>Academic Year: {reportMeta.academicYearName}</div>}
          </div>
        </div>
      </div>

      {/* Filter Bar (Card at top) */}
      <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 no-print">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <Filter className="w-4 h-4 text-brand-600" />
          <span>Report Configuration & Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* 1. Academic Year */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-border rounded-xl text-heading focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              >
                {academicYears.length === 0 ? (
                  <option value="">No years found</option>
                ) : (
                  academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name || ay.year_label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 2. Branch */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Branch / Campus <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-border rounded-xl text-heading focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              >
                {branches.length === 0 ? (
                  <option value="">No branches found</option>
                ) : (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 3. Class */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Class <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-border rounded-xl text-heading focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              >
                {classes.length === 0 ? (
                  <option value="">No classes found</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class_name || c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 4. Section */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Section <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId || sections.length === 0}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-border rounded-xl text-heading focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sections.length === 0 ? (
                  <option value="">No sections found</option>
                ) : (
                  sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section_name || s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 5. Month */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Month & Year <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-border rounded-xl text-heading focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Buttons in filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-muted">
            {selectedMonth && (
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                Target Period: <strong>{formatMonthYear(selectedMonth)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Generate Report Button (Primary) */}
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={loading || !selectedClassId || !selectedSectionId || !selectedMonth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>

            {/* Export CSV Button (Secondary) */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!hasGenerated || reportData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-border text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 no-print">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && (
        <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-xs">
          <div className="inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-heading">Generating Monthly Attendance Report...</p>
          <p className="text-xs text-muted mt-1">Aggregating attendance registers and attendance % metrics</p>
        </div>
      )}

      {/* Initial Empty / No-data state (before generation) */}
      {!loading && !hasGenerated && (
        <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-heading">No Report Generated Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-1.5">
            Select filters and click Generate Report to view the monthly attendance summary.
          </p>
        </div>
      )}

      {/* Generated Report View */}
      {!loading && hasGenerated && (
        <div className="space-y-5">
          {/* Report Header Card */}
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{reportMeta?.branchName}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-heading">
                  {reportMeta?.className} - {reportMeta?.sectionName}
                  <span className="text-slate-300 font-normal mx-2">|</span>
                  <span className="text-slate-700">{reportMeta?.formattedMonth}</span>
                  <span className="text-slate-300 font-normal mx-2">|</span>
                  <span className="text-brand-600">{reportMeta?.branchName}</span>
                </h2>
              </div>

              {/* Stat Chips */}
              <div className="flex flex-wrap items-center gap-3">
                {/* School Days */}
                <div className="px-4 py-2 bg-slate-50 border border-border rounded-xl text-center min-w-[110px]">
                  <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                    School Days
                  </span>
                  <span className="text-lg font-bold text-heading font-mono">
                    {schoolDays}
                  </span>
                </div>

                {/* Total Students */}
                <div className="px-4 py-2 bg-slate-50 border border-border rounded-xl text-center min-w-[110px]">
                  <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Total Students
                  </span>
                  <span className="text-lg font-bold text-heading font-mono">
                    {reportData.length}
                  </span>
                </div>

                {/* Class Average Attendance */}
                <div className="px-4 py-2 bg-brand-50 border border-brand-100 rounded-xl text-center min-w-[120px]">
                  <span className="block text-[11px] font-semibold text-brand-700 uppercase tracking-wider">
                    Class Attendance
                  </span>
                  <span className="text-lg font-bold text-brand-700 font-mono">
                    {classWidePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Report Table Card */}
          {reportData.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-10 text-center shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-heading">No Attendance Data Found</h4>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                No attendance records or students found for {reportMeta?.className} - {reportMeta?.sectionName} in{' '}
                {reportMeta?.formattedMonth}.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border text-xs font-semibold text-muted uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-14">#</th>
                      <th className="py-3.5 px-5 text-left">Student Name</th>
                      <th className="py-3.5 px-4 text-center w-24">Roll</th>
                      <th className="py-3.5 px-4 text-center w-28 text-emerald-700">Present</th>
                      <th className="py-3.5 px-4 text-center w-28 text-rose-700">Absent</th>
                      <th className="py-3.5 px-4 text-center w-28 text-amber-700">Late</th>
                      <th className="py-3.5 px-4 text-center w-32">Total Days</th>
                      <th className="py-3.5 px-5 text-center w-36">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.map((row, index) => (
                      <tr
                        key={row.student_id || index}
                        className="hover:bg-slate-50/70 transition-colors text-xs sm:text-sm"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center text-muted font-mono text-xs">
                          {index + 1}
                        </td>

                        {/* Student Name */}
                        <td className="py-3.5 px-5 font-semibold text-heading">
                          {row.student_name}
                        </td>

                        {/* Roll Number */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-md font-medium">
                            {row.roll_no || '—'}
                          </span>
                        </td>

                        {/* Present */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-700">
                          {row.present ?? 0}
                        </td>

                        {/* Absent */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-rose-700">
                          {row.absent ?? 0}
                        </td>

                        {/* Late */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-amber-700">
                          {row.late ?? 0}
                        </td>

                        {/* Total Days */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {row.total_days ?? schoolDays}
                        </td>

                        {/* Attendance % Pill */}
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[68px] px-2.5 py-1 rounded-full text-xs font-bold border ${getPercentageBadgeClasses(
                              row.percentage
                            )}`}
                          >
                            {Number(row.percentage || 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Summary Row */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 text-xs sm:text-sm">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                        Σ
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        Summary ({reportData.length} Students)
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        —
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-bold">
                        {summaryTotals.present}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-rose-700 font-bold">
                        {summaryTotals.absent}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-amber-700 font-bold">
                        {summaryTotals.late}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-800 font-bold">
                        {schoolDays}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[68px] px-2.5 py-1 rounded-full text-xs font-bold border ${getPercentageBadgeClasses(
                            classWidePct
                          )}`}
                          title={`Class Average: ${classWidePct}%`}
                        >
                          {classWidePct}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Legend */}
              <div className="p-3.5 bg-slate-50 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted gap-3 no-print">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-600">Legend:</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>≥ 75% Good</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>60% – 74% Average</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>&lt; 60% Critical</span>
                  </span>
                </div>
                <div className="font-mono text-slate-500">
                  Total Records: {reportData.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyAttendanceReport;
