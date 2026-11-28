import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Search,
  Plus,
  Check,
  X,
  ArrowRight,
  Edit,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const Appointments = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitors/appointments?status=${statusFilter}`);
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await api.patch(`/visitors/appointments/${id}/status`, { status: newStatus });
      if (res.success) {
        fetchAppointments();
      }
    } catch (err) {
      alert(err.message || 'Failed to update appointment status');
    }
  };

  const handleDelete = async (apt) => {
    if (!window.confirm(`Delete appointment ${apt.appointment_number} for ${apt.visitor_name}?`)) return;
    try {
      await api.delete(`/visitors/appointments/${apt.id}`);
      fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to delete appointment');
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.appointment_number?.toLowerCase().includes(term) ||
      a.visitor_name?.toLowerCase().includes(term) ||
      a.visitor_phone?.includes(term) ||
      a.person_to_meet_name?.toLowerCase().includes(term) ||
      a.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/60">
              Visitor Scheduling
            </span>
            <span className="text-xs text-slate-500 font-medium">Pre-Approved Campus Visits</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Appointments &amp; Pre-Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage advance appointment requests, staff approval workflows, and 1-click gate pass check-in.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/visitors/appointments/new')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['all', 'pending', 'approved', 'rejected', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search visitor, host, or Apt No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Apt #</th>
                <th className="py-3 px-4">Visitor Details</th>
                <th className="py-3 px-4">Person to Meet</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Purpose &amp; Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading appointments...</td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No appointments found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700">
                      {apt.appointment_number}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{apt.visitor_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{apt.visitor_phone}</p>
                      {apt.visitor_email && (
                        <p className="text-[10px] text-slate-400">{apt.visitor_email}</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{apt.person_to_meet_name}</p>
                      <p className="text-[11px] text-slate-500">{apt.department || 'Campus'}</p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(apt.appointment_date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {apt.appointment_time}
                      </p>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-slate-800">{apt.purpose}</p>
                      {apt.notes && (
                        <p className="text-[11px] text-slate-500 truncate" title={apt.notes}>
                          Note: {apt.notes}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {apt.status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {apt.status === 'approved' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {apt.status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                          Rejected
                        </span>
                      )}
                      {apt.status === 'completed' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          Completed
                        </span>
                      )}
                      {apt.status === 'cancelled' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        {apt.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(apt.id, 'approved')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              title="Approve"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(apt.id, 'rejected')}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              title="Reject"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {(apt.status === 'approved' || apt.status === 'pending') && (
                          <button
                            type="button"
                            onClick={() => navigate(`/visitors/entry?appointmentId=${apt.id}`)}
                            className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Issue Gate Pass from Appointment"
                          >
                            Check-In <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/appointments/${apt.id}/edit`)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Edit Appointment"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(apt)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                          title="Delete Appointment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
