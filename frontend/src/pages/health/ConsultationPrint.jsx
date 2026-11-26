import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Edit } from 'lucide-react';
import { api } from '../../api/client';
import { A4PrintStyles, ConsultationA4Sheet } from '../../components/health/HealthPrintTemplates';

export const ConsultationPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consult, setConsult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/consultations/${id}`);
        if (res.success && res.consultation) {
          setConsult(res.consultation);
        } else {
          setError('Consultation record not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load prescription slip');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading A4 Prescription Slip...</div>;
  }

  return (
    <>
      <A4PrintStyles />
      <div className="a4-print-only">
        <ConsultationA4Sheet consult={consult} />
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              to="/health/consultations"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <p className="text-xs text-slate-500">A4 Formal Monochrome Clinical Slip</p>
              <h1 className="text-base font-bold text-slate-900">
                {consult?.consultation_number} — {consult?.patient_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/health/consultations/${id}/edit`)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Consultation
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!consult}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print A4 Slip
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {error}
          </div>
        ) : (
          <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-200">
            <ConsultationA4Sheet consult={consult} />
          </div>
        )}
      </div>
    </>
  );
};
