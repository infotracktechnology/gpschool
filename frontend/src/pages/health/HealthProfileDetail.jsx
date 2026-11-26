import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Heart,
  HeartPulse,
  Stethoscope,
  Pill,
  FileBadge,
  Bell,
  Phone,
  AlertTriangle,
  Printer,
  Plus,
} from 'lucide-react';
import { api } from '../../api/client';

export const HealthProfileDetail = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState('visits');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDossier();
  }, [type, id]);

  const fetchDossier = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/health/profiles/${type}/${id}`);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load full medical dossier');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading longitudinal health dossier...</div>;
  }

  if (errorMsg || !data?.profile) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Link to="/health/profiles" className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Health Profiles
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          {errorMsg || 'Profile not found.'}
        </div>
      </div>
    );
  }

  const p = data.profile;
  const isStudent = type === 'student';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <Link
            to="/health/profiles"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                {isStudent ? 'Student Medical Dossier' : 'Staff Medical Dossier'}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {isStudent ? p.admission_no : p.emp_no}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{p.full_name}</h1>
            <p className="text-xs text-slate-500">
              {p.class_or_dept} • Blood Group: <strong className="text-rose-700">{p.blood_group || '—'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/health/profiles/${type}/${id}/edit`)}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Dossier
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/infirmary/new')}
            className="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Log Visit
          </button>
          {isStudent && (
            <button
              type="button"
              onClick={() => navigate(`/health/notifications/new?studentId=${id}`)}
              className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" /> Notify Parent
            </button>
          )}
        </div>
      </div>

      {/* Baseline Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Biometrics &amp; Identity
          </h3>
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Height</span>
              <p className="font-extrabold text-slate-900">{p.height_cm ? `${p.height_cm} cm` : '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Weight</span>
              <p className="font-extrabold text-slate-900">{p.weight_kg ? `${p.weight_kg} kg` : '—'}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">BMI</span>
              <p className="font-extrabold text-slate-900">{p.bmi || '—'}</p>
            </div>
          </div>
          <p>
            <span className="text-slate-400">Identification Mark:</span>{' '}
            <strong className="text-slate-800">{p.identification_mark || 'Not recorded'}</strong>
          </p>
          <p>
            <span className="text-slate-400">Medical Notes:</span>{' '}
            <span className="text-slate-700">{p.medical_notes || 'No general notes.'}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Medical Flags &amp; Physician
          </h3>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase block text-amber-700">Known Allergies</span>
              <strong>{p.known_allergies || 'No known allergies'}</strong>
            </div>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2">
            <Heart className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase block text-rose-700">Chronic Conditions</span>
              <strong>{p.chronic_conditions || 'None reported'}</strong>
            </div>
          </div>
          <p>
            <span className="text-slate-400">Family Doctor:</span>{' '}
            <strong className="text-slate-800">{p.doctor_name || '—'}</strong>{' '}
            {p.doctor_phone && <span className="font-mono text-slate-600">({p.doctor_phone})</span>}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
            Emergency Contacts
          </h3>
          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Primary Emergency ({p.emergency_contact_relation || 'Family'})
            </span>
            <p className="font-bold text-slate-900">{p.emergency_contact_name || 'Parent / Guardian'}</p>
            {p.emergency_contact_phone && (
              <a
                href={`tel:${p.emergency_contact_phone}`}
                className="font-mono font-bold text-rose-700 hover:underline inline-flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> {p.emergency_contact_phone}
              </a>
            )}
          </div>
          {isStudent && (p.father_phone || p.mother_phone) && (
            <div className="space-y-1 text-[11px]">
              {p.father_phone && (
                <p>
                  Father ({p.father_name || 'Father'}): <strong className="font-mono">{p.father_phone}</strong>
                </p>
              )}
              {p.mother_phone && (
                <p>
                  Mother ({p.mother_name || 'Mother'}): <strong className="font-mono">{p.mother_phone}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Longitudinal Clinical Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          {[
            { id: 'visits', label: `Infirmary Visits (${data.visits.length})`, icon: HeartPulse },
            ...(isStudent
              ? [{ id: 'checkups', label: `Health Check-ups (${data.checkups.length})`, icon: Stethoscope }]
              : []),
            { id: 'consultations', label: `Doctor Consultations (${data.consultations.length})`, icon: FileBadge },
            { id: 'medicines', label: `Medicines Dispensed (${data.medicines.length})`, icon: Pill },
            ...(isStudent
              ? [{ id: 'notifications', label: `Parent Alerts (${data.notifications.length})`, icon: Bell }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeSection === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-rose-600" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 text-xs">
          {activeSection === 'visits' && (
            data.visits.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No infirmary visits logged.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.visits.map((v) => (
                  <div key={v.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-rose-700">{v.visit_number}</span>{' '}
                      <span className="text-slate-400">• {new Date(v.visit_date).toLocaleDateString()} ({v.visit_time})</span>
                      <p className="font-bold text-slate-900 mt-0.5">{v.chief_complaint}</p>
                      <p className="text-slate-600">Treatment: {v.treatment_given}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/health/infirmary/${v.id}/print`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/health/infirmary/${v.id}/edit`)}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeSection === 'checkups' && (
            data.checkups.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No periodic check-ups recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.checkups.map((c) => (
                  <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        Check-up on {new Date(c.checkup_date).toLocaleDateString()} — Fitness: {c.general_fitness}
                      </p>
                      <p className="text-slate-600">
                        Ht: {c.height_cm}cm, Wt: {c.weight_kg}kg, Vision: {c.vision_left}/{c.vision_right}, Dental: {c.dental_status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/health/checkups/${c.id}/print`)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> A4 Card
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/health/checkups/${c.id}/edit`)}
                        className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeSection === 'consultations' && (
            data.consultations.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No doctor consultations recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.consultations.map((c) => (
                  <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-rose-700">{c.consultation_number}</span>{' '}
                      <span className="text-slate-400">• {new Date(c.consultation_date).toLocaleDateString()}</span>
                      <p className="font-bold text-slate-900">{c.diagnosis} ({c.doctor_name})</p>
                      {c.prescription && <p className="text-slate-600">Rx: {c.prescription}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/health/consultations/${c.id}/print`)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> Rx Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/health/consultations/${c.id}/edit`)}
                        className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeSection === 'medicines' && (
            data.medicines.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No medicine dispensing records.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.medicines.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        {m.medicine_name} ({m.dosage_qty})
                      </p>
                      <p className="text-slate-500">
                        {new Date(m.dispensed_at).toLocaleString()} • Reason: {m.reason || '—'} • By {m.dispensed_by}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/health/medicines/${m.id}/edit`)}
                      className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeSection === 'notifications' && (
            data.notifications.length === 0 ? (
              <p className="text-center text-slate-400 py-6">No parent alerts logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.notifications.map((n) => (
                  <div key={n.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-800">{n.notification_number}</span>{' '}
                      <span className="text-slate-400">• {n.channel} ({n.urgency})</span>
                      <p className="font-medium text-slate-900 mt-0.5">{n.message_summary}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold">{n.response_status}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
