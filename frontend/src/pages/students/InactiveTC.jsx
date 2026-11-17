import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Building2,
  Calendar,
  GraduationCap,
  Download,
  Filter,
  UserX,
  ShieldCheck,
  Award,
  Sparkles,
  X,
  FileCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const InactiveTC = () => {
  const { user, selectedBranch, branches = [], selectedAcademicYear, academicYears = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Active Tab: 'inactive' | 'tc_register'
  const [activeTab, setActiveTab] = useState('inactive');

  // Scope Filters
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingYearFilter, setLeavingYearFilter] = useState('all');

  // Inactive Students List
  const [inactiveStudents, setInactiveStudents] = useState([]);
  const [loadingInactive, setLoadingInactive] = useState(false);

  // Issued TCs List
  const [tcList, setTcList] = useState([]);
  const [loadingTC, setLoadingTC] = useState(false);

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedStudentForTC, setSelectedStudentForTC] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTCForPrint, setSelectedTCForPrint] = useState(null);

  // Form State for Issuing TC
  const [tcFormData, setTcFormData] = useState({
    leaving_date: new Date().toISOString().split('T')[0],
    application_date: new Date().toISOString().split('T')[0],
    reason_for_leaving: 'Parent Relocation / Transfer',
    custom_reason: '',
    conduct: 'Good',
    dues_cleared: 'yes',
    month_dues_paid: 'March 2026',
    last_class_studied: '',
    last_exam_result: 'Passed Annual Examination',
    failed_status: 'No',
    promoted_to_class: 'Eligible for Next Higher Class',
    working_days: 210,
    present_days: 195,
    subjects_studied: 'English, Mathematics, Science, Social Science, Hindi',
    fee_concession: 'None',
    extra_activities: 'School Football Team, Cultural Club',
    remarks: 'Pleasant student, good moral character.',
  });

  const [submittingTC, setSubmittingTC] = useState(false);
  const [toast, setToast] = useState(null);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync Branch
  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    } else if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0].id));
    }
  }, [selectedBranch, branches]);

  // Fetch Inactive Students
  const fetchInactiveStudents = useCallback(async () => {
    if (!selectedBranchId) return;

    setLoadingInactive(true);
    try {
      const res = await api.get(
        `/students?branch_id=${selectedBranchId}&status=inactive`
      );
      const list = res.students || res.data || [];
      setInactiveStudents(list);
    } catch (err) {
      console.error('Failed to load inactive students:', err);
      setInactiveStudents([]);
    } finally {
      setLoadingInactive(false);
    }
  }, [selectedBranchId]);

  // Fetch Issued TCs
  const fetchTCList = useCallback(async () => {
    if (!selectedBranchId) return;

    setLoadingTC(true);
    try {
      const res = await api.get(`/students/tc?branch_id=${selectedBranchId}`);
      const list = res.transfer_certificates || res.tcs || res.data || [];
      setTcList(list);
    } catch (err) {
      console.error('Failed to load TC list:', err);
      // Fallback: check if tc list is inside inactive students
      setTcList([]);
    } finally {
      setLoadingTC(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchInactiveStudents();
    fetchTCList();
  }, [fetchInactiveStudents, fetchTCList]);

  // Filtered Inactive Students
  const filteredInactiveStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inactiveStudents.filter((s) => {
      const name = (s.student_name || s.name || '').toLowerCase();
      const adm = (s.admission_no || '').toLowerCase();
      const reason = (s.leaving_reason || '').toLowerCase();
      const matchesQuery = !q || name.includes(q) || adm.includes(q) || reason.includes(q);

      if (leavingYearFilter === 'all') return matchesQuery;
      const date = s.leaving_date || s.updated_at || '';
      return matchesQuery && date.includes(leavingYearFilter);
    });
  }, [inactiveStudents, searchQuery, leavingYearFilter]);

  // Filtered Issued TCs
  const filteredTCList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tcList.filter((tc) => {
      const tcNo = (tc.tc_no || '').toLowerCase();
      const name = (tc.student_name || '').toLowerCase();
      const adm = (tc.admission_no || '').toLowerCase();
      return !q || tcNo.includes(q) || name.includes(q) || adm.includes(q);
    });
  }, [tcList, searchQuery]);

  // Open Issue TC Modal
  const handleOpenIssueTC = (student) => {
    setSelectedStudentForTC(student);
    setTcFormData({
      leaving_date: student.leaving_date || new Date().toISOString().split('T')[0],
      application_date: new Date().toISOString().split('T')[0],
      reason_for_leaving: 'Parent Relocation / Transfer',
      custom_reason: '',
      conduct: 'Good',
      dues_cleared: 'yes',
      month_dues_paid: 'Current Month',
      last_class_studied: student.class_name ? `Class ${student.class_name}` : 'Class 10',
      last_exam_result: 'Passed Annual Examination',
      failed_status: 'No',
      promoted_to_class: 'Eligible for Next Higher Class',
      working_days: 210,
      present_days: 195,
      subjects_studied: 'English, Mathematics, Science, Social Science, Hindi',
      fee_concession: 'None',
      extra_activities: 'School Activities, Sports',
      remarks: 'Good character and moral conduct.',
    });
    setIsIssueModalOpen(true);
  };

  // Submit Issue TC
  const handleSubmitIssueTC = async (e) => {
    e.preventDefault();
    if (!selectedStudentForTC) return;

    setSubmittingTC(true);
    try {
      const finalReason =
        tcFormData.reason_for_leaving === 'Other'
          ? tcFormData.custom_reason
          : tcFormData.reason_for_leaving;

      const payload = {
        student_id: selectedStudentForTC.id || selectedStudentForTC.student_id,
        branch_id: Number(selectedBranchId),
        leaving_date: tcFormData.leaving_date,
        application_date: tcFormData.application_date,
        reason_for_leaving: finalReason,
        conduct: tcFormData.conduct,
        dues_cleared: tcFormData.dues_cleared === 'yes',
        month_dues_paid: tcFormData.month_dues_paid,
        last_class_studied: tcFormData.last_class_studied,
        last_exam_result: tcFormData.last_exam_result,
        failed_status: tcFormData.failed_status,
        promoted_to_class: tcFormData.promoted_to_class,
        working_days: Number(tcFormData.working_days),
        present_days: Number(tcFormData.present_days),
        subjects_studied: tcFormData.subjects_studied,
        fee_concession: tcFormData.fee_concession,
        extra_activities: tcFormData.extra_activities,
        remarks: tcFormData.remarks,
      };

      const res = await api.post('/students/tc', payload);

      setToast({
        type: 'success',
        message: `Transfer Certificate successfully issued for ${
          selectedStudentForTC.student_name || selectedStudentForTC.name
        }!`,
      });

      setIsIssueModalOpen(false);

      // Re-fetch lists
      await Promise.all([fetchInactiveStudents(), fetchTCList()]);

      // Automatically open the print certificate preview
      const generatedTC = res.transfer_certificate || res.tc || {
        ...payload,
        id: res.id || Date.now(),
        tc_no: res.tc_no || `TC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        student_name: selectedStudentForTC.student_name || selectedStudentForTC.name,
        admission_no: selectedStudentForTC.admission_no,
        father_name: selectedStudentForTC.father_name || 'N/A',
        mother_name: selectedStudentForTC.mother_name || 'N/A',
        dob: selectedStudentForTC.dob || '2010-05-15',
        nationality: selectedStudentForTC.nationality || 'Indian',
        issue_date: new Date().toISOString().split('T')[0],
      };

      handleOpenPrintModal(generatedTC);
    } catch (err) {
      console.error('Failed to issue TC:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to issue Transfer Certificate. Please verify required fields.',
      });
    } finally {
      setSubmittingTC(false);
    }
  };

  // Open Print Modal
  const handleOpenPrintModal = async (tcItem) => {
    // If tcItem has minimal fields, try fetching full TC details
    if (tcItem.id && (!tcItem.student_name || !tcItem.father_name)) {
      try {
        const fullRes = await api.get(`/students/tc/${tcItem.id}`);
        setSelectedTCForPrint(fullRes.tc || fullRes.data || tcItem);
      } catch {
        setSelectedTCForPrint(tcItem);
      }
    } else {
      setSelectedTCForPrint(tcItem);
    }
    setIsPrintModalOpen(true);
  };

  // Convert number date to readable words (e.g. 15th May Two Thousand Ten)
  const formatDOBInWords = (dobString) => {
    if (!dobString) return 'Not Recorded';
    try {
      const d = new Date(dobString);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dobString;
    }
  };

  const branchObj = branches.find((b) => String(b.id) === String(selectedBranchId));

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Inactive Records & TC Register</h1>
            <p className="text-sm text-muted mt-1">
              Manage withdrawn students, track exit records, and generate official Government/Board compliant Transfer Certificates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchInactiveStudents();
              fetchTCList();
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted" />
            Refresh
          </button>
        </div>
      </div>

      {/* View Switcher Tabs & Filters */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Segmented Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('inactive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'inactive'
                  ? 'bg-white text-heading shadow-sm'
                  : 'text-muted hover:text-heading'
              }`}
            >
              <UserX className="w-4 h-4 text-rose-500" />
              <span>Withdrawn / Inactive Students</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {inactiveStudents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tc_register')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'tc_register'
                  ? 'bg-white text-heading shadow-sm'
                  : 'text-muted hover:text-heading'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Issued TC Register</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {tcList.length}
              </span>
            </button>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Branch:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!isSuperAdmin && branches.length <= 1}
              className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold focus:ring-1 focus:ring-brand-500"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Sub-filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder={
                activeTab === 'inactive'
                  ? 'Search by student name, admission no, reason...'
                  : 'Search by TC No, student name, admission no...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {activeTab === 'inactive' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted">Leaving Year:</span>
              <select
                value={leavingYearFilter}
                onChange={(e) => setLeavingYearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white font-medium"
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: Inactive / Withdrawn Students Directory */}
      {activeTab === 'inactive' && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border text-xs uppercase text-muted font-semibold">
                <tr>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Last Class & Section</th>
                  <th className="py-3 px-4">Parent / Phone</th>
                  <th className="py-3 px-4">Leaving Date</th>
                  <th className="py-3 px-4">Exit Status</th>
                  <th className="py-3 px-4">TC Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingInactive ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                      <span>Loading inactive student records...</span>
                    </td>
                  </tr>
                ) : filteredInactiveStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted">
                      <UserX className="w-10 h-10 stroke-[1.5] mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-sm font-semibold text-heading">No inactive records found</p>
                      <p className="text-xs text-muted mt-0.5">
                        Students marked as withdrawn, graduated, or transferred will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInactiveStudents.map((student) => {
                    const hasTC = Boolean(student.tc_issued || student.tc_no);

                    return (
                      <tr key={student.id || student.student_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-xs text-brand-700">
                          {student.admission_no}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-heading">
                            {student.student_name || student.name}
                          </div>
                          <div className="text-xs text-muted">
                            Gender: {student.gender || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">
                          {student.class_name ? `Class ${student.class_name}` : '—'}{' '}
                          {student.section_name ? `(${student.section_name})` : ''}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>{student.father_name || student.parent_name || '—'}</div>
                          <div className="text-muted font-mono">{student.father_phone || student.phone || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                          {student.leaving_date || student.updated_at?.split('T')[0] || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            {student.enrollment_status || student.status || 'Withdrawn'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {hasTC ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              TC Issued ({student.tc_no || 'Recorded'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              No TC Issued
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {hasTC ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPrintModal(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-slate-100 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5 text-brand-600" />
                              View/Print TC
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenIssueTC(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Issue TC
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Issued Transfer Certificates Register */}
      {activeTab === 'tc_register' && (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-border text-xs uppercase text-muted font-semibold">
                <tr>
                  <th className="py-3 px-4">TC Number</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Last Class Studied</th>
                  <th className="py-3 px-4">Reason for Leaving</th>
                  <th className="py-3 px-4">Conduct</th>
                  <th className="py-3 px-4">Dues Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingTC ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                      <span>Loading TC register...</span>
                    </td>
                  </tr>
                ) : filteredTCList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      <FileCheck className="w-10 h-10 stroke-[1.5] mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-sm font-semibold text-heading">No Transfer Certificates Issued Yet</p>
                      <p className="text-xs text-muted mt-0.5">
                        Issue a TC from the Withdrawn / Inactive Students tab to register here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTCList.map((tc) => (
                    <tr key={tc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-brand-700">
                        {tc.tc_no}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">
                        {tc.issue_date || tc.created_at?.split('T')[0] || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {tc.admission_no}
                      </td>
                      <td className="py-3 px-4 font-semibold text-heading">
                        {tc.student_name}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {tc.last_class_studied || 'Class 10'}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted max-w-[200px] truncate">
                        {tc.reason_for_leaving}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tc.conduct || 'Good'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {tc.dues_cleared ? (
                          <span className="text-emerald-700 font-medium">Cleared</span>
                        ) : (
                          <span className="text-rose-700 font-medium">Dues Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintModal(tc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-brand-600" />
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ISSUE TRANSFER CERTIFICATE MODAL */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Issue Official Transfer Certificate (TC)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitIssueTC} className="space-y-5">
          {/* Student Banner */}
          {selectedStudentForTC && (
            <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-muted block">Student Candidate</span>
                <span className="text-sm font-bold text-heading">
                  {selectedStudentForTC.student_name || selectedStudentForTC.name}
                </span>
                <div className="text-muted mt-0.5">
                  Adm No: <strong>{selectedStudentForTC.admission_no}</strong> | Father:{' '}
                  <strong>{selectedStudentForTC.father_name || 'N/A'}</strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-muted block">Current / Last Class</span>
                <span className="font-semibold text-brand-800">
                  {selectedStudentForTC.class_name
                    ? `Class ${selectedStudentForTC.class_name}`
                    : 'Class 10'}{' '}
                  (Sec {selectedStudentForTC.section_name || 'A'})
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leaving Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Leaving Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tcFormData.leaving_date}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, leaving_date: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-medium"
              />
            </div>

            {/* Application Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Application Received Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tcFormData.application_date}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, application_date: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-medium"
              />
            </div>

            {/* Reason for Leaving */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Leaving School <span className="text-rose-500">*</span>
              </label>
              <select
                value={tcFormData.reason_for_leaving}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, reason_for_leaving: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-medium bg-white"
              >
                <option value="Parent Relocation / Transfer">Parent Relocation / Transfer</option>
                <option value="Completed Course / Passed Highest Class">Completed Course / Passed Highest Class</option>
                <option value="Admitted to Higher Education Institution">Admitted to Higher Education Institution</option>
                <option value="Parent's Personal Request">Parent's Personal Request</option>
                <option value="Distance / Commute Issues">Distance / Commute Issues</option>
                <option value="Other">Other (Specify Below)</option>
              </select>

              {tcFormData.reason_for_leaving === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify custom reason..."
                  value={tcFormData.custom_reason}
                  onChange={(e) =>
                    setTcFormData({ ...tcFormData, custom_reason: e.target.value })
                  }
                  required
                  className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500"
                />
              )}
            </div>

            {/* General Conduct */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                General Conduct & Character
              </label>
              <select
                value={tcFormData.conduct}
                onChange={(e) => setTcFormData({ ...tcFormData, conduct: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-medium bg-white"
              >
                <option value="Exemplary">Exemplary</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Satisfactory">Satisfactory</option>
              </select>
            </div>

            {/* Fee Dues Cleared */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fee Dues Cleared?
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="dues_cleared"
                    value="yes"
                    checked={tcFormData.dues_cleared === 'yes'}
                    onChange={() => setTcFormData({ ...tcFormData, dues_cleared: 'yes' })}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Yes - Full Dues Cleared</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="dues_cleared"
                    value="no"
                    checked={tcFormData.dues_cleared === 'no'}
                    onChange={() => setTcFormData({ ...tcFormData, dues_cleared: 'no' })}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>No - Dues Pending</span>
                </label>
              </div>
            </div>

            {/* Month up to which dues paid */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Month Up to Which Dues Paid
              </label>
              <input
                type="text"
                placeholder="e.g. March 2026"
                value={tcFormData.month_dues_paid}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, month_dues_paid: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Last Class Studied */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class in Which Last Studied
              </label>
              <input
                type="text"
                placeholder="e.g. Class 10 (Tenth)"
                value={tcFormData.last_class_studied}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, last_class_studied: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Promoted to Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qualified for Promotion to Class
              </label>
              <input
                type="text"
                placeholder="e.g. Class 11 (Eleventh) or N/A"
                value={tcFormData.promoted_to_class}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, promoted_to_class: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Attendance Days */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Working Days
                </label>
                <input
                  type="number"
                  value={tcFormData.working_days}
                  onChange={(e) =>
                    setTcFormData({ ...tcFormData, working_days: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Days Present
                </label>
                <input
                  type="number"
                  value={tcFormData.present_days}
                  onChange={(e) =>
                    setTcFormData({ ...tcFormData, present_days: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Any Other Remarks
              </label>
              <input
                type="text"
                placeholder="Remarks, character appraisal..."
                value={tcFormData.remarks}
                onChange={(e) =>
                  setTcFormData({ ...tcFormData, remarks: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={submittingTC}
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTC}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              {submittingTC ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Issuing TC...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Issue & Generate Certificate
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* OFFICIAL PRINTABLE CERTIFICATE VIEW / PRINT MODAL */}
      {isPrintModalOpen && selectedTCForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-border overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-heading">
                  Official Transfer Certificate - {selectedTCForPrint.tc_no || 'Preview'}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CERTIFICATE DOCUMENT (Government / CBSE Compliant Layout) */}
            <div className="p-8 md:p-12 print:p-6 text-slate-900 bg-white select-text">
              {/* Double Border Frame */}
              <div className="border-4 border-double border-slate-900 p-6 md:p-8 relative">
                {/* School Header */}
                <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                  <div className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                    School Code: 70142 | Affiliation No: 2130892
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider font-serif text-slate-900">
                    GREEN PARK SENIOR SECONDARY SCHOOL
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    (Affiliated to the Central Board of Secondary Education - CBSE, New Delhi)
                  </p>
                  <p className="text-xs text-slate-500">
                    Campus: {branchObj?.name || 'Main Campus'}, 124 Knowledge Boulevard, Tech City • Phone: +91 98765 43210
                  </p>

                  <div className="pt-3">
                    <span className="inline-block px-4 py-1 text-sm md:text-base font-extrabold uppercase tracking-widest border-2 border-slate-900 bg-slate-50 rounded">
                      TRANSFER / SCHOOL LEAVING CERTIFICATE
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="flex justify-between items-center text-xs font-semibold py-3 border-b border-slate-300 font-mono">
                  <div>
                    Book No: <span className="font-bold underline">01</span>
                  </div>
                  <div>
                    SI. No. / TC No:{' '}
                    <span className="font-bold text-brand-900 underline text-sm">
                      {selectedTCForPrint.tc_no || 'TC-2026-0042'}
                    </span>
                  </div>
                  <div>
                    Admission / SR No:{' '}
                    <span className="font-bold underline text-sm">
                      {selectedTCForPrint.admission_no}
                    </span>
                  </div>
                </div>

                {/* Numbered Official Clauses Table */}
                <div className="pt-4 text-xs space-y-2.5 font-serif leading-relaxed">
                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">1.</span>
                    <span className="w-72 font-semibold">Name of the Pupil:</span>
                    <span className="font-bold uppercase tracking-wide text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.student_name || selectedTCForPrint.name || 'Student Candidate'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">2.</span>
                    <span className="w-72 font-semibold">Mother's Name:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.mother_name || 'Mrs. S. Sharma'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">3.</span>
                    <span className="w-72 font-semibold">Father's / Guardian's Name:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.father_name || selectedTCForPrint.guardian_name || 'Mr. R. Sharma'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">4.</span>
                    <span className="w-72 font-semibold">Nationality:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.nationality || 'Indian'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">5.</span>
                    <span className="w-72 font-semibold">
                      Whether candidate belongs to SC / ST / OBC:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.caste_category || 'General'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">6.</span>
                    <span className="w-72 font-semibold">
                      Date of First Admission in School with Class:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.admission_date || '12-04-2020'} in Class 1st
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">7.</span>
                    <span className="w-72 font-semibold">
                      Date of Birth according to Admission Register:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      <span className="font-mono">{selectedTCForPrint.dob || '2010-05-15'}</span>{' '}
                      (In words: {formatDOBInWords(selectedTCForPrint.dob || '2010-05-15')})
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">8.</span>
                    <span className="w-72 font-semibold">
                      Class in which the pupil last studied:
                    </span>
                    <span className="font-bold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.last_class_studied || 'Class 10 (Tenth)'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">9.</span>
                    <span className="w-72 font-semibold">
                      School / Board Annual Examination last taken with result:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.last_exam_result || 'Passed Annual Examination'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">10.</span>
                    <span className="w-72 font-semibold">
                      Whether failed, if so once / twice in same class:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.failed_status || 'No'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">11.</span>
                    <span className="w-72 font-semibold">Subjects Studied:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.subjects_studied ||
                        '1. English 2. Mathematics 3. Science 4. Social Science 5. Hindi'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">12.</span>
                    <span className="w-72 font-semibold">
                      Whether qualified for promotion to higher class:
                    </span>
                    <span className="font-bold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.promoted_to_class || 'Yes, Eligible for Next Higher Class'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">13.</span>
                    <span className="w-72 font-semibold">
                      Month up to which the pupil has paid school dues:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.month_dues_paid || 'All dues cleared up to March 2026'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">14.</span>
                    <span className="w-72 font-semibold">
                      Total working days & working days attended:
                    </span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      Total: {selectedTCForPrint.working_days || 210} Days | Attended:{' '}
                      {selectedTCForPrint.present_days || 195} Days
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">15.</span>
                    <span className="w-72 font-semibold">General Conduct:</span>
                    <span className="font-bold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2 uppercase">
                      {selectedTCForPrint.conduct || 'Good'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">16.</span>
                    <span className="w-72 font-semibold">
                      Date of Application for Certificate:
                    </span>
                    <span className="font-mono font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.application_date || selectedTCForPrint.issue_date || '2026-03-25'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">17.</span>
                    <span className="w-72 font-semibold">
                      Date of Issue of Certificate:
                    </span>
                    <span className="font-mono font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.issue_date || new Date().toISOString().split('T')[0]}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">18.</span>
                    <span className="w-72 font-semibold">Reason for Leaving School:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.reason_for_leaving || 'Parent Relocation / Transfer'}
                    </span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="w-8 font-bold">19.</span>
                    <span className="w-72 font-semibold">Any Other Remarks:</span>
                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 flex-1 pl-2">
                      {selectedTCForPrint.remarks || 'A diligent and respectful student.'}
                    </span>
                  </div>
                </div>

                {/* Signatures & Seal Section */}
                <div className="grid grid-cols-3 gap-6 pt-16 mt-4 text-center text-xs font-serif text-slate-900">
                  <div>
                    <div className="w-36 mx-auto border-b border-slate-900 pb-1 font-mono text-[10px]">
                      (Admin Clerk)
                    </div>
                    <div className="pt-1 font-semibold uppercase">Prepared By</div>
                  </div>

                  <div>
                    <div className="w-36 mx-auto border-b border-slate-900 pb-1 font-mono text-[10px]">
                      (Head Clerk / Exam Controller)
                    </div>
                    <div className="pt-1 font-semibold uppercase">Checked By</div>
                  </div>

                  <div>
                    <div className="w-36 mx-auto border-b-2 border-slate-900 pb-1 font-mono text-[10px] font-bold">
                      (Principal / Headmaster)
                    </div>
                    <div className="pt-1 font-bold uppercase tracking-wider">
                      Principal & Official Seal
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InactiveTC;
