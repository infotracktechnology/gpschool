import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Building2,
  Calendar,
  GraduationCap,
  Sparkles,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const SectionChange = () => {
  const { user, selectedBranch, branches = [], selectedAcademicYear, academicYears = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Branch & AY selection
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');

  // Classes & Sections
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sections, setSections] = useState([]);

  // Source & Destination Section selection
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [destSectionId, setDestSectionId] = useState('');

  // Student Rosters
  const [sourceStudents, setSourceStudents] = useState([]);
  const [destStudents, setDestStudents] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  // Search filters inside columns
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');

  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Action options
  const [autoResequence, setAutoResequence] = useState(true);
  const [transferReason, setTransferReason] = useState('');

  // Confirmation Modal & Feedback Toast
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync Branch from AuthContext
  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0].id));
    }
  }, [selectedBranch, branches]);

  // Sync Academic Year from AuthContext
  useEffect(() => {
    if (selectedAcademicYear) {
      setSelectedYearId(String(selectedAcademicYear.id));
    } else if (academicYears.length > 0 && !selectedYearId) {
      const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];
      setSelectedYearId(String(currentYear.id));
    }
  }, [selectedAcademicYear, academicYears]);

  // Fetch Classes when Branch changes
  useEffect(() => {
    if (!selectedBranchId) {
      setClasses([]);
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await api.get(`/academics/classes?branch_id=${selectedBranchId}`);
        const classList = res.classes || res.data || [];
        setClasses(classList);

        // Reset or default selected class
        setSelectedClassId((prev) => {
          if (prev && classList.some((c) => String(c.id) === String(prev))) {
            return prev;
          }
          return classList.length > 0 ? String(classList[0].id) : '';
        });
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };

    fetchClasses();
  }, [selectedBranchId]);

  // Fetch Sections when Class changes
  useEffect(() => {
    if (!selectedBranchId || !selectedClassId) {
      setSections([]);
      setSourceSectionId('');
      setDestSectionId('');
      return;
    }

    const fetchSections = async () => {
      try {
        const res = await api.get(
          `/academics/sections?branch_id=${selectedBranchId}&class_id=${selectedClassId}`
        );
        const sectionList = res.sections || res.data || [];
        setSections(sectionList);

        if (sectionList.length >= 2) {
          setSourceSectionId(String(sectionList[0].id));
          setDestSectionId(String(sectionList[1].id));
        } else if (sectionList.length === 1) {
          setSourceSectionId(String(sectionList[0].id));
          setDestSectionId('');
        } else {
          setSourceSectionId('');
          setDestSectionId('');
        }
      } catch (err) {
        console.error('Failed to load sections:', err);
      }
    };

    fetchSections();
  }, [selectedBranchId, selectedClassId]);

  // Fetch Source Students
  const fetchSourceStudents = useCallback(async () => {
    if (!selectedBranchId || !selectedClassId || !sourceSectionId) {
      setSourceStudents([]);
      setSelectedStudentIds(new Set());
      return;
    }

    setLoadingSource(true);
    try {
      const res = await api.get(
        `/students?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}&class_id=${selectedClassId}&section_id=${sourceSectionId}&status=active`
      );
      const list = res.students || res.data || [];
      setSourceStudents(list);
      setSelectedStudentIds(new Set());
    } catch (err) {
      console.error('Failed to fetch source students:', err);
      setSourceStudents([]);
    } finally {
      setLoadingSource(false);
    }
  }, [selectedBranchId, selectedYearId, selectedClassId, sourceSectionId]);

  // Fetch Destination Students
  const fetchDestStudents = useCallback(async () => {
    if (!selectedBranchId || !selectedClassId || !destSectionId) {
      setDestStudents([]);
      return;
    }

    setLoadingDest(true);
    try {
      const res = await api.get(
        `/students?branch_id=${selectedBranchId}&academic_year_id=${selectedYearId}&class_id=${selectedClassId}&section_id=${destSectionId}&status=active`
      );
      const list = res.students || res.data || [];
      setDestStudents(list);
    } catch (err) {
      console.error('Failed to fetch dest students:', err);
      setDestStudents([]);
    } finally {
      setLoadingDest(false);
    }
  }, [selectedBranchId, selectedYearId, selectedClassId, destSectionId]);

  useEffect(() => {
    fetchSourceStudents();
  }, [fetchSourceStudents]);

  useEffect(() => {
    fetchDestStudents();
  }, [fetchDestStudents]);

  // Filtering
  const filteredSourceStudents = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    if (!q) return sourceStudents;
    return sourceStudents.filter((s) => {
      const name = (s.student_name || s.name || '').toLowerCase();
      const adm = (s.admission_no || '').toLowerCase();
      const roll = String(s.roll_no || '');
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });
  }, [sourceStudents, sourceSearch]);

  const filteredDestStudents = useMemo(() => {
    const q = destSearch.trim().toLowerCase();
    if (!q) return destStudents;
    return destStudents.filter((s) => {
      const name = (s.student_name || s.name || '').toLowerCase();
      const adm = (s.admission_no || '').toLowerCase();
      const roll = String(s.roll_no || '');
      return name.includes(q) || adm.includes(q) || roll.includes(q);
    });
  }, [destStudents, destSearch]);

  // Checkbox Selection
  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllSource = () => {
    if (selectedStudentIds.size === filteredSourceStudents.length && filteredSourceStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      const allIds = new Set(filteredSourceStudents.map((s) => s.id || s.student_id));
      setSelectedStudentIds(allIds);
    }
  };

  // Destination Capacity details
  const destSectionObj = useMemo(() => {
    return sections.find((s) => String(s.id) === String(destSectionId)) || null;
  }, [sections, destSectionId]);

  const destCapacity = destSectionObj?.capacity || 40;
  const destCurrentCount = destStudents.length;
  const movingCount = selectedStudentIds.size;
  const projectedCount = destCurrentCount + movingCount;
  const capacityPercent = Math.min(Math.round((projectedCount / destCapacity) * 100), 100);
  const isOverCapacity = projectedCount > destCapacity;

  // Execute reallocation
  const handleTransferSubmit = async () => {
    if (selectedStudentIds.size === 0 || !destSectionId) return;

    setSubmitting(true);
    try {
      const payload = {
        student_ids: Array.from(selectedStudentIds),
        target_section_id: Number(destSectionId),
        auto_renumber: autoResequence,
        reason: transferReason.trim() || 'Section change reallocation',
      };

      await api.post('/students/section-change', payload);

      setToast({
        type: 'success',
        message: `Successfully transferred ${payload.student_ids.length} student(s) to Section ${
          destSectionObj?.name || ''
        }!`,
      });

      setIsConfirmModalOpen(false);
      setTransferReason('');
      setSelectedStudentIds(new Set());

      // Refresh both source and destination lists
      await Promise.all([fetchSourceStudents(), fetchDestStudents()]);
    } catch (err) {
      console.error('Reallocation failed:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to complete section reallocation. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Selected students list for modal
  const selectedStudentsData = useMemo(() => {
    return sourceStudents.filter((s) => selectedStudentIds.has(s.id || s.student_id));
  }, [sourceStudents, selectedStudentIds]);

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Section Allocation & Change</h1>
            <p className="text-sm text-muted mt-1">
              Seamlessly reallocate students between sections with capacity checks and roll number resequencing
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchSourceStudents();
            fetchDestStudents();
          }}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-muted" />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar (Scope) */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Branch Selector */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Campus / Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={!isSuperAdmin && branches.length <= 1}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:bg-slate-50 disabled:text-muted"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Year Selector */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Academic Year
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            {classes.length === 0 ? (
              <option value="">No classes found</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Dual-Column Reallocation Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Source Section & Student Roster */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Column Header */}
          <div className="p-4 bg-slate-50/70 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Source Section
              </span>
              <Badge variant="primary" className="text-xs font-semibold">
                {sourceStudents.length} Students Total
              </Badge>
            </div>

            {/* Source Section Selector */}
            <div className="flex items-center gap-2">
              <select
                value={sourceSectionId}
                onChange={(e) => {
                  setSourceSectionId(e.target.value);
                  if (e.target.value === destSectionId) {
                    const alternate = sections.find((s) => String(s.id) !== e.target.value);
                    if (alternate) setDestSectionId(String(alternate.id));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name} ({s.room_no ? `Room ${s.room_no}` : `Capacity: ${s.capacity || 40}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Search and Select All Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by name, roll, admission..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllSource}
                disabled={filteredSourceStudents.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {selectedStudentIds.size > 0 &&
                selectedStudentIds.size === filteredSourceStudents.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-brand-600" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-muted" /> Select All (
                    {filteredSourceStudents.length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Student List (Scrollable) */}
          <div className="flex-1 overflow-y-auto divide-y divide-border p-2">
            {loadingSource ? (
              <div className="flex flex-col items-center justify-center h-full text-muted py-12">
                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Loading section roster...</p>
              </div>
            ) : filteredSourceStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted py-12 text-center px-4">
                <Users className="w-10 h-10 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-sm font-medium text-heading">No students found</p>
                <p className="text-xs text-muted mt-1">
                  {sourceStudents.length === 0
                    ? 'This section currently has no active enrolled students.'
                    : 'No students match your filter query.'}
                </p>
              </div>
            ) : (
              filteredSourceStudents.map((student) => {
                const sId = student.id || student.student_id;
                const isSelected = selectedStudentIds.has(sId);

                return (
                  <div
                    key={sId}
                    onClick={() => toggleStudentSelection(sId)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50/70 border border-brand-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by div click
                        className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-heading truncate">
                            {student.student_name || student.name}
                          </span>
                          {student.gender && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                student.gender.toLowerCase() === 'female'
                                  ? 'bg-pink-50 text-pink-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {student.gender.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                          <span>Adm: {student.admission_no}</span>
                          <span>•</span>
                          <span>Roll: {student.roll_no || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{student.roll_no || '—'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Source Footer status */}
          <div className="p-3 bg-slate-50 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>
              Selected: <strong className="text-heading">{selectedStudentIds.size}</strong> student(s)
            </span>
            {selectedStudentIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="text-brand-600 hover:underline font-medium"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Center Action Controls */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-4 py-4 lg:py-16">
          <div className="w-full bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-4">
            <div className="text-center">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Batch Transfer
              </span>
              <p className="text-xs text-muted">
                Transfer checked students across sections
              </p>
            </div>

            {/* Transfer Reason Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Transfer Reason (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Student request, Academic balancing..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Auto Resequence Checkbox */}
            <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoResequence}
                onChange={(e) => setAutoResequence(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <span>Auto-resequence Roll Numbers in destination section</span>
            </label>

            {/* Move Button */}
            <button
              type="button"
              disabled={
                selectedStudentIds.size === 0 ||
                !destSectionId ||
                sourceSectionId === destSectionId
              }
              onClick={() => setIsConfirmModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>Move ({selectedStudentIds.size})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {sourceSectionId === destSectionId && destSectionId && (
              <p className="text-[11px] text-amber-600 text-center font-medium">
                Source and Destination sections must be different.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Destination Section & Live Roster */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Column Header */}
          <div className="p-4 bg-slate-50/70 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Destination Section
              </span>

              {/* Live Capacity Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    isOverCapacity
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : capacityPercent > 85
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {projectedCount} / {destCapacity} Seats
                </span>
              </div>
            </div>

            {/* Destination Section Selector */}
            <div className="flex items-center gap-2">
              <select
                value={destSectionId}
                onChange={(e) => setDestSectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {sections
                  .filter((s) => String(s.id) !== String(sourceSectionId))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name} ({s.room_no ? `Room ${s.room_no}` : `Capacity: ${s.capacity || 40}`})
                    </option>
                  ))}
              </select>
            </div>

            {/* Capacity Visual Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted">
                <span>Roster Occupancy: {destCurrentCount} enrolled</span>
                {movingCount > 0 && (
                  <span className="text-brand-600 font-medium">+{movingCount} incoming</span>
                )}
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min((destCurrentCount / destCapacity) * 100, 100)}%`,
                  }}
                />
                {movingCount > 0 && (
                  <div
                    className={`${
                      isOverCapacity ? 'bg-rose-500' : 'bg-brand-500'
                    } h-full transition-all duration-300`}
                    style={{
                      width: `${Math.min((movingCount / destCapacity) * 100, 100)}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Destination Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
              <input
                type="text"
                placeholder="Search destination roster..."
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Destination Student List (Scrollable) */}
          <div className="flex-1 overflow-y-auto divide-y divide-border p-2">
            {loadingDest ? (
              <div className="flex flex-col items-center justify-center h-full text-muted py-12">
                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Loading destination roster...</p>
              </div>
            ) : filteredDestStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted py-12 text-center px-4">
                <Users className="w-10 h-10 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-sm font-medium text-heading">No students in destination</p>
                <p className="text-xs text-muted mt-1">
                  {destStudents.length === 0
                    ? 'This section is currently empty and ready for allocations.'
                    : 'No students match your search filter.'}
                </p>
              </div>
            ) : (
              filteredDestStudents.map((student) => {
                const sId = student.id || student.student_id;
                return (
                  <div
                    key={sId}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {(student.student_name || student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-heading truncate">
                            {student.student_name || student.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                          <span>Adm: {student.admission_no}</span>
                          <span>•</span>
                          <span>Roll: {student.roll_no || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      #{student.roll_no || '—'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Destination Footer */}
          <div className="p-3 bg-slate-50 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>
              Current Roster: <strong className="text-heading">{destStudents.length}</strong> students
            </span>
            <span>Capacity: {destCapacity}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Section Reallocation"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Verify Section Transfer</p>
              <p className="mt-0.5 text-xs text-amber-700">
                You are about to transfer <strong>{selectedStudentsData.length} student(s)</strong>{' '}
                from <strong>Section {sections.find((s) => String(s.id) === String(sourceSectionId))?.name}</strong>{' '}
                to <strong>Section {destSectionObj?.name}</strong>.
              </p>
            </div>
          </div>

          {/* Summary Details */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Target Section:</span>
              <span className="font-semibold text-heading">Section {destSectionObj?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Auto-Resequence Roll Numbers:</span>
              <span className="font-semibold text-heading">
                {autoResequence ? 'Yes (Alphabetical / Sequential)' : 'No (Preserve Existing)'}
              </span>
            </div>
            {transferReason && (
              <div className="flex justify-between">
                <span className="text-muted">Reason:</span>
                <span className="font-medium text-slate-700">{transferReason}</span>
              </div>
            )}
            {isOverCapacity && (
              <div className="p-2 bg-rose-50 text-rose-700 rounded border border-rose-200 font-medium">
                Warning: Destination section will exceed configured capacity ({projectedCount} / {destCapacity}).
              </div>
            )}
          </div>

          {/* Student list preview */}
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
              Selected Students ({selectedStudentsData.length})
            </span>
            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {selectedStudentsData.map((s) => (
                <div key={s.id || s.student_id} className="p-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-heading">
                    {s.student_name || s.name}
                  </span>
                  <span className="text-muted font-mono">
                    Adm: {s.admission_no} (Roll: {s.roll_no || '—'})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleTransferSubmit}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Transferring...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Execute
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SectionChange;
