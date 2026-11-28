import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Save, AlertCircle, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { BranchScopePicker } from '../../components/common/BranchScopePicker';

export const AppointmentForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [branchId, setBranchId] = useState(() =>
    selectedBranch?.id && selectedBranch.id !== 'all' ? String(selectedBranch.id) : ''
  );

  useEffect(() => {
    if (selectedBranch?.id && selectedBranch.id !== 'all') {
      setBranchId(String(selectedBranch.id));
    }
  }, [selectedBranch?.id]);

  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    person_to_meet_id: '',
    person_to_meet_name: '',
    department: '',
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: '10:30 AM',
    purpose: 'Academic Discussion with Teacher',
    notes: '',
    status: 'pending',
    staff_remarks: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const hostsRes = await api.get('/visitors/hosts');
        const hostList = hostsRes.hosts || [];
        setHosts(hostList);

        if (isEdit) {
          const aptRes = await api.get(`/visitors/appointments/${id}`);
          if (aptRes.success && aptRes.appointment) {
            const a = aptRes.appointment;
            setForm({
              visitor_name: a.visitor_name || '',
              visitor_phone: a.visitor_phone || '',
              visitor_email: a.visitor_email || '',
              person_to_meet_id: a.person_to_meet_id || '',
              person_to_meet_name: a.person_to_meet_name || '',
              department: a.department || '',
              appointment_date: a.appointment_date
                ? new Date(a.appointment_date).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              appointment_time: a.appointment_time || '10:30 AM',
              purpose: a.purpose || 'Academic Discussion with Teacher',
              notes: a.notes || '',
              status: a.status || 'pending',
              staff_remarks: a.staff_remarks || '',
            });
          }
        } else if (hostList.length > 0) {
          setForm((prev) => ({
            ...prev,
            person_to_meet_id: hostList[0].staff_id,
            person_to_meet_name: hostList[0].full_name,
            department: hostList[0].department || '',
          }));
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.visitor_name.trim() || !form.visitor_phone.trim()) {
      setErrorMsg('Visitor Name and Mobile Number are required.');
      return;
    }
    if (!form.person_to_meet_name) {
      setErrorMsg('Please select a Person to Meet.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        ...(branchId ? { branch_id: Number(branchId) } : {}),
        ...(selectedAcademicYear?.id ? { academic_year_id: Number(selectedAcademicYear.id) } : {}),
      };
      if (isEdit) {
        await api.put(`/visitors/appointments/${id}`, payload);
      } else {
        await api.post('/visitors/appointments', payload);
      }
      navigate('/visitors/appointments');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading appointment form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/visitors/appointments"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/visitors/appointments" className="hover:text-brand-600">
              Appointments
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{isEdit ? 'Edit Appointment' : 'Schedule Appointment'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            {isEdit ? `Edit Appointment: ${form.visitor_name}` : 'Schedule Pre-Approved Visit'}
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <BranchScopePicker branchId={branchId} onBranchChange={setBranchId} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Visitor Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mr. Karthikeyan"
              value={form.visitor_name}
              onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Mobile Phone *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="10-digit mobile"
              value={form.visitor_phone}
              onChange={(e) => setForm({ ...form, visitor_phone: e.target.value.replace(/\D/g, '') })}
              className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              placeholder="visitor@example.com"
              value={form.visitor_email}
              onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Host / Person to Meet *
            </label>
            <select
              required
              value={form.person_to_meet_id}
              onChange={(e) => {
                const selected = hosts.find((h) => String(h.staff_id) === e.target.value);
                setForm({
                  ...form,
                  person_to_meet_id: e.target.value,
                  person_to_meet_name: selected?.full_name || '',
                  department: selected?.department || '',
                });
              }}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">-- Select Staff Member --</option>
              {hosts.map((h) => (
                <option key={h.staff_id} value={h.staff_id}>
                  {h.full_name} ({h.designation} - {h.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Host Department
              <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                Auto-Filled
              </span>
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                readOnly
                value={form.department}
                placeholder="Auto-filled on host selection"
                className="w-full text-xs font-bold border border-slate-200 bg-slate-50 rounded-xl pl-8 pr-3 py-2.5 text-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Appointment Date *
            </label>
            <input
              type="date"
              required
              value={form.appointment_date}
              onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
              className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Preferred Time *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 10:30 AM"
              value={form.appointment_time}
              onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
              className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Approval Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Purpose of Visit
          </label>
          <select
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="Academic Discussion with Teacher">Academic Discussion with Teacher</option>
            <option value="Admission Enquiry & Campus Tour">Admission Enquiry &amp; Campus Tour</option>
            <option value="Principal Meeting">Meeting with Principal / Management</option>
            <option value="Vendor / Procurement">Vendor / Commercial Proposal</option>
            <option value="Parent / Student Counseling">Parent / Student Counseling</option>
            <option value="General Meeting">General Official Visit</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Visitor Agenda Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any specific details..."
              className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {isEdit && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Host / Staff Remarks
              </label>
              <textarea
                rows={2}
                value={form.staff_remarks}
                onChange={(e) => setForm({ ...form, staff_remarks: e.target.value })}
                placeholder="Notes from host or gate security..."
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/visitors/appointments"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving...' : isEdit ? 'Update Appointment' : 'Confirm Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};
