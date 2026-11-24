import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Search,
  Filter,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';

export const PortalLeaveApprovals = () => {
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState(null);

  const [requests, setRequests] = useState([
    {
      id: 101,
      emp_no: 'GPS-T-002',
      staff_name: 'Ananya Deshmukh',
      department: 'Science & Physics',
      leave_type: 'OD',
      from_date: '2026-11-24',
      to_date: '2026-11-25',
      days_count: 2,
      reason: 'Accompanying Grade 10 students to CBSE Regional Science Congress in Coimbatore.',
      substitute_teacher: 'Dr. Ramesh Sundaram',
      applied_on: '2026-11-19',
      status: 'pending',
    },
    {
      id: 102,
      emp_no: 'GPS-T-003',
      staff_name: 'Kavitha Ranganathan',
      department: 'English & Literature',
      leave_type: 'SL',
      from_date: '2026-11-22',
      to_date: '2026-11-22',
      days_count: 1,
      reason: 'Medical screening and checkup.',
      substitute_teacher: 'M. Natarajan',
      applied_on: '2026-11-18',
      status: 'pending',
    },
    {
      id: 103,
      emp_no: 'GPS-T-005',
      staff_name: 'M. Natarajan',
      department: 'Social Science',
      leave_type: 'CL',
      from_date: '2026-11-28',
      to_date: '2026-11-29',
      days_count: 2,
      reason: 'Family ceremony out of city.',
      substitute_teacher: 'Deepa Varma',
      applied_on: '2026-11-17',
      status: 'pending',
    },
  ]);

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    action: 'approved',
    target: null,
    remarks: '',
  });

  const openReviewDialog = (req, action) => {
    setReviewModal({
      isOpen: true,
      action,
      target: req,
      remarks: action === 'approved' ? 'Approved by Academic Approver' : 'Cannot approve due to class timetable schedule',
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewModal.target) return;

    try {
      try {
        await api.patch(`/staff/leaves/applications/${reviewModal.target.id}/status`, {
          status: reviewModal.action,
          review_remarks: reviewModal.remarks,
        });
      } catch (err) {
        console.warn('API fallback review leave:', err);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === reviewModal.target.id
            ? { ...r, status: reviewModal.action, review_remarks: reviewModal.remarks }
            : r
        )
      );

      setMessage({
        type: 'success',
        text: `Leave request for ${reviewModal.target.staff_name} marked as ${reviewModal.action.toUpperCase()}!`,
      });
      setReviewModal({ isOpen: false, action: 'approved', target: null, remarks: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process request.' });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      r.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.emp_no.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Coordinator & HOD Approvals Workspace</span>
          </div>
          <h1 className="text-2xl font-bold text-heading">Staff Leave Approvals</h1>
          <p className="text-xs text-muted">
            Review absence requests from your department / wing faculty and confirm timetable cover
          </p>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {['pending', 'approved', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search applicant name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Faculty Member</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date Range & Days</th>
                <th className="py-2.5 px-3">Reason & Handover</th>
                <th className="py-2.5 px-3">Applied</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{req.staff_name}</p>
                    <span className="font-mono text-[11px] text-muted block">
                      {req.emp_no} • {req.department}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{req.leave_type}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">
                      {req.from_date} to {req.to_date}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      {req.days_count} Day(s)
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <p className="text-slate-700 line-clamp-2">{req.reason}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      Substitute: <span className="font-semibold text-slate-700">{req.substitute_teacher}</span>
                    </p>
                  </td>
                  <td className="py-3 px-3 font-mono text-muted">{req.applied_on}</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span className="capitalize">{req.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {req.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openReviewDialog(req, 'approved')}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openReviewDialog(req, 'rejected')}
                          className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
        title={`${reviewModal.action === 'approved' ? 'Approve' : 'Reject'} Staff Request`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Applicant: <span className="font-bold text-slate-900">{reviewModal.target?.staff_name}</span> ({reviewModal.target?.days_count} days)
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Approver Remarks</label>
            <textarea
              required
              rows={3}
              value={reviewModal.remarks}
              onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
            />
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs ${
                reviewModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirm {reviewModal.action === 'approved' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
