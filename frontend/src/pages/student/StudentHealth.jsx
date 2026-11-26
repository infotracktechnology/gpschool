import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  FileText,
  User,
  Phone,
  Building2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const StudentHealth = () => {
  const { user } = useAuth();
  const [dossier, setDossier] = useState({
    profile: {},
    visits: [],
    checkups: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthDossier();
  }, []);

  const fetchHealthDossier = async () => {
    try {
      setLoading(true);
      // Fallback to student ID 1 if not directly in user object
      const studentId = user?.student_id || 1;
      const res = await api.get(`/health/student-dossier/${studentId}`);
      if (res.success) {
        setDossier(res);
      }
    } catch (err) {
      console.error('Error fetching student health dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  const { profile, visits, checkups } = dossier;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Student Wellness Desk
            </span>
            <span className="text-xs text-slate-500 font-medium">CBSE Student Health Record</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">My Health & Medical Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View verified health parameters, recorded allergies, campus check-up findings, and infirmary visits.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealthDossier}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors self-start md:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Health Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-700 font-black flex items-center justify-center text-xl border-2 border-rose-200 shadow-xs">
              {profile.blood_group || 'O+'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {profile.student_name || user?.name || 'Student'}
                </h2>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-mono font-bold">
                  Adm: {profile.admission_no || 'GPS-2026'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Blood Group & Medical Dossier on file</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Height</span>
              <p className="text-sm font-extrabold text-slate-800">{profile.height_cm ? `${profile.height_cm} cm` : '—'}</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Weight</span>
              <p className="text-sm font-extrabold text-slate-800">{profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-xl text-center border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">BMI</span>
              <p className="text-sm font-extrabold text-slate-800">{profile.bmi || '—'}</p>
            </div>
          </div>
        </div>

        {/* Alerts & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-amber-900 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Known Medical Allergies
            </span>
            <p className="text-xs font-semibold text-slate-800">
              {profile.known_allergies || 'No known allergies reported'}
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-rose-900 uppercase flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-600" />
              Chronic Conditions & Notes
            </span>
            <p className="text-xs font-semibold text-slate-800">
              {profile.chronic_conditions || 'None reported'}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Left Infirmary Visits + Right Checkup Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Past Infirmary Visits */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600" />
            Infirmary Visit History ({visits.length})
          </h3>

          {visits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No infirmary visits recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {visits.map((v) => (
                <div key={v.id} className="py-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-rose-700">{v.visit_number}</span>
                    <span className="text-slate-400 font-medium">
                      {new Date(v.visit_date).toLocaleDateString()} at {v.visit_time}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800">{v.chief_complaint}</p>
                  <p className="text-slate-600 text-[11px]">Treatment: {v.treatment_given}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold capitalize">
                      {v.disposition.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">By {v.attended_by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Periodic Health Check-up Cards */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Campus Screening Reports ({checkups.length})
          </h3>

          {checkups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No annual health screening records found.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {checkups.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">
                      Exam: {new Date(c.checkup_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {c.general_fitness}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>Vision: <strong>{c.vision_left} / {c.vision_right}</strong></div>
                    <div>Dental: <strong>{c.dental_status}</strong></div>
                  </div>
                  {c.doctor_remarks && (
                    <p className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                      Doctor Remarks: {c.doctor_remarks}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 text-right">Examiner: {c.examiner_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
