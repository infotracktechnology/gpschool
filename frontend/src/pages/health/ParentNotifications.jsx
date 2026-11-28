import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, PhoneCall, Edit, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const ParentNotifications = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [urgencyFilter, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/health/notifications?urgency=${urgencyFilter}`);
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching parent notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (n) => {
    if (!window.confirm(`Delete notification ${n.notification_number} for ${n.student_name}?`)) return;
    try {
      await api.delete(`/health/notifications/${n.id}`);
      fetchNotifications();
    } catch (err) {
      alert(err.message || 'Failed to delete notification log.');
    }
  };

  const filtered = notifications.filter((n) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      n.notification_number?.toLowerCase().includes(t) ||
      n.student_name?.toLowerCase().includes(t) ||
      n.parent_name?.toLowerCase().includes(t) ||
      n.parent_phone?.includes(t) ||
      n.message_summary?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/60">
              Parent Outreach &amp; Audit
            </span>
            <span className="text-xs text-slate-500 font-medium">Infirmary Communication Log</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Parent Health &amp; Emergency Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track calls, SMS, WhatsApp alerts, and parent acknowledgements for student illness, injury, or early pickup.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/health/emergency')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Emergency Contacts
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/notifications/new')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log Parent Notification
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {['all', 'Routine', 'Urgent', 'Emergency'].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrgencyFilter(u)}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                urgencyFilter === u ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              {u === 'all' ? 'All Urgencies' : u}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student, parent, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Ref #</th>
                <th className="py-3 px-4">Student &amp; Class</th>
                <th className="py-3 px-4">Parent Contacted</th>
                <th className="py-3 px-4">Channel &amp; Urgency</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Response Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading notification logs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No parent notification logs recorded yet.</td>
                </tr>
              ) : (
                filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {n.notification_number || `PN-${n.id}`}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{n.student_name}</p>
                      <span className="text-[11px] text-slate-500">{n.class_section || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{n.parent_name || 'Parent'}</p>
                      <span className="font-mono text-[11px] text-slate-500">{n.parent_phone || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 block">{n.channel}</span>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          n.urgency === 'Emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : n.urgency === 'Urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {n.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-slate-700 line-clamp-2">{n.message_summary}</p>
                      <span className="text-[10px] text-slate-400">
                        By {n.notified_by} • {new Date(n.notified_at).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {n.response_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/health/notifications/${n.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg"
                          title="Edit Notification"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                          title="Delete Notification"
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
