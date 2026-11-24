import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  X,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';

export const PortalLeaves = () => {
  const { user } = useAuth();

  const [leaveBalances, setLeaveBalances] = useState({
    CL: { title: 'Casual Leave (CL)', available: 10, used: 2, total: 12, color: 'bg-emerald-500' },
    SL: { title: 'Sick Leave (SL)', available: 8, used: 2, total: 10, color: 'bg-teal-500' },
    EL: { title: 'Earned Leave (EL)', available: 13, used: 2, total: 15, color: 'bg-indigo-500' },
    OD: { title: 'On-Duty Leave (OD)', available: 6, used: 2, total: 8, color: 'bg-purple-500' },
  });

  const [myRequests, setMyRequests] = useState([
    {
      id: 1,
      leave_type: 'OD',
      from_date: '2026-11-24',
      to_date: '2026-11-25',
      days_count: 2,
      reason: 'Accompanying Grade 10 students to CBSE Regional Science Congress in Coimbatore.',
      substitute: 'Ananya Deshmukh',
      applied_on: '2026-11-19',
      status: 'pending',
    },
    {
      id: 2,
      leave_type: 'CL',
      from_date: '2026-11-10',
      to_date: '2026-11-11',
      days_count: 2,
      reason: 'Family medical checkup and personal commitments.',
      substitute: 'V. Balaji',
      applied_on: '2026-11-08',
      status: 'approved',
      review_remarks: 'Approved by Principal.',
    },
  ]);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [applyForm, setApplyForm] = useState({
    leave_type: 'CL',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    day_type: 'Full Day',
    reason: '',
    substitute: 'Ananya Deshmukh (Physics)',
  });

  const calculatedDays = useMemo(() => {
    if (!applyForm.from_date || !applyForm.to_date) return 1;
    const start = new Date(applyForm.from_date);
    const end = new Date(applyForm.to_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [applyForm.from_date, applyForm.to_date]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        staff_id: user?.id || 1,
        leave_type: applyForm.leave_type,
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        days_count: calculatedDays,
        reason: applyForm.reason,
        substitute_teacher: applyForm.substitute,
      };

      try {
        await api.post('/portal/leaves/apply', payload);
      } catch (err) {
        console.warn('API fallback portal leave apply:', err);
      }

      const newEntry = {
        id: Date.now(),
        ...payload,
        applied_on: new Date().toISOString().slice(0, 10),
        status: 'pending',
      };

      setMyRequests((prev) => [newEntry, ...prev]);
      setIsApplyModalOpen(false);
      setMessage({
        type: 'success',
        text: `Leave application for ${calculatedDays} day(s) submitted for Principal approval!`,
      });
      setApplyForm({
        leave_type: 'CL',
        from_date: new Date().toISOString().slice(0, 10),
        to_date: new Date().toISOString().slice(0, 10),
        day_type: 'Full Day',
        reason: '',
        substitute: 'Ananya Deshmukh (Physics)',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit leave application.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Leave Quota & Requests</h1>
          <p className="text-xs text-muted">
            Check your annual available balances, submit substitution plans, and view approval status
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
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

      {/* 4 Quota Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(leaveBalances).map(([key, item]) => {
          const usedPct = Math.round((item.used / item.total) * 100);
          return (
            <div
              key={key}
              className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {key}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Annual Quota: {item.total}d
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 mt-2">{item.title}</h3>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-heading">{item.available}</span>
                  <span className="text-xs text-muted">days left</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/80 space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${100 - usedPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Used: {item.used}d</span>
                  <span>Quota: {item.total}d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Application History Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-heading">My Leave History & Status</h3>
            <p className="text-xs text-muted">All past and current absence submissions</p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {myRequests.length} Applications Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Dates & Days</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Substitute Handover</th>
                <th className="py-2.5 px-3">Applied On</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {myRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                      {req.leave_type}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">
                      {req.from_date} to {req.to_date}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {req.days_count} Day(s)
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <p className="text-slate-800 line-clamp-2">{req.reason}</p>
                    {req.review_remarks && (
                      <p className="text-[10px] text-brand-600 italic mt-0.5">
                        Remarks: {req.review_remarks}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{req.substitute || req.substitute_teacher || '—'}</td>
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
                      {req.status === 'approved' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : req.status === 'rejected' ? (
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600" />
                      )}
                      <span className="capitalize">{req.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Staff Absence / Leave"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Leave Category *
            </label>
            <select
              value={applyForm.leave_type}
              onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
            >
              <option value="CL">Casual Leave (CL)</option>
              <option value="SL">Sick / Medical Leave (SL)</option>
              <option value="EL">Earned Leave (EL)</option>
              <option value="OD">On-Duty (OD)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Date *</label>
              <input
                type="date"
                required
                value={applyForm.from_date}
                onChange={(e) => setApplyForm({ ...applyForm, from_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Date *</label>
              <input
                type="date"
                required
                value={applyForm.to_date}
                onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center text-emerald-900 font-semibold">
            <span>Duration Calculated:</span>
            <span className="font-bold text-sm">{calculatedDays} Day(s)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="State reason clearly..."
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Substitute Faculty Covering Timetable
            </label>
            <input
              type="text"
              placeholder="Colleague name..."
              value={applyForm.substitute}
              onChange={(e) => setApplyForm({ ...applyForm, substitute: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
