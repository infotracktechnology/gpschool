import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Check,
  X,
  Building2,
  FileText,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const PortalVisitors = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Modal State for Action
  const [selectedApt, setSelectedApt] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/portal/appointments');
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error('Error fetching portal appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (apt, type) => {
    setSelectedApt(apt);
    setActionType(type);
    setRemarks(type === 'approve' ? 'Confirmed. Please meet at my cabin.' : 'Unable to meet at requested time.');
  };

  const handleConfirmAction = async () => {
    if (!selectedApt) return;
    try {
      setUpdating(true);
      const res = await api.patch(`/portal/appointments/${selectedApt.id}/status`, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        staff_remarks: remarks,
      });
      if (res.success) {
        setSelectedApt(null);
        fetchAppointments();
      }
    } catch (err) {
      alert(err.message || 'Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60">
              Staff Portal
            </span>
            <span className="text-xs text-slate-500 font-medium">Visitor & Parent Interaction Desk</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">My Visitor Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and approve advance parent meeting requests, vendor visits, and student consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Approvals</p>
            <p className="text-base font-extrabold text-brand-600">{pendingCount}</p>
          </div>
          <button
            type="button"
            onClick={fetchAppointments}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'all', label: 'All Requests' },
          { id: 'pending', label: 'Pending Approval' },
          { id: 'approved', label: 'Approved & Scheduled' },
          { id: 'rejected', label: 'Declined' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filter === tab.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">No Visitor Appointments Found</p>
            <p className="text-xs text-slate-400 mt-1">There are no meeting requests under the selected filter.</p>
          </div>
        ) : (
          filtered.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200">
                    {apt.visitor_name?.charAt(0) || 'V'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{apt.visitor_name}</h3>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        ({apt.appointment_number})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {apt.visitor_phone}
                      </span>
                      {apt.visitor_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {apt.visitor_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      {new Date(apt.appointment_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">{apt.appointment_time}</p>
                  </div>

                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      apt.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : apt.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : apt.status === 'rejected'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>

              {/* Purpose and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Purpose of Meeting</p>
                  <p className="font-semibold text-slate-800">{apt.purpose}</p>
                  {apt.notes && <p className="text-slate-600 mt-1">Visitor Note: {apt.notes}</p>}
                </div>

                {apt.staff_remarks && (
                  <div className="p-3 bg-brand-50/50 rounded-xl space-y-1 border border-brand-100">
                    <p className="text-[11px] font-bold text-brand-800 uppercase">Your Approval Notes</p>
                    <p className="text-slate-800 font-medium">{apt.staff_remarks}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending */}
              {apt.status === 'pending' && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(apt, 'reject')}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(apt, 'approve')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirm & Approve Visit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedApt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {actionType === 'approve' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                {actionType === 'approve' ? 'Approve Appointment' : 'Decline Appointment'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedApt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Visitor: <strong className="text-slate-800">{selectedApt.visitor_name}</strong> on{' '}
              <strong className="text-slate-800">
                {new Date(selectedApt.appointment_date).toLocaleDateString()} at {selectedApt.appointment_time}
              </strong>
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {actionType === 'approve' ? 'Meeting Location / Instructions' : 'Reason for Declining'}
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleConfirmAction}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {updating ? 'Saving...' : actionType === 'approve' ? 'Confirm Approval' : 'Decline Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
