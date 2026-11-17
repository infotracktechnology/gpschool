import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  Save,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowLeft,
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

export const StudentBulkEdit = () => {
  const navigate = useNavigate();
  const {
    user,
    branches,
    selectedBranch,
    changeBranch,
    academicYears,
    selectedAcademicYear,
    changeAcademicYear,
    classes,
    selectedClassId,
    setSelectedClassId,
    sections,
    selectedSectionId,
    setSelectedSectionId,
  } = useAuth();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filters
  const selectedBranchId =
    selectedBranch && selectedBranch.id !== 'all' ? String(selectedBranch.id) : '';
  const selectedAcademicYearId = selectedAcademicYear
    ? String(selectedAcademicYear.id)
    : '';
  const [searchFilter, setSearchFilter] = useState('');

  // Matrix Data & Tracking
  const [students, setStudents] = useState([]);
  const [originalStudents, setOriginalStudents] = useState([]);
  const [modifiedMap, setModifiedMap] = useState({}); // { [studentId]: { ...changedFields } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Active Cell Navigation state: { rowIndex: number, colKey: string }
  const [focusedCell, setFocusedCell] = useState(null);
  const tableRef = useRef(null);

  const columns = [
    { key: 'roll_no', label: 'Roll No', width: 'w-24', type: 'text' },
    { key: 'section_id', label: 'Section', width: 'w-28', type: 'select-section' },
    { key: 'student_name', label: 'Student Name', width: 'w-56', type: 'text' },
    { key: 'gender', label: 'Gender', width: 'w-28', type: 'select-gender' },
    { key: 'dob', label: 'Date of Birth', width: 'w-36', type: 'date' },
    { key: 'blood_group', label: 'Blood Grp', width: 'w-28', type: 'select-blood' },
    { key: 'primary_phone', label: 'Primary Phone', width: 'w-36', type: 'tel' },
    { key: 'admission_category', label: 'Category', width: 'w-32', type: 'select-category' },
  ];

  // Auto-select first class if none selected and classes exist
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(String(classes[0].id));
    }
  }, [classes, selectedClassId, setSelectedClassId]);

  // Fetch Students for Matrix
  const fetchMatrixStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setOriginalStudents([]);
      setModifiedMap({});
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') params.set('branch_id', selectedBranchId);
      if (selectedAcademicYearId) params.set('academic_year_id', selectedAcademicYearId);
      params.set('class_id', selectedClassId);
      if (selectedSectionId) params.set('section_id', selectedSectionId);

      const res = await api.get(`/students?${params.toString()}`);
      const list = Array.isArray(res) ? res : res.students || res.data || [];
      const formatted = list.map((s) => ({
        ...s,
        dob: s.dob ? s.dob.slice(0, 10) : '',
        primary_phone: s.primary_phone || s.father_phone || '',
        admission_category: s.admission_category || 'General',
        section_id: s.section_id ? String(s.section_id) : '',
      }));

      setStudents(formatted);
      setOriginalStudents(JSON.parse(JSON.stringify(formatted)));
      setModifiedMap({});
    } catch (err) {
      console.error('Failed to load students for matrix:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load student matrix' });
      setStudents([]);
      setOriginalStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedAcademicYearId, selectedClassId, selectedSectionId]);

  useEffect(() => {
    fetchMatrixStudents();
  }, [fetchMatrixStudents]);

  // Handle Cell Value Change
  const handleCellChange = (studentId, key, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, [key]: value } : s))
    );

    // Track in modifiedMap
    const original = originalStudents.find((s) => s.id === studentId);
    if (!original) return;

    setModifiedMap((prev) => {
      const currentMods = { ...(prev[studentId] || {}), [key]: value };

      // If matches original, remove that key
      if (String(original[key] || '') === String(value || '')) {
        delete currentMods[key];
      }

      // If no keys left modified for this student, delete student from map
      if (Object.keys(currentMods).length === 0) {
        const next = { ...prev };
        delete next[studentId];
        return next;
      }

      return {
        ...prev,
        [studentId]: {
          id: studentId,
          enrollment_id: original.enrollment_id,
          ...currentMods,
        },
      };
    });
  };

  // Discard all changes
  const handleDiscard = () => {
    if (Object.keys(modifiedMap).length === 0) return;
    if (window.confirm('Discard all unsaved changes and reset matrix?')) {
      setStudents(JSON.parse(JSON.stringify(originalStudents)));
      setModifiedMap({});
    }
  };

  // Batch Save Changes
  const handleBatchSave = async () => {
    const modifiedCount = Object.keys(modifiedMap).length;
    if (modifiedCount === 0) return;

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        students: Object.values(modifiedMap),
      };

      await api.post('/students/bulk-update', payload);
      setMessage({
        type: 'success',
        text: `Successfully updated ${modifiedCount} student records!`,
      });
      // Re-baseline original data
      setOriginalStudents(JSON.parse(JSON.stringify(students)));
      setModifiedMap({});
    } catch (err) {
      console.error('Failed to save bulk changes:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save changes. Please review and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Keyboard Navigation Handlers
  const handleKeyDown = (e, rowIndex, colIndex) => {
    const totalRows = filteredStudents.length;
    const totalCols = columns.length;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex < totalRows - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, colIndex);
      }
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (colIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex - 1, totalCols - 1);
        }
      } else {
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          focusCell(rowIndex, colIndex + 1);
        } else if (rowIndex < totalRows - 1) {
          e.preventDefault();
          focusCell(rowIndex + 1, 0);
        }
      }
    }
  };

  const focusCell = (rowIndex, colIndex) => {
    const input = document.getElementById(`cell-${rowIndex}-${colIndex}`);
    if (input) {
      input.focus();
      if (input.select) input.select();
      setFocusedCell({ rowIndex, colIndex });
    }
  };

  // Filter students by in-grid search
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return students;
    const q = searchFilter.toLowerCase();
    return students.filter(
      (s) =>
        (s.student_name && s.student_name.toLowerCase().includes(q)) ||
        (s.admission_no && s.admission_no.toLowerCase().includes(q)) ||
        (s.roll_no && String(s.roll_no).toLowerCase().includes(q)) ||
        (s.primary_phone && s.primary_phone.includes(q))
    );
  }, [students, searchFilter]);

  const modifiedCount = Object.keys(modifiedMap).length;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 flex flex-col p-4 sm:p-6 overflow-hidden'
          : 'space-y-6'
      }
    >
      {/* Toast Notice */}
      {message && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-xs shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Back to Directory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Bulk Grid Editor
                </h1>
                {modifiedCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {modifiedCount} Modified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Excel-style spreadsheet editing with full keyboard navigation and multi-row batch save
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {modifiedCount > 0 && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving || modifiedCount === 0}
              onClick={handleBatchSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-40 transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save {modifiedCount > 0 ? `${modifiedCount} Changes` : 'Changes'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          {/* Branch */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Campus / Branch</label>
            <select
              value={selectedBranchId || (selectedBranch?.id === 'all' ? 'all' : '')}
              onChange={(e) => changeBranch(e.target.value)}
              disabled={user?.role !== 'super_admin' && Boolean(user?.branch_id)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {user?.role === 'super_admin' && <option value="all">All Campuses</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Academic Year</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                const yr = academicYears.find((ay) => String(ay.id) === e.target.value);
                changeAcademicYear(yr || null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.year_name || ay.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class (Mandatory for matrix) */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select Class to Edit</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Section Filter</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* In-Grid Quick Search */}
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Filter in Table</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or Roll No..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Matrix Canvas */}
      <div
        className={`bg-white rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col ${
          isFullscreen ? 'flex-1 mt-4' : 'min-h-[480px]'
        }`}
      >
        {/* Table Toolbar Info */}
        <div className="px-5 py-3 border-b border-border bg-slate-50/70 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Rows: <strong>{filteredStudents.length}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Navigation: Use <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">Arrow Keys</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">Tab</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">Enter</kbd>
            </span>
          </div>

          {modifiedCount > 0 && (
            <span className="text-amber-700 font-medium">
              * Highlighted amber rows contain unsaved edits
            </span>
          )}
        </div>

        {/* Scrollable Matrix Table */}
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-20 border-b border-slate-200 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">#</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-200">Adm No</th>
                {columns.map((col, cIdx) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 ${col.width} border-r border-slate-200`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                      <span>Loading spreadsheet matrix...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No students to display</p>
                      <p className="text-xs text-slate-400">
                        Select a Class above to load its editable student roster.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, rIdx) => {
                  const isModified = Boolean(modifiedMap[student.id]);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isModified ? 'bg-amber-50/70 hover:bg-amber-100/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Row Index with Modified Dot */}
                      <td className="py-1 px-2 text-center text-slate-400 border-r border-slate-200 font-mono text-[11px] select-none">
                        <div className="flex items-center justify-center gap-1">
                          {isModified && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                              title="Unsaved changes"
                            />
                          )}
                          <span>{rIdx + 1}</span>
                        </div>
                      </td>

                      {/* Admission No (Read-only identifier) */}
                      <td className="py-1 px-3 border-r border-slate-200 font-mono text-slate-600 select-none bg-slate-50/50">
                        {student.admission_no}
                      </td>

                      {/* Editable Cells */}
                      {columns.map((col, cIdx) => {
                        const cellId = `cell-${rIdx}-${cIdx}`;
                        const value = student[col.key] || '';

                        // Render specialized editors
                        if (col.type === 'select-gender') {
                          return (
                            <td key={col.key} className="p-0 border-r border-slate-200">
                              <select
                                id={cellId}
                                value={value}
                                onChange={(e) =>
                                  handleCellChange(student.id, col.key, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                className="w-full h-full px-2.5 py-2 bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-none cursor-pointer"
                              >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                          );
                        }

                        if (col.type === 'select-section') {
                          return (
                            <td key={col.key} className="p-0 border-r border-slate-200">
                              <select
                                id={cellId}
                                value={value}
                                onChange={(e) =>
                                  handleCellChange(student.id, col.key, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                className="w-full h-full px-2.5 py-2 bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-none cursor-pointer"
                              >
                                <option value="">None</option>
                                {sections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    Sec {sec.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.type === 'select-blood') {
                          return (
                            <td key={col.key} className="p-0 border-r border-slate-200">
                              <select
                                id={cellId}
                                value={value}
                                onChange={(e) =>
                                  handleCellChange(student.id, col.key, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                className="w-full h-full px-2.5 py-2 bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-none cursor-pointer"
                              >
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                              </select>
                            </td>
                          );
                        }

                        if (col.type === 'select-category') {
                          return (
                            <td key={col.key} className="p-0 border-r border-slate-200">
                              <select
                                id={cellId}
                                value={value}
                                onChange={(e) =>
                                  handleCellChange(student.id, col.key, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                className="w-full h-full px-2.5 py-2 bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-none cursor-pointer capitalize"
                              >
                                <option value="General">General</option>
                                <option value="OBC">OBC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="EWS">EWS</option>
                                <option value="Management">Management</option>
                                <option value="RTE">RTE</option>
                              </select>
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} className="p-0 border-r border-slate-200">
                            <input
                              id={cellId}
                              type={col.type}
                              value={value}
                              onChange={(e) =>
                                handleCellChange(student.id, col.key, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                              className="w-full h-full px-3 py-2 bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 rounded-none font-sans"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
