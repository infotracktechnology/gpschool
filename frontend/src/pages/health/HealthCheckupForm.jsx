import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Save, Search, AlertCircle, Printer } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { BranchScopePicker } from '../../components/common/BranchScopePicker';

export const HealthCheckupForm = () => {
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

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  const [form, setForm] = useState({
    student_id: null,
    student_name: '',
    class_section: '',
    checkup_date: new Date().toISOString().slice(0, 10),
    height_cm: '152.0',
    weight_kg: '42.0',
    vision_left: '6/6',
    vision_right: '6/6',
    dental_status: 'Healthy - No Cavity',
    ent_status: 'Normal',
    general_fitness: 'Fit',
    doctor_remarks: 'Healthy child, excellent growth and stamina.',
    examiner_name: 'Dr. S. K. Ramanathan, MD (Pediatrics)',
  });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/checkups/${id}`);
        if (res.success && res.checkup) {
          const c = res.checkup;
          setStudentSearchTerm(`${c.student_name}${c.admission_no ? ` (${c.admission_no})` : ''}`);
          setForm({
            student_id: c.student_id || null,
            student_name: c.student_name || '',
            class_section: c.class_section || '',
            checkup_date: c.checkup_date ? new Date(c.checkup_date).toISOString().slice(0, 10) : '',
            height_cm: c.height_cm || '',
            weight_kg: c.weight_kg || '',
            vision_left: c.vision_left || '6/6',
            vision_right: c.vision_right || '6/6',
            dental_status: c.dental_status || 'Healthy',
            ent_status: c.ent_status || 'Normal',
            general_fitness: c.general_fitness || 'Fit',
            doctor_remarks: c.doctor_remarks || '',
            examiner_name: c.examiner_name || 'Campus Medical Officer',
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load health check-up details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const handleStudentSearch = async (val) => {
    setStudentSearchTerm(val);
    if (!val || val.trim().length < 1) {
      setStudentSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudent(true);
      const res = await api.get(`/health/search-students?q=${encodeURIComponent(val)}`);
      if (res.success) {
        setStudentSearchResults(res.students || []);
      }
    } catch (err) {
      console.error('Error searching students:', err);
    } finally {
      setIsSearchingStudent(false);
    }
  };

  const selectStudent = (st) => {
    const clsSec = st.class_section || `${st.class_name || ''} - ${st.section_name || ''}`.trim();
    setForm((prev) => ({
      ...prev,
      student_id: st.id,
      student_name: st.student_name,
      class_section: clsSec || 'Class 1 - A',
      height_cm: st.height_cm || prev.height_cm,
      weight_kg: st.weight_kg || prev.weight_kg,
    }));
    setStudentSearchTerm(`${st.student_name} (${st.admission_no || ''})`);
    setStudentSearchResults([]);
  };

  const h = parseFloat(form.height_cm);
  const w = parseFloat(form.weight_kg);
  const bmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.student_name.trim()) {
      setErrorMsg('Please search and select a Student.');
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
        await api.put(`/health/checkups/${id}`, payload);
      } else {
        await api.post('/health/checkups', payload);
      }
      navigate('/health/checkups');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save health check-up.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading check-up editor...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/health/checkups"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/health/checkups" className="hover:text-rose-600">
                Health Check-ups
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800">{isEdit ? 'Edit Screening' : 'New Check-up'}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-rose-600" />
              {isEdit ? `Edit Check-up: ${form.student_name}` : 'Record Health Check-up'}
            </h1>
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={() => navigate(`/health/checkups/${id}/print`)}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print A4 Health Card
          </button>
        )}
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
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Student Name *
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
              {isSearchingStudent && (
                <span className="absolute right-3 top-3 text-[10px] text-slate-400">Searching...</span>
              )}
            </div>

            {studentSearchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {studentSearchResults.map((st) => (
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
              required
              readOnly
              placeholder="Auto-filled upon selecting student"
              value={form.class_section}
              className="w-full text-xs font-bold border border-slate-200 bg-slate-50/80 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Check-up Date
            </label>
            <input
              type="date"
              value={form.checkup_date}
              onChange={(e) => setForm({ ...form, checkup_date: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Calculated BMI
            </label>
            <input
              type="text"
              readOnly
              value={bmi !== '—' ? `${bmi} kg/m²` : '—'}
              className="w-full text-xs font-mono font-bold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Vision (Left)
            </label>
            <input
              type="text"
              value={form.vision_left}
              onChange={(e) => setForm({ ...form, vision_left: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Vision (Right)
            </label>
            <input
              type="text"
              value={form.vision_right}
              onChange={(e) => setForm({ ...form, vision_right: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dental Status
            </label>
            <input
              type="text"
              value={form.dental_status}
              onChange={(e) => setForm({ ...form, dental_status: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              ENT Status
            </label>
            <input
              type="text"
              value={form.ent_status}
              onChange={(e) => setForm({ ...form, ent_status: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              General Fitness Status
            </label>
            <input
              type="text"
              value={form.general_fitness}
              onChange={(e) => setForm({ ...form, general_fitness: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Medical Examiner Name
            </label>
            <input
              type="text"
              value={form.examiner_name}
              onChange={(e) => setForm({ ...form, examiner_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Physician Assessment &amp; Remarks
          </label>
          <textarea
            rows={3}
            value={form.doctor_remarks}
            onChange={(e) => setForm({ ...form, doctor_remarks: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/checkups"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving...' : isEdit ? 'Update Check-up' : 'Record Check-up'}
          </button>
        </div>
      </form>
    </div>
  );
};
