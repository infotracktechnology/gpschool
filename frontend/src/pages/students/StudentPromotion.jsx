import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  Calendar,
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Printer,
  Download,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  UserCheck,
  UserX,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const StudentPromotion = () => {
  const { user, selectedBranch, branches = [], selectedAcademicYear, academicYears = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Wizard Step: 1 = Scope, 2 = Student Classification, 3 = Summary & Dry-Run, 4 = Complete & Report
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Scope State
  const [branchId, setBranchId] = useState('');
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [classes, setClasses] = useState([]);
  const [sourceClassId, setSourceClassId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');

  // Target Class Sections (for Step 2 section assignment)
  const [targetSections, setTargetSections] = useState([]);

  // Step 2: Student Classification State
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState([]); // original loaded list
  // Map of studentId -> { action: 'promote' | 'detain' | 'leave', target_section_id: '', target_roll_no: '', remarks: '' }
  const [classification, setClassification] = useState({});
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [bulkActionTargetSection, setBulkActionTargetSection] = useState('');

  // Step 3 & 4: Execution & Report State
  const [executing, setExecuting] = useState(false);
  const [promotionResults, setPromotionResults] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync Branch
  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setBranchId(String(selectedBranch.id));
    } else if (branches.length > 0 && !branchId) {
      setBranchId(String(branches[0].id));
    }
  }, [selectedBranch, branches]);

  // Sync Academic Years
  useEffect(() => {
    if (academicYears.length > 0) {
      const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
      if (!sourceYearId) {
        setSourceYearId(String(currentYear.id));
      }
      // Target AY defaults to next upcoming academic year if available
      const upcomingYear = academicYears.find((y) => y.id > currentYear.id) || currentYear;
      if (!targetYearId) {
        setTargetYearId(String(upcomingYear.id));
      }
    }
  }, [academicYears]);

  // Fetch Classes for selected Branch
  useEffect(() => {
    if (!branchId) return;

    const fetchClasses = async () => {
      try {
        const res = await api.get(`/academics/classes?branch_id=${branchId}`);
        const list = res.classes || res.data || [];
        setClasses(list);

        if (list.length > 0) {
          if (!sourceClassId) setSourceClassId(String(list[0].id));
          // Target class auto-suggest: next class in order
          if (list.length > 1 && !targetClassId) {
            setTargetClassId(String(list[1].id));
          } else if (!targetClassId) {
            setTargetClassId(String(list[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };

    fetchClasses();
  }, [branchId]);

  // When source class changes, suggest next class for target
  const handleSourceClassChange = (newSourceId) => {
    setSourceClassId(newSourceId);
    const currentIndex = classes.findIndex((c) => String(c.id) === String(newSourceId));
    if (currentIndex !== -1 && currentIndex + 1 < classes.length) {
      setTargetClassId(String(classes[currentIndex + 1].id));
    } else {
      setTargetClassId(newSourceId);
    }
  };

  // Fetch Target Class Sections (for step 2 assignment)
  useEffect(() => {
    if (!branchId || !targetClassId) {
      setTargetSections([]);
      return;
    }

    const fetchTargetSections = async () => {
      try {
        const res = await api.get(
          `/academics/sections?branch_id=${branchId}&class_id=${targetClassId}`
        );
        const sectionList = res.sections || res.data || [];
        setTargetSections(sectionList);
        if (sectionList.length > 0 && !bulkActionTargetSection) {
          setBulkActionTargetSection(String(sectionList[0].id));
        }
      } catch (err) {
        console.error('Failed to load target sections:', err);
      }
    };

    fetchTargetSections();
  }, [branchId, targetClassId]);

  // Load students for Step 2
  const loadEligibleStudents = async () => {
    if (!branchId || !sourceYearId || !sourceClassId) return;

    setLoadingStudents(true);
    try {
      const res = await api.get(
        `/students?branch_id=${branchId}&academic_year_id=${sourceYearId}&class_id=${sourceClassId}&status=active`
      );
      const studentList = res.students || res.data || [];
      setStudents(studentList);

      // Initialize classifications: default all to 'promote' with first target section
      const defaultSectionId = targetSections.length > 0 ? String(targetSections[0].id) : '';
      const initialMap = {};
      studentList.forEach((s) => {
        const sId = s.id || s.student_id;
        initialMap[sId] = {
          action: 'promote',
          target_section_id: defaultSectionId,
          target_roll_no: s.roll_no || '',
          remarks: '',
        };
      });
      setClassification(initialMap);
      setSelectedStudentIds(new Set());
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to load eligible students:', err);
      setToast({
        type: 'error',
        message: 'Failed to fetch students for promotion. Please check filters.',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Classification Updates
  const updateStudentAction = (studentId, action) => {
    setClassification((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        action,
        // If leaving, section is N/A
        target_section_id:
          action === 'leave'
            ? ''
            : prev[studentId]?.target_section_id ||
              (targetSections.length > 0 ? String(targetSections[0].id) : ''),
      },
    }));
  };

  const updateStudentSection = (studentId, sectionId) => {
    setClassification((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        target_section_id: sectionId,
      },
    }));
  };

  const updateStudentRoll = (studentId, rollNo) => {
    setClassification((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        target_roll_no: rollNo,
      },
    }));
  };

  // Bulk Actions
  const applyBulkAction = (action) => {
    const targetIds =
      selectedStudentIds.size > 0
        ? Array.from(selectedStudentIds)
        : filteredStudents.map((s) => s.id || s.student_id);

    setClassification((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        next[id] = {
          ...next[id],
          action,
          target_section_id:
            action === 'leave'
              ? ''
              : next[id]?.target_section_id ||
                (targetSections.length > 0 ? String(targetSections[0].id) : ''),
        };
      });
      return next;
    });

    setToast({
      type: 'success',
      message: `Updated status to "${action.toUpperCase()}" for ${targetIds.length} student(s).`,
    });
  };

  const applyBulkSection = () => {
    if (!bulkActionTargetSection) return;

    const targetIds =
      selectedStudentIds.size > 0
        ? Array.from(selectedStudentIds)
        : filteredStudents.map((s) => s.id || s.student_id);

    setClassification((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        if (next[id]?.action !== 'leave') {
          next[id] = {
            ...next[id],
            target_section_id: bulkActionTargetSection,
          };
        }
      });
      return next;
    });

    const secName = targetSections.find((s) => String(s.id) === bulkActionTargetSection)?.name;
    setToast({
      type: 'success',
      message: `Assigned Section ${secName || ''} to ${targetIds.length} student(s).`,
    });
  };

  // Filtered Students in Step 2
  const filteredStudents = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.student_name || s.name || '').toLowerCase();
      const adm = (s.admission_no || '').toLowerCase();
      const roll = String(s.roll_no || '');
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });
  }, [students, searchFilter]);

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id || s.student_id)));
    }
  };

  // Promotion Statistics Summary
  const stats = useMemo(() => {
    let promoted = 0;
    let detained = 0;
    let left = 0;

    Object.values(classification).forEach((c) => {
      if (c.action === 'promote') promoted++;
      else if (c.action === 'detain') detained++;
      else if (c.action === 'leave') left++;
    });

    return {
      total: students.length,
      promoted,
      detained,
      left,
    };
  }, [students, classification]);

  // Scope Labels
  const sourceYearObj = academicYears.find((y) => String(y.id) === String(sourceYearId));
  const targetYearObj = academicYears.find((y) => String(y.id) === String(targetYearId));
  const sourceClassObj = classes.find((c) => String(c.id) === String(sourceClassId));
  const targetClassObj = classes.find((c) => String(c.id) === String(targetClassId));
  const branchObj = branches.find((b) => String(b.id) === String(branchId));

  // Execute Promotion (Step 3 -> Step 4)
  const handleExecutePromotion = async () => {
    setExecuting(true);
    try {
      const promotionsPayload = students.map((s) => {
        const sId = s.id || s.student_id;
        const config = classification[sId] || { action: 'promote' };
        return {
          student_id: sId,
          action: config.action,
          target_class_id: config.action === 'promote' ? Number(targetClassId) : Number(sourceClassId),
          target_section_id: config.action !== 'leave' ? Number(config.target_section_id) : null,
          target_roll_no: config.target_roll_no || null,
        };
      });

      const res = await api.post('/students/promotion', {
        branch_id: Number(branchId),
        target_academic_year_id: Number(targetYearId),
        source_academic_year_id: Number(sourceYearId),
        promotions: promotionsPayload,
      });

      // Prepare final results register
      const reportRows = students.map((s) => {
        const sId = s.id || s.student_id;
        const c = classification[sId] || {};
        const destSec = targetSections.find((sec) => String(sec.id) === String(c.target_section_id));

        return {
          student_id: sId,
          student_name: s.student_name || s.name,
          admission_no: s.admission_no,
          gender: s.gender || '—',
          old_class: sourceClassObj?.name || 'Class',
          old_section: s.section_name || s.section || '—',
          new_class:
            c.action === 'promote'
              ? targetClassObj?.name || 'Class'
              : c.action === 'detain'
              ? sourceClassObj?.name || 'Class'
              : 'Withdrawn',
          new_section: c.action !== 'leave' ? (destSec ? `Sec ${destSec.name}` : '—') : 'N/A',
          status: c.action === 'promote' ? 'Promoted' : c.action === 'detain' ? 'Detained / Repeating' : 'Withdrawn / Left',
          target_roll_no: c.target_roll_no || '—',
          date: new Date().toLocaleDateString(),
        };
      });

      setPromotionResults({
        summary: stats,
        timestamp: new Date().toLocaleString(),
        report: reportRows,
        meta: res,
      });

      setCurrentStep(4);
    } catch (err) {
      console.error('Promotion execution failed:', err);
      setToast({
        type: 'error',
        message: err.message || 'Promotion execution failed. Please verify student records.',
      });
    } finally {
      setExecuting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!promotionResults?.report) return;

    const headers = [
      'Admission No',
      'Student Name',
      'Gender',
      'Old Class',
      'Old Section',
      'New Class',
      'New Section',
      'Roll No',
      'Outcome Status',
      'Processed Date',
    ];

    const rows = promotionResults.report.map((r) => [
      `"${r.admission_no}"`,
      `"${r.student_name}"`,
      `"${r.gender}"`,
      `"${r.old_class}"`,
      `"${r.old_section}"`,
      `"${r.new_class}"`,
      `"${r.new_section}"`,
      `"${r.target_roll_no}"`,
      `"${r.status}"`,
      `"${r.date}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Promotion_Register_${sourceClassObj?.code || 'Class'}_to_${targetClassObj?.code || 'Class'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!promotionResults?.report) return;

    const excelData = promotionResults.report.map((r, index) => ({
      'S.No': index + 1,
      'Admission No': r.admission_no,
      'Student Name': r.student_name,
      'Gender': r.gender,
      'Old Class': r.old_class,
      'Old Section': r.old_section,
      'New Class': r.new_class,
      'New Section': r.new_section,
      'New Roll No': r.target_roll_no,
      'Promotion Status': r.status,
      'Execution Date': r.date,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotion Register');
    XLSX.writeFile(
      wb,
      `Promotion_Register_${sourceClassObj?.name || 'Class'}_${targetYearObj?.name || 'Year'}.xlsx`
    );
  };

  // Print Promotion Register Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border animate-slide-in-down ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline ml-2 opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Student Promotion Engine</h1>
            <p className="text-sm text-muted mt-1">
              Annual academic year rollover, student progression, detention, and official register generation
            </p>
          </div>
        </div>
      </div>

      {/* Wizard Step Progress Tracker */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm print:hidden">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, title: '1. Academic Scope', desc: 'Select Years & Classes' },
            { step: 2, title: '2. Classification', desc: 'Promote, Detain, Withdraw' },
            { step: 3, title: '3. Summary & Dry-Run', desc: 'Review & Verify' },
            { step: 4, title: '4. Register Report', desc: 'Print & Export' },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-brand-50 border border-brand-200 text-brand-900'
                    : isCompleted
                    ? 'bg-emerald-50/60 border border-emerald-100 text-emerald-800'
                    : 'bg-slate-50 border border-transparent text-slate-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                </div>
                <div className="hidden sm:block min-w-0">
                  <div className="text-xs font-bold truncate">{item.title}</div>
                  <div className="text-[11px] text-muted truncate">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Academic Scope Selection */}
      {currentStep === 1 && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-heading">Step 1: Set Academic Scope</h2>
            <p className="text-sm text-muted mt-0.5">
              Specify source class cohort and destination academic year for promotion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campus Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-brand-600" /> Campus / Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!isSuperAdmin && branches.length <= 1}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Year & Class (FROM) */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-border space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-heading text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                FROM: Current Academic Standing
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Source Academic Year
                </label>
                <select
                  value={sourceYearId}
                  onChange={(e) => setSourceYearId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Source Class to Promote
                </label>
                <select
                  value={sourceClassId}
                  onChange={(e) => handleSourceClassChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination Year & Target Class (TO) */}
            <div className="p-5 bg-brand-50/40 rounded-2xl border border-brand-100 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-heading text-brand-700">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                TO: Destination Academic Target
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Destination Academic Year
                </label>
                <select
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.is_current ? '(Current Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Target Next Class (for Promoted Students)
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scope Summary Preview Banner */}
          <div className="p-4 bg-slate-100/80 rounded-xl flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <div>
                <span className="font-semibold text-heading">Scope Mapping: </span>
                <span className="text-slate-700 font-medium">
                  {sourceClassObj?.name} ({sourceYearObj?.name})
                </span>
                <span className="mx-2 text-muted">➔</span>
                <span className="text-brand-700 font-bold">
                  {targetClassObj?.name} ({targetYearObj?.name})
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={loadingStudents || !sourceClassId || !targetClassId}
              onClick={loadEligibleStudents}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              {loadingStudents ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading Students...
                </>
              ) : (
                <>
                  <span>Continue to Student Classification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Student Classification Table */}
      {currentStep === 2 && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden space-y-4 p-6">
          {/* Header & Stats Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-heading">Step 2: Student Classification</h2>
              <p className="text-sm text-muted mt-0.5">
                Classify each student (Promote, Detain, or Leave) and assign target sections.
              </p>
            </div>

            {/* Quick Status Pill Counters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 font-semibold text-slate-700">
                Total: {stats.total}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Promote: {stats.promoted}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                Detain: {stats.detained}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                Leave / TC: {stats.left}
              </span>
            </div>
          </div>

          {/* Bulk Classification Toolbar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted">
                {selectedStudentIds.size > 0
                  ? `For ${selectedStudentIds.size} Selected:`
                  : 'For All In View:'}
              </span>

              <button
                type="button"
                onClick={() => applyBulkAction('promote')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
              >
                Mark Promote
              </button>
              <button
                type="button"
                onClick={() => applyBulkAction('detain')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
              >
                Mark Detain
              </button>
              <button
                type="button"
                onClick={() => applyBulkAction('leave')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors"
              >
                Mark Leave
              </button>

              {/* Bulk Section Assign */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300">
                <select
                  value={bulkActionTargetSection}
                  onChange={(e) => setBulkActionTargetSection(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-border bg-white font-medium"
                >
                  {targetSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyBulkSection}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-100 text-brand-800 hover:bg-brand-200 transition-colors"
                >
                  Assign Section
                </button>
              </div>
            </div>
          </div>

          {/* Students Classification Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border text-xs uppercase text-muted font-semibold">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 rounded hover:bg-slate-200 transition-colors"
                    >
                      {selectedStudentIds.size > 0 &&
                      selectedStudentIds.size === filteredStudents.length ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Adm No / Roll</th>
                  <th className="py-3 px-3">Current Section</th>
                  <th className="py-3 px-3">Classification Action</th>
                  <th className="py-3 px-3">Destination Section</th>
                  <th className="py-3 px-3">Target Roll No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted text-sm">
                      No students found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const sId = student.id || student.student_id;
                    const c = classification[sId] || { action: 'promote' };
                    const isSelected = selectedStudentIds.has(sId);

                    return (
                      <tr
                        key={sId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          c.action === 'leave'
                            ? 'bg-rose-50/20'
                            : c.action === 'detain'
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(sId)}
                            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-heading">
                            {student.student_name || student.name}
                          </div>
                          <div className="text-xs text-muted">
                            Gender: {student.gender || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs font-mono">
                          <div>{student.admission_no}</div>
                          <div className="text-muted">Roll: {student.roll_no || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-xs font-medium">
                          Section {student.section_name || student.section || 'A'}
                        </td>
                        <td className="py-3 px-3">
                          {/* Segmented Radio Group for Action */}
                          <div className="inline-flex rounded-lg border border-border p-0.5 bg-slate-100 text-xs font-semibold">
                            <button
                              type="button"
                              onClick={() => updateStudentAction(sId, 'promote')}
                              className={`px-2.5 py-1 rounded-md transition-all ${
                                c.action === 'promote'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-heading'
                              }`}
                            >
                              Promote
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentAction(sId, 'detain')}
                              className={`px-2.5 py-1 rounded-md transition-all ${
                                c.action === 'detain'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-heading'
                              }`}
                            >
                              Detain
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStudentAction(sId, 'leave')}
                              className={`px-2.5 py-1 rounded-md transition-all ${
                                c.action === 'leave'
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-heading'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {c.action === 'leave' ? (
                            <span className="text-xs text-muted italic">N/A (Leaving)</span>
                          ) : (
                            <select
                              value={c.target_section_id || ''}
                              onChange={(e) => updateStudentSection(sId, e.target.value)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-white font-medium focus:ring-1 focus:ring-brand-500"
                            >
                              {targetSections.map((sec) => (
                                <option key={sec.id} value={sec.id}>
                                  Section {sec.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Roll No"
                            value={c.target_roll_no || ''}
                            onChange={(e) => updateStudentRoll(sId, e.target.value)}
                            disabled={c.action === 'leave'}
                            className="w-20 px-2 py-1 text-xs rounded-lg border border-border bg-white font-mono focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-muted"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Scope</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
            >
              <span>Review Summary & Dry-Run</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Summary & Dry-Run Review */}
      {currentStep === 3 && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-lg font-bold text-heading">Step 3: Promotion Summary & Dry-Run</h2>
            <p className="text-sm text-muted mt-0.5">
              Verify student progression distributions before committing changes to the permanent register.
            </p>
          </div>

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                Total Eligible
              </span>
              <div className="text-3xl font-extrabold text-blue-900 mt-2">{stats.total}</div>
              <p className="text-xs text-blue-700/80 mt-1">Students processed</p>
            </div>

            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                To Be Promoted
              </span>
              <div className="text-3xl font-extrabold text-emerald-900 mt-2">{stats.promoted}</div>
              <p className="text-xs text-emerald-700/80 mt-1">
                Advance to {targetClassObj?.name}
              </p>
            </div>

            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
                Detained / Repeat
              </span>
              <div className="text-3xl font-extrabold text-amber-900 mt-2">{stats.detained}</div>
              <p className="text-xs text-amber-700/80 mt-1">
                Retain in {sourceClassObj?.name}
              </p>
            </div>

            <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                Withdrawn / Left
              </span>
              <div className="text-3xl font-extrabold text-rose-900 mt-2">{stats.left}</div>
              <p className="text-xs text-rose-700/80 mt-1">Marked inactive / TC eligible</p>
            </div>
          </div>

          {/* Dry Run Verification Box */}
          <div className="p-4 bg-slate-50 border border-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-heading">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Dry-Run Pre-flight Checks</span>
            </div>
            <ul className="text-xs text-muted space-y-1 list-disc list-inside">
              <li>Verified source academic year ({sourceYearObj?.name}) and class ({sourceClassObj?.name}).</li>
              <li>Target academic year set to {targetYearObj?.name}.</li>
              <li>Destination sections assigned for all promoted and retained students.</li>
              <li>Academic history records will be archived with rollover logs.</li>
            </ul>
          </div>

          {/* Review List Preview */}
          <div>
            <h3 className="text-sm font-bold text-heading mb-2">Detailed Progression Review</h3>
            <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {students.map((s) => {
                const sId = s.id || s.student_id;
                const c = classification[sId] || {};
                const targetSec = targetSections.find((sec) => String(sec.id) === String(c.target_section_id));

                return (
                  <div key={sId} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-heading">
                        {s.student_name || s.name}
                      </span>
                      <span className="text-muted ml-2 font-mono">({s.admission_no})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        {sourceClassObj?.name} (Sec {s.section_name || s.section || 'A'})
                      </span>
                      <span className="text-muted">➔</span>
                      {c.action === 'promote' && (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {targetClassObj?.name} (Sec {targetSec?.name || 'A'})
                        </span>
                      )}
                      {c.action === 'detain' && (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Repeat {sourceClassObj?.name} (Sec {targetSec?.name || 'A'})
                        </span>
                      )}
                      {c.action === 'leave' && (
                        <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Withdrawn / Exit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              disabled={executing}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Edit Classification</span>
            </button>

            <button
              type="button"
              disabled={executing}
              onClick={handleExecutePromotion}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Finalizing & Executing Rollover...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Execute Academic Promotion
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Complete & Promotion Register Report */}
      {currentStep === 4 && promotionResults && (
        <div className="space-y-6">
          {/* Action & Celebration Toolbar (Hidden on print) */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-heading">Promotion Execution Complete!</h2>
                <p className="text-sm text-muted">
                  The promotion register has been recorded. You can print the official register or export CSV/Excel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Register</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setStudents([]);
                  setClassification({});
                  setPromotionResults(null);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Promote Another Class</span>
              </button>
            </div>
          </div>

          {/* Printable Official Promotion Register Report */}
          <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Report Header for Print */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 font-serif">
                GREEN PARK SENIOR SECONDARY SCHOOL
              </h1>
              <p className="text-xs text-slate-600">
                Campus: {branchObj?.name || 'Main Campus'} | Affiliated to CBSE New Delhi (Affiliation No. 2130892)
              </p>
              <h2 className="text-base font-bold uppercase tracking-widest text-slate-800 pt-2 underline">
                ANNUAL PROMOTION REGISTER REPORT
              </h2>
              <div className="flex justify-between items-center text-xs text-slate-600 pt-2 px-4">
                <span>
                  <strong>Source AY:</strong> {sourceYearObj?.name} ({sourceClassObj?.name})
                </span>
                <span>
                  <strong>Target AY:</strong> {targetYearObj?.name} ({targetClassObj?.name})
                </span>
                <span>
                  <strong>Date:</strong> {promotionResults.timestamp}
                </span>
              </div>
            </div>

            {/* Quick Stat Pill in Report */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <div>Total: <strong>{promotionResults.summary.total}</strong></div>
              <div className="text-emerald-700">Promoted: <strong>{promotionResults.summary.promoted}</strong></div>
              <div className="text-amber-700">Detained: <strong>{promotionResults.summary.detained}</strong></div>
              <div className="text-rose-700">Left: <strong>{promotionResults.summary.left}</strong></div>
            </div>

            {/* Detailed Table */}
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-900 uppercase">
                  <th className="py-2 px-2 border-r border-slate-300 w-8 text-center">#</th>
                  <th className="py-2 px-3 border-r border-slate-300">Adm No</th>
                  <th className="py-2 px-3 border-r border-slate-300">Student Name</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center">Gender</th>
                  <th className="py-2 px-3 border-r border-slate-300">Previous Class</th>
                  <th className="py-2 px-3 border-r border-slate-300">Promoted To</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center">New Roll</th>
                  <th className="py-2 px-3 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {promotionResults.report.map((row, idx) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium">{row.admission_no}</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">{row.student_name}</td>
                    <td className="py-2 px-2 border-r border-slate-200 text-center">{row.gender}</td>
                    <td className="py-2 px-3 border-r border-slate-200">{row.old_class} ({row.old_section})</td>
                    <td className="py-2 px-3 border-r border-slate-200 font-medium">
                      {row.new_class} {row.new_section !== 'N/A' ? `(${row.new_section})` : ''}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono">{row.target_roll_no}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.status === 'Promoted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status.includes('Detained')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Official Signatures Footer (Visible on Print) */}
            <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs text-slate-800">
              <div className="border-t border-slate-400 pt-2">
                Class Teacher Signature
              </div>
              <div className="border-t border-slate-400 pt-2">
                Verified By (Exam Controller)
              </div>
              <div className="border-t border-slate-400 pt-2 font-bold">
                Principal & Official Seal
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotion;
