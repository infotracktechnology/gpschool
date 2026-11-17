import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  XCircle,
  Eye,
  GraduationCap,
  Users,
  Building2,
  Phone,
  Home,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const ApplicationList = () => {
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('all');
  const [search, setSearch] = useState('');

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Status Change Modal / State
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [newStatus, setNewStatus] = useState('verified');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Finalize Admission Modal State
  const [admissionModalApp, setAdmissionModalApp] = useState(null);
  const [availableSections, setAvailableSections] = useState([]);
  const [admissionForm, setAdmissionForm] = useState({
    section_id: '',
    admission_date: new Date().toISOString().slice(0, 10),
    admission_category: 'general',
    roll_no: '',
  });
  const [submittingAdmission, setSubmittingAdmission] = useState(false);

  // View Details Modal State
  const [viewDetailsApp, setViewDetailsApp] = useState(null);

  // Fetch Lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, classRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/academics/classes'),
        ]);

        const bList = branchRes.branches || branchRes.data || [];
        const cList = classRes.classes || classRes.data || [];

        setBranches(bList);
        setClasses(cList);

        if (bList.length > 0) setSelectedBranchId(String(bList[0].id));
      } catch (err) {
        console.error('Failed to load lookups:', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) params.append('branch_id', selectedBranchId);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedStatusTab !== 'all') params.append('status', selectedStatusTab);
      if (search) params.append('search', search);

      const res = await api.get(`/admissions/applications?${params.toString()}`);
      setApplications(res.applications || res.data || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedClassId, selectedStatusTab, search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Open Status update modal
  const handleOpenStatusModal = (app, status) => {
    setStatusModalApp(app);
    setNewStatus(status);
  };

  const handleUpdateStatus = async () => {
    if (!statusModalApp) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/admissions/applications/${statusModalApp.id}/status`, {
        status: newStatus,
      });
      setMessage({
        type: 'success',
        text: `Application #${statusModalApp.application_no} status changed to ${newStatus}.`,
      });
      setStatusModalApp(null);
      fetchApplications();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Status update failed.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Open Finalize Admission Modal (loads sections with live capacity)
  const handleOpenFinalizeAdmission = async (app) => {
    setAdmissionModalApp(app);
    setAdmissionForm({
      section_id: '',
      admission_date: new Date().toISOString().slice(0, 10),
      admission_category: 'general',
      roll_no: '',
    });

    try {
      const branchId = app.branch_id || selectedBranchId;
      const classId = app.class_id;
      const res = await api.get(`/academics/sections?branch_id=${branchId}&class_id=${classId}`);
      const secList = res.sections || res.data || [];
      setAvailableSections(secList);
      if (secList.length > 0) {
        setAdmissionForm((prev) => ({ ...prev, section_id: String(secList[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load class sections:', err);
      setAvailableSections([]);
    }
  };

  // Submit Finalize Admission
  const handleSubmitAdmission = async (e) => {
    e.preventDefault();
    if (!admissionModalApp) return;
    setSubmittingAdmission(true);

    try {
      const res = await api.post(`/admissions/applications/${admissionModalApp.id}/finalize-admission`, {
        ...admissionForm,
        section_id: Number(admissionForm.section_id),
      });
      setMessage({
        type: 'success',
        text: `Application finalized! Official Admission No: ${
          res.admission_no || res.admission?.admission_no || 'issued'
        }.`,
      });
      setAdmissionModalApp(null);
      fetchApplications();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Admission finalization failed.' });
    } finally {
      setSubmittingAdmission(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>;
      case 'verified':
        return <Badge variant="primary">Verified</Badge>;
      case 'approved':
        return <Badge variant="active">Approved</Badge>;
      case 'admitted':
        return <Badge variant="completed">Admitted</Badge>;
      case 'rejected':
        return <Badge variant="inactive">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Admission Applications</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Review detailed student candidate files, perform verification & approvals, and finalize enrollment.
          </p>
        </div>

        <button
          onClick={() => navigate('/admissions/applications/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, application no, father, phone..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Branch filter */}
          <div className="w-48">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class filter */}
          <div className="w-44">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs font-medium">
          {[
            { key: 'all', label: 'All Applications' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'verified', label: 'Verified' },
            { key: 'approved', label: 'Approved' },
            { key: 'admitted', label: 'Admitted' },
            { key: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatusTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedStatusTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Roster Table */}
      <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
              <th className="py-3.5 px-5">App No & Date</th>
              <th className="py-3.5 px-5">Student / Class</th>
              <th className="py-3.5 px-5">Parent & Phone</th>
              <th className="py-3.5 px-5">Location</th>
              <th className="py-3.5 px-5 text-center">Status</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-muted">
                  Loading application files...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-muted">
                  No applications found under current filters.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* App No */}
                  <td className="py-4 px-5">
                    <div className="font-mono font-bold text-heading">{app.application_no}</div>
                    <div className="text-[11px] text-muted">
                      {new Date(app.created_at || Date.now()).toLocaleDateString('en-GB')}
                    </div>
                  </td>

                  {/* Student */}
                  <td className="py-4 px-5">
                    <div className="font-semibold text-heading">{app.student_name}</div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{app.class_name || `Class ID: ${app.class_id}`}</span>
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{app.gender}</span>
                    </div>
                  </td>

                  {/* Parent */}
                  <td className="py-4 px-5">
                    <div className="font-medium text-slate-800">{app.father_name || app.mother_name}</div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{app.father_phone || app.mother_phone}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-4 px-5 text-xs text-muted">
                    <div className="flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{app.city ? `${app.city}, ${app.state}` : '—'}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5 text-center">{getStatusBadge(app.status)}</td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                    {/* View Details */}
                    <button
                      onClick={() => setViewDetailsApp(app)}
                      className="p-1.5 text-muted hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="View complete application profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Stage status transitions: Verify */}
                    {app.status === 'submitted' && (
                      <button
                        onClick={() => handleOpenStatusModal(app, 'verified')}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        title="Mark verified"
                      >
                        Verify
                      </button>
                    )}

                    {/* Stage status transitions: Approve / Reject */}
                    {app.status === 'verified' && (
                      <>
                        <button
                          onClick={() => handleOpenStatusModal(app, 'approved')}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Approve for admission"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenStatusModal(app, 'rejected')}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                          title="Reject application"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {/* Finalize Admission Button (available when approved) */}
                    {(app.status === 'approved' || app.status === 'verified') && (
                      <button
                        onClick={() => handleOpenFinalizeAdmission(app)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                        title="Finalize official admission"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Finalize Admission</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status Confirmation Modal */}
      <Modal
        isOpen={Boolean(statusModalApp)}
        onClose={() => setStatusModalApp(null)}
        title="Update Application Status"
        maxWidth="max-w-md"
      >
        {statusModalApp && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Update status for application <strong>#{statusModalApp.application_no}</strong> (
              {statusModalApp.student_name}) to:
            </p>

            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
            >
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStatusModalApp(null)}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Confirm Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Finalize Admission Modal (Live Capacity Check) */}
      <Modal
        isOpen={Boolean(admissionModalApp)}
        onClose={() => setAdmissionModalApp(null)}
        title="Finalize Admission Enrollment"
        maxWidth="max-w-lg"
      >
        {admissionModalApp && (
          <form onSubmit={handleSubmitAdmission} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              Confirming admission converts application{' '}
              <strong>#{admissionModalApp.application_no}</strong> into an official student enrollment
              record, issuing the sequential <strong>Admission Number</strong>.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student</label>
                <input
                  type="text"
                  disabled
                  value={admissionModalApp.student_name}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-border rounded-xl text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                <input
                  type="text"
                  disabled
                  value={admissionModalApp.class_name || `Class ID: ${admissionModalApp.class_id}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-border rounded-xl text-slate-600"
                />
              </div>
            </div>

            {/* Section allocation with live capacity validation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allocate Section <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={admissionForm.section_id}
                onChange={(e) =>
                  setAdmissionForm({ ...admissionForm, section_id: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
              >
                {availableSections.length === 0 ? (
                  <option value="">No sections available</option>
                ) : (
                  availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} — (Capacity: {sec.capacity || 40} seats)
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={admissionForm.admission_date}
                  onChange={(e) =>
                    setAdmissionForm({ ...admissionForm, admission_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={admissionForm.admission_category}
                  onChange={(e) =>
                    setAdmissionForm({ ...admissionForm, admission_category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
                >
                  <option value="general">General</option>
                  <option value="rte">RTE (Right to Education)</option>
                  <option value="sibling">Sibling Concession</option>
                  <option value="staff_child">Staff Child</option>
                  <option value="scholarship">Merit Scholarship</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number (Optional)
              </label>
              <input
                type="text"
                value={admissionForm.roll_no}
                onChange={(e) => setAdmissionForm({ ...admissionForm, roll_no: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => setAdmissionModalApp(null)}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdmission || !admissionForm.section_id}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                {submittingAdmission ? 'Finalizing...' : 'Allot Seat & Enroll'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Application Details Modal */}
      <Modal
        isOpen={Boolean(viewDetailsApp)}
        onClose={() => setViewDetailsApp(null)}
        title={
          viewDetailsApp
            ? `Application Dossier: ${viewDetailsApp.student_name} (${viewDetailsApp.application_no})`
            : 'Details'
        }
        maxWidth="max-w-2xl"
      >
        {viewDetailsApp && (
          <div className="space-y-4 text-xs">
            {/* Student Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm mb-2">Student Particulars</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-muted block">Student Name:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.student_name}</span>
                </div>
                <div>
                  <span className="text-muted block">Class:</span>
                  <span className="font-semibold text-heading">
                    {viewDetailsApp.class_name || viewDetailsApp.class_id}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Gender:</span>
                  <span className="font-semibold text-heading capitalize">{viewDetailsApp.gender}</span>
                </div>
                <div>
                  <span className="text-muted block">Date of Birth:</span>
                  <span className="font-semibold text-heading">
                    {viewDetailsApp.dob ? String(viewDetailsApp.dob).slice(0, 10) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Blood Group:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.blood_group || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block">Aadhaar No:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.aadhaar_no || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block">Religion:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.religion || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block">Mother Tongue:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.mother_tongue || '—'}</span>
                </div>
              </div>
            </div>

            {/* Parents */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm mb-2">Family & Guardian Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted block">Father Name:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.father_name}</span>
                  <div className="text-slate-500 mt-0.5">
                    Phone: {viewDetailsApp.father_phone} | Occ: {viewDetailsApp.father_occupation || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-muted block">Mother Name:</span>
                  <span className="font-semibold text-heading">{viewDetailsApp.mother_name || '—'}</span>
                  <div className="text-slate-500 mt-0.5">
                    Phone: {viewDetailsApp.mother_phone || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm mb-1">Residential Address</h4>
              <p className="text-slate-700">
                {viewDetailsApp.address_street}, {viewDetailsApp.city}, {viewDetailsApp.state} —{' '}
                {viewDetailsApp.pincode}
              </p>
            </div>

            {/* Previous School */}
            {(viewDetailsApp.prev_school_name || viewDetailsApp.prev_tc_no) && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Prior Academic History</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-muted block">Previous School:</span>
                    <span className="font-semibold text-heading">
                      {viewDetailsApp.prev_school_name || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">Last Class:</span>
                    <span className="font-semibold text-heading">
                      {viewDetailsApp.prev_class_passed || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block">TC Number:</span>
                    <span className="font-semibold text-heading">{viewDetailsApp.prev_tc_no || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
