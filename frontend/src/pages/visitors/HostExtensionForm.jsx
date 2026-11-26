import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, Phone, Clock, User, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export const HostExtensionForm = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [host, setHost] = useState(null);
  const [form, setForm] = useState({
    cabin_room: 'Staff Room',
    intercom: '101',
    visiting_hours: '2:30 PM - 3:30 PM',
    is_available: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchHost();
  }, [staffId]);

  const fetchHost = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitors/hosts/${staffId}`);
      if (res.success && res.host) {
        setHost(res.host);
        setForm({
          cabin_room: res.host.cabin_room || 'Staff Room',
          intercom: res.host.intercom || '101',
          visiting_hours: res.host.visiting_hours || '2:30 PM - 3:30 PM',
          is_available: res.host.is_available === 1 || res.host.is_available === true,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load staff host details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await api.put(`/visitors/hosts/${staffId}/extension`, form);
      if (res.success) {
        navigate('/visitors/hosts');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update host settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading staff configuration...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/visitors/hosts"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/visitors/hosts" className="hover:text-brand-600">
              Person to Meet
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Configure Host</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Configure Cabin &amp; Intercom Details
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {host && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{host.full_name}</h2>
              <p className="text-xs text-slate-500">
                {host.designation} • {host.department} ({host.emp_no})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                <MapPin className="w-3 h-3 inline mr-1" /> Cabin / Office Room *
              </label>
              <input
                type="text"
                required
                value={form.cabin_room}
                onChange={(e) => setForm({ ...form, cabin_room: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                <Phone className="w-3 h-3 inline mr-1" /> Intercom Extension Number *
              </label>
              <input
                type="text"
                required
                value={form.intercom}
                onChange={(e) => setForm({ ...form, intercom: e.target.value })}
                className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              <Clock className="w-3 h-3 inline mr-1" /> Permitted Visiting Hours
            </label>
            <input
              type="text"
              value={form.visiting_hours}
              onChange={(e) => setForm({ ...form, visiting_hours: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">Reception Visitor Availability</p>
              <p className="text-[11px] text-slate-500">Toggle whether gate reception can currently route walk-in visitors</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                className="w-4 h-4 accent-brand-600 rounded"
              />
              <span className="text-xs font-bold text-slate-700">
                {form.is_available ? 'Available' : 'Busy / Unavailable'}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/visitors/hosts"
              className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Host Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
