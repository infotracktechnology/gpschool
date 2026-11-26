import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export const HealthProfileForm = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [subjectName, setSubjectName] = useState('');
  const [subjectSub, setSubjectSub] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    blood_group: 'O+',
    height_cm: '',
    weight_kg: '',
    known_allergies: '',
    chronic_conditions: '',
    medical_notes: '',
    identification_mark: '',
    doctor_name: '',
    doctor_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Parent',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/profiles/${type}/${id}`);
        if (res.success && res.profile) {
          const p = res.profile;
          setSubjectName(p.full_name || '');
          setSubjectSub(p.class_or_dept || '');
          setForm({
            blood_group: p.blood_group && p.blood_group !== 'Unknown' ? p.blood_group : 'O+',
            height_cm: p.height_cm || '',
            weight_kg: p.weight_kg || '',
            known_allergies: p.known_allergies || '',
            chronic_conditions: p.chronic_conditions || '',
            medical_notes: p.medical_notes || '',
            identification_mark: p.identification_mark || '',
            doctor_name: p.doctor_name || '',
            doctor_phone: p.doctor_phone || '',
            emergency_contact_name: p.emergency_contact_name || '',
            emergency_contact_phone: p.emergency_contact_phone || '',
            emergency_contact_relation: p.emergency_contact_relation || (type === 'student' ? 'Parent' : 'Family'),
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [type, id]);

  const h = parseFloat(form.height_cm);
  const w = parseFloat(form.weight_kg);
  const computedBmi = h > 0 && w > 0 ? (w / Math.pow(h / 100, 2)).toFixed(1) : '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await api.put(`/health/profiles/${type}/${id}`, form);
      if (res.success) {
        navigate(`/health/profiles/${type}/${id}`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update health dossier');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading health profile editor...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/health/profiles/${type}/${id}`}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/health/profiles" className="hover:text-rose-600">
              Health Profiles
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Update Dossier</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            Edit Medical Dossier: {subjectName}
          </h1>
          <p className="text-xs text-slate-500">{subjectSub}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Blood Group
            </label>
            <select
              value={form.blood_group}
              onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 152"
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
              placeholder="e.g. 42"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Computed BMI
            </label>
            <input
              type="text"
              readOnly
              value={computedBmi}
              className="w-full text-xs font-mono font-bold border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Known Allergies (Food / Drug / Pollen)
            </label>
            <input
              type="text"
              placeholder="e.g. Peanuts, Penicillin, Dust allergy"
              value={form.known_allergies}
              onChange={(e) => setForm({ ...form, known_allergies: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Chronic Medical Conditions
            </label>
            <input
              type="text"
              placeholder="e.g. Mild Asthma, Diabetes"
              value={form.chronic_conditions}
              onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Identification Mark / Physical Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Small mole on right forearm"
            value={form.identification_mark}
            onChange={(e) => setForm({ ...form, identification_mark: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Family Doctor Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Arvind Nair"
              value={form.doctor_name}
              onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Family Doctor Phone
            </label>
            <input
              type="tel"
              placeholder="e.g. 9840011223"
              value={form.doctor_phone}
              onChange={(e) => setForm({ ...form, doctor_phone: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Emergency Contact Name
            </label>
            <input
              type="text"
              value={form.emergency_contact_name}
              onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              value={form.emergency_contact_phone}
              onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Relationship
            </label>
            <input
              type="text"
              value={form.emergency_contact_relation}
              onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Special Clinical Notes
          </label>
          <textarea
            rows={3}
            placeholder="Special dietary restrictions, inhaler instructions, etc."
            value={form.medical_notes}
            onChange={(e) => setForm({ ...form, medical_notes: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to={`/health/profiles/${type}/${id}`}
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
            {saving ? 'Saving...' : 'Save Medical Record'}
          </button>
        </div>
      </form>
    </div>
  );
};
