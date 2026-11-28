import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Bell, ArrowLeft, Save, Search, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { BranchScopePicker } from '../../components/common/BranchScopePicker';

export const ParentNotificationForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const visitIdParam = searchParams.get('visitId');
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

  const [loading, setLoading] = useState(isEdit || Boolean(studentIdParam));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentResults, setStudentResults] = useState([]);

  const [form, setForm] = useState({
    student_id: studentIdParam || null,
    student_name: '',
    class_section: '',
    visit_id: visitIdParam || null,
    parent_name: '',
    parent_phone: '',
    channel: 'Phone Call',
    urgency: 'Routine',
    message_summary: '',
    response_status: 'Notified',
    notified_by: 'Nurse Saradha',
  });

  useEffect(() => {
    const init = async () => {
      try {
        if (isEdit) {
          const res = await api.get(`/health/notifications/${id}`);
          if (res.success && res.notification) {
            const n = res.notification;
            setStudentSearchTerm(n.student_name || '');
            setForm({
              student_id: n.student_id || null,
              student_name: n.student_name || '',
              class_section: n.class_section || '',
              visit_id: n.visit_id || null,
              parent_name: n.parent_name || '',
              parent_phone: n.parent_phone || '',
              channel: n.channel || 'Phone Call',
              urgency: n.urgency || 'Routine',
              message_summary: n.message_summary || '',
              response_status: n.response_status || 'Notified',
              notified_by: n.notified_by || 'Nurse Saradha',
            });
          }
        } else if (studentIdParam) {
          const profRes = await api.get(`/health/profiles/student/${studentIdParam}`);
          if (profRes.success && profRes.profile) {
            const p = profRes.profile;
            setStudentSearchTerm(`${p.full_name} (${p.admission_no || ''})`);
            setForm((prev) => ({
              ...prev,
              student_id: p.student_id,
              student_name: p.full_name,
              class_section: p.class_or_dept || '',
              parent_name: p.emergency_contact_name || p.father_name || 'Parent',
              parent_phone: p.emergency_contact_phone || p.father_phone || p.mother_phone || '',
              message_summary: visitIdParam
                ? `Student ${p.full_name} visited Campus Infirmary. Parents requested to follow up.`
                : '',
            }));
          }
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load student details');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, studentIdParam, visitIdParam]);

  const handleStudentSearch = async (val) => {
    setStudentSearchTerm(val);
    if (!val || val.trim().length < 1) {
      setStudentResults([]);
      return;
    }
    try {
      const res = await api.get(`/health/search-students?q=${encodeURIComponent(val)}`);
      if (res.success) {
        setStudentResults(res.students || []);
      }
    } catch (err) {
      console.error('Error searching students:', err);
    }
  };

  const selectStudent = (st) => {
    const clsSec = st.class_section || `${st.class_name || ''} - ${st.section_name || ''}`.trim();
    setForm((prev) => ({
      ...prev,
      student_id: st.id,
      student_name: st.student_name,
      class_section: clsSec || 'Class 1 - A',
      parent_name: st.father_name || 'Parent / Guardian',
      parent_phone: st.emergency_contact_phone || st.father_phone || st.mother_phone || '',
    }));
    setStudentSearchTerm(`${st.student_name} (${st.admission_no || ''})`);
    setStudentResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.student_name.trim() || !form.message_summary.trim()) {
      setErrorMsg('Student Name and Notification Summary are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        ...(branchId ? { branch_id: Number(branchId) } : {}),
        ...(selectedAcademicYear?.id ? { academic_year_id: Number(selectedAcademicYear.id) } : {}),
      };
      if (isEdit) {
        await api.put(`/health/notifications/${id}`, payload);
      } else {
        await api.post('/health/notifications', payload);
      }
      navigate('/health/notifications');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save notification log.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading notification form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/health/notifications"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/health/notifications" className="hover:text-rose-600">
              Parent Notifications
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{isEdit ? 'Edit Log' : 'New Notification'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            {isEdit ? `Edit Notification: ${form.student_name}` : 'Log Parent Health / Emergency Notification'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Select Student *
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Type student name or adm no..."
                value={studentSearchTerm}
                onChange={(e) => handleStudentSearch(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800"
              />
            </div>

            {studentResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {studentResults.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => selectStudent(st)}
                    className="p-2.5 hover:bg-rose-50 cursor-pointer text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{st.student_name}</p>
                      <p className="text-[10px] text-slate-500">
                        Adm: {st.admission_no} | Class: {st.class_section || st.class_name || 'N/A'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Class &amp; Section
              <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                Auto-Filled
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={form.class_section}
              placeholder="Auto-filled on student selection"
              className="w-full text-xs font-bold border border-slate-200 bg-slate-50/80 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Parent / Guardian Name
            </label>
            <input
              type="text"
              value={form.parent_name}
              onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Parent Phone Number
            </label>
            <input
              type="tel"
              value={form.parent_phone}
              onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Channel
            </label>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              {['Phone Call', 'SMS', 'WhatsApp', 'In-Person', 'Email'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Urgency Level
            </label>
            <select
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              {['Routine', 'Urgent', 'Emergency'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Parent Response
            </label>
            <select
              value={form.response_status}
              onChange={(e) => setForm({ ...form, response_status: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              {['Notified', 'Acknowledged', 'Parent En Route', 'No Answer'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Notified By
            </label>
            <input
              type="text"
              value={form.notified_by}
              onChange={(e) => setForm({ ...form, notified_by: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Communication Summary / Instructions Given *
          </label>
          <textarea
            rows={3}
            required
            placeholder="e.g. Informed father about 101°F fever; parent confirmed arrival in 25 minutes for early pickup."
            value={form.message_summary}
            onChange={(e) => setForm({ ...form, message_summary: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/notifications"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Notification' : 'Log Notification'}
          </button>
        </div>
      </form>
    </div>
  );
};
