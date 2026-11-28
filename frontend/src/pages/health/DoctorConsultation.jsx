import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Printer, Edit, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const DoctorConsultation = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConsultations();
  }, [selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/consultations');
      if (res.success) {
        setConsultations(res.consultations || []);
      }
    } catch (err) {
      console.error('Error fetching doctor consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete consultation ${c.consultation_number} for ${c.patient_name}?`)) return;
    try {
      await api.delete(`/health/consultations/${c.id}`);
      fetchConsultations();
    } catch (err) {
      alert(err.message || 'Failed to delete consultation record.');
    }
  };

  const filtered = consultations.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.consultation_number?.toLowerCase().includes(term) ||
      c.patient_name?.toLowerCase().includes(term) ||
      c.doctor_name?.toLowerCase().includes(term) ||
      c.diagnosis?.toLowerCase().includes(term) ||
      c.class_or_dept?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Visiting Physician &amp; Clinic
            </span>
            <span className="text-xs text-slate-500 font-medium">Doctor Consultation Desk</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Doctor Consultations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log physician clinical evaluations, edit prescriptions, manage follow-up schedules, and print A4 prescription slips.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/health/consultations/new')}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Log Doctor Consultation
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search consultation #, patient, diagnosis, doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Total Consultations: {filtered.length}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading consultations...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          No doctor consultation records found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-rose-700">
                      {c.consultation_number}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{c.patient_name}</h3>
                    <p className="text-xs text-slate-500">{c.class_or_dept}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">
                      {new Date(c.consultation_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">{c.patient_type}</span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Diagnosis
                  </span>
                  <p className="font-bold text-slate-900">{c.diagnosis}</p>
                  <p className="text-slate-600 mt-1">Symptoms: {c.symptoms}</p>
                </div>

                {c.prescription && (
                  <div className="mt-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Rx / Prescription
                    </span>
                    <p className="font-medium text-slate-800">{c.prescription}</p>
                  </div>
                )}

                {c.advice_and_rest && (
                  <p className="text-xs text-slate-600 mt-2">
                    <strong className="text-slate-700">Advice:</strong> {c.advice_and_rest}
                  </p>
                )}

                {c.follow_up_date && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    Follow-Up: {new Date(c.follow_up_date).toLocaleDateString()}
                  </p>
                )}

                <p className="text-[11px] text-slate-400 mt-3 font-medium">
                  Attending: {c.doctor_name}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/health/consultations/${c.id}/edit`)}
                    className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                    title="Delete Consultation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/health/consultations/${c.id}/print`)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  A4 Slip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
