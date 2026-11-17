import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  Phone,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  FileText,
  UserCheck,
  Shield,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const StudentList = () => {
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

  const selectedBranchId =
    selectedBranch && selectedBranch.id !== 'all' ? String(selectedBranch.id) : '';
  const selectedAcademicYearId = selectedAcademicYear
    ? String(selectedAcademicYear.id)
    : '';

  // Other Filters
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [search, setSearch] = useState('');

  // Roster state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Quick TC Modal state
  const [quickTcStudent, setQuickTcStudent] = useState(null);
  const [tcFormData, setTcFormData] = useState({
    leaving_date: new Date().toISOString().slice(0, 10),
    reason_for_leaving: 'Parent Request / Relocation',
    conduct: 'Good',
    dues_cleared: 'yes',
    remarks: '',
  });
  const [submittingTc, setSubmittingTc] = useState(false);

  // Delete Confirmation Modal state
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Fetch Students Roster
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        queryParams.set('branch_id', selectedBranchId);
      }
      if (selectedAcademicYearId) {
        queryParams.set('academic_year_id', selectedAcademicYearId);
      }
      if (selectedClassId) {
        queryParams.set('class_id', selectedClassId);
      }
      if (selectedSectionId) {
        queryParams.set('section_id', selectedSectionId);
      }
      if (selectedStatus && selectedStatus !== 'all') {
        queryParams.set('status', selectedStatus);
      }
      if (search.trim()) {
        queryParams.set('search', search.trim());
      }

      const res = await api.get(`/students?${queryParams.toString()}`);
      const list = Array.isArray(res) ? res : res.students || res.data || [];
      setStudents(list);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      // Fallback: If backend is freshly migrating or returns 404, default to empty list
      setStudents([]);
      setMessage({ type: 'error', text: err.message || 'Failed to load student directory' });
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranchId,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
    selectedStatus,
    search,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Delete Student
  const handleDeleteStudent = async () => {
    if (!deleteStudentTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteStudentTarget.id}`);
      setMessage({ type: 'success', text: 'Student record removed successfully' });
      setDeleteStudentTarget(null);
      fetchStudents();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete student' });
    } finally {
      setDeleting(false);
    }
  };

  // Quick TC Submit
  const handleQuickTcSubmit = async (e) => {
    e.preventDefault();
    if (!quickTcStudent) return;
    setSubmittingTc(true);
    try {
      await api.post(`/students/tc`, {
        student_id: quickTcStudent.id,
        enrollment_id: quickTcStudent.enrollment_id,
        branch_id: quickTcStudent.branch_id || selectedBranchId,
        ...tcFormData,
      });
      setMessage({
        type: 'success',
        text: `Transfer Certificate issued for ${quickTcStudent.student_name}. Status changed to Transferred.`,
      });
      setQuickTcStudent(null);
      fetchStudents();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to issue Transfer Certificate' });
    } finally {
      setSubmittingTc(false);
    }
  };

  // CSV Template Generator
  const downloadCsvTemplate = () => {
    const headers = [
      'admission_no',
      'student_name',
      'gender',
      'dob',
      'class_code',
      'section_name',
      'roll_no',
      'parent_name',
      'primary_phone',
      'address_street',
      'city',
    ];
    const sampleRows = [
      [
        'ADM2024-001',
        'Aarav Sharma',
        'male',
        '2012-05-14',
        'STD-05',
        'A',
        '101',
        'Rajesh Sharma',
        '9876543210',
        '12 Park Avenue',
        'Bengaluru',
      ],
      [
        'ADM2024-002',
        'Diya Patel',
        'female',
        '2012-08-22',
        'STD-05',
        'B',
        '102',
        'Mahesh Patel',
        '9876543211',
        '45 MG Road',
        'Bengaluru',
      ],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Parsing & Client-Side Pre-validation
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text
        .split(/\r\n|\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) {
        setParsedRows([]);
        setValidationResults([]);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = [];
      const validations = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });

        // Pre-validate row
        const errors = [];
        if (!row.admission_no) errors.push('Missing Admission No');
        if (!row.student_name) errors.push('Missing Student Name');
        if (!row.gender || !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
          errors.push('Gender must be male, female, or other');
        }
        if (row.dob && !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) {
          errors.push('DOB must be in YYYY-MM-DD format');
        }
        if (!row.primary_phone) {
          errors.push('Missing Primary Phone');
        }

        rows.push(row);
        validations.push({
          rowNumber: i + 1,
          isValid: errors.length === 0,
          errors,
        });
      }

      setParsedRows(rows);
      setValidationResults(validations);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    const validRows = parsedRows.filter((_, idx) => validationResults[idx]?.isValid);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        branch_id: selectedBranchId,
        academic_year_id: selectedAcademicYearId,
        students: validRows,
      };
      const res = await api.post('/students/import-csv', payload);
      setImportSummary({
        success: true,
        count: res.importedCount || validRows.length,
        skipped: parsedRows.length - validRows.length,
      });
      fetchStudents();
    } catch (err) {
      console.error('Import error:', err);
      setImportSummary({
        success: false,
        error: err.message || 'Failed to import CSV batch',
      });
    } finally {
      setImporting(false);
    }
  };

  const validCount = useMemo(() => validationResults.filter((v) => v.isValid).length, [validationResults]);
  const invalidCount = useMemo(() => validationResults.filter((v) => !v.isValid).length, [validationResults]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
              <p className="text-sm text-slate-500">
                Centralized student records, enrollment roster, and lifecycle actions
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/students/bulk-edit')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk Grid Editor</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/students/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Admission</span>
          </button>
        </div>
      </div>

      {/* Responsive Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Branch Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Campus / Branch</label>
            <select
              value={selectedBranchId || (selectedBranch?.id === 'all' ? 'all' : '')}
              onChange={(e) => changeBranch(e.target.value)}
              disabled={user?.role !== 'super_admin' && Boolean(user?.branch_id)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {user?.role === 'super_admin' && <option value="all">All Campuses</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Academic Year</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                const yr = academicYears.find((ay) => String(ay.id) === e.target.value);
                changeAcademicYear(yr || null);
              }}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.year_name || ay.name || ay.code}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!selectedClassId}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="transferred">Transferred (TC)</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Search Student</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, Adm No, Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Table Header Stats */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Enrolled Students</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
              {students.length} Records
            </span>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Adm No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-3">Roll No</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-3">Gender</th>
                <th className="py-3.5 px-4">Parent Details</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                      <span className="text-sm">Loading student directory...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No student records found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your filters or click "New Admission" to register students.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const statusVariant =
                    student.status === 'active'
                      ? 'active'
                      : student.status === 'transferred'
                      ? 'upcoming'
                      : student.status === 'inactive'
                      ? 'inactive'
                      : 'default';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Admission No */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {student.admission_no}
                      </td>

                      {/* Student Name + Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.student_name ? student.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <span
                              onClick={() => navigate(`/students/${student.id}/edit`)}
                              className="font-semibold text-slate-900 hover:text-brand-600 cursor-pointer transition-colors block text-sm"
                            >
                              {student.student_name}
                            </span>
                            {student.admission_category && (
                              <span className="text-[10px] text-slate-400 capitalize">
                                Cat: {student.admission_category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Roll No */}
                      <td className="py-3.5 px-3 font-semibold text-slate-600">
                        {student.roll_no || '—'}
                      </td>

                      {/* Class & Section */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-medium">
                          {student.class_name || student.class_code || 'Unassigned'}
                          {student.section_name ? ` - ${student.section_name}` : ''}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="py-3.5 px-3 capitalize">
                        {student.gender || '—'}
                      </td>

                      {/* Parent Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800">
                            {student.father_name || student.parent_name || student.guardian_name || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Phone className="w-3 h-3" />
                            <span>{student.primary_phone || student.father_phone || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <Badge variant={statusVariant}>
                          {student.status || 'Active'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/students/${student.id}/edit`)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="View / Edit Profile"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {student.status !== 'transferred' && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickTcStudent(student);
                                setTcFormData({
                                  leaving_date: new Date().toISOString().slice(0, 10),
                                  reason_for_leaving: 'Parent Request / Relocation',
                                  conduct: 'Good',
                                  dues_cleared: 'yes',
                                  remarks: '',
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Quick Issue Transfer Certificate (TC)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteStudentTarget(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK TC MODAL */}
      <Modal
        isOpen={Boolean(quickTcStudent)}
        onClose={() => setQuickTcStudent(null)}
        title="Quick Transfer Certificate (TC) Issuance"
        maxWidth="max-w-md"
      >
        {quickTcStudent && (
          <form onSubmit={handleQuickTcSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  Issuing TC for {quickTcStudent.student_name}
                </p>
                <p className="text-amber-700 mt-0.5">
                  Admission No: <span className="font-mono">{quickTcStudent.admission_no}</span> | Class:{' '}
                  {quickTcStudent.class_name || 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Leaving Date *</label>
              <input
                type="date"
                required
                value={tcFormData.leaving_date}
                onChange={(e) => setTcFormData({ ...tcFormData, leaving_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Leaving *</label>
              <input
                type="text"
                required
                placeholder="e.g. Relocated to another city / Course Completion"
                value={tcFormData.reason_for_leaving}
                onChange={(e) => setTcFormData({ ...tcFormData, reason_for_leaving: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conduct & Character</label>
                <select
                  value={tcFormData.conduct}
                  onChange={(e) => setTcFormData({ ...tcFormData, conduct: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Satisfactory">Satisfactory</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Fee Dues Cleared?</label>
                <select
                  value={tcFormData.dues_cleared}
                  onChange={(e) => setTcFormData({ ...tcFormData, dues_cleared: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="yes">Yes, All Dues Cleared</option>
                  <option value="no">Pending Dues</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remarks / Note</label>
              <textarea
                rows={2}
                placeholder="Optional remarks on certificate..."
                value={tcFormData.remarks}
                onChange={(e) => setTcFormData({ ...tcFormData, remarks: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickTcStudent(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingTc}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {submittingTc ? 'Issuing...' : 'Issue TC & Update Status'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteStudentTarget)}
        onClose={() => setDeleteStudentTarget(null)}
        title="Delete Student Record"
        maxWidth="max-w-md"
      >
        {deleteStudentTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">
                  Are you sure you want to delete this student?
                </p>
                <p className="text-rose-700 mt-1">
                  Student: <span className="font-bold">{deleteStudentTarget.student_name}</span> (
                  {deleteStudentTarget.admission_no})
                </p>
                <p className="text-rose-600 text-[11px] mt-1">
                  This will remove the student profile and active enrollment. This action cannot be
                  undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteStudentTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStudent}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CSV IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setParsedRows([]);
          setValidationResults([]);
          setImportSummary(null);
        }}
        title="Import Students from CSV"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Instructions and Download Template */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">Need the CSV Template?</p>
              <p className="text-slate-500 text-[11px]">
                Download our formatted template with all required student & enrollment headers.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium shrink-0 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-brand-600" />
              <span>Download Template (.csv)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors bg-white">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Choose CSV file to upload</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Supports UTF-8 CSV up to 10MB</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-3 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          {/* Pre-validation Results Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Data Preview & Verification ({parsedRows.length} Total Rows)
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">
                    {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-medium">
                      {invalidCount} Errors
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-50 sticky top-0 border-b border-border text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Adm No</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Class/Sec</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.slice(0, 15).map((row, idx) => {
                      const validation = validationResults[idx];
                      return (
                        <tr
                          key={idx}
                          className={validation?.isValid ? 'bg-white' : 'bg-rose-50/50'}
                        >
                          <td className="py-1.5 px-3 font-mono">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono">{row.admission_no || '—'}</td>
                          <td className="py-1.5 px-3 font-medium">{row.student_name || '—'}</td>
                          <td className="py-1.5 px-3">
                            {row.class_code || '—'} / {row.section_name || '—'}
                          </td>
                          <td className="py-1.5 px-3">{row.primary_phone || '—'}</td>
                          <td className="py-1.5 px-3">
                            {validation?.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-medium" title={validation?.errors.join(', ')}>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {validation?.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[11px] text-slate-400 italic text-right">
                  Showing first 15 of {parsedRows.length} rows
                </p>
              )}
            </div>
          )}

          {/* Import Summary Feedback */}
          {importSummary && (
            <div
              className={`p-3 rounded-xl border ${
                importSummary.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {importSummary.success ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Successfully imported <strong>{importSummary.count}</strong> students! (
                    {importSummary.skipped} invalid rows skipped).
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{importSummary.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="button"
              disabled={importing || validCount === 0}
              onClick={handleImportSubmit}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Batch...</span>
                </>
              ) : (
                <span>Import {validCount} Valid Students</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
