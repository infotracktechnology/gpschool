import React, { useState, useEffect } from 'react';
import {
  Heart,
  Send,
  AlertCircle,
  CheckCircle,
  Thermometer,
  User,
  Users,
  Activity,
  Phone,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const PortalHealth = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);

  const [referral, setReferral] = useState({
    student_name: '',
    class_section: '',
    reason: 'Sudden high fever and dizziness during lecture',
    temperature_f: '100.2',
  });

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
    setReferral((prev) => ({
      ...prev,
      student_name: st.student_name,
      class_section: clsSec || 'Class 1 - A',
    }));
    setStudentSearchTerm(`${st.student_name} (${st.admission_no || ''})`);
    setStudentSearchResults([]);
  };

  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!referral.student_name.trim() || !referral.reason.trim()) {
      setErrorMsg('Please enter student name and symptoms/reason.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/health/refer-from-portal', referral);
      if (res.success) {
        setSuccessMsg(`Referral successfully dispatched for ${referral.student_name} to the Infirmary Desk (${res.visit?.visit_number}).`);
        setStudentSearchTerm('');
        setStudentSearchResults([]);
        setReferral({
          student_name: '',
          class_section: '',
          reason: '',
          temperature_f: '',
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit student referral.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
            Faculty Healthcare Desk
          </span>
          <span className="text-xs text-slate-500 font-medium">Classroom Triage & Referral</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-1">Infirmary Referrals & Health Desk</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Instantly refer unwell students from classroom to the campus infirmary and review your staff health profile.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Form (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-rose-600" />
            Send Sick Student to Infirmary
          </h2>
          <p className="text-xs text-slate-500">
            Alerts the school nurse immediately so the infirmary bed and first aid are prepared upon the student's arrival.
          </p>

          <form onSubmit={handleReferralSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Search & Select Student *
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Type student name or adm no..."
                    value={studentSearchTerm}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  {isSearchingStudent && (
                    <span className="absolute right-3 top-3 text-[10px] text-slate-400">Searching...</span>
                  )}
                </div>

                {/* Dropdown */}
                {studentSearchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {studentSearchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => selectStudent(st)}
                        className="p-2.5 hover:bg-rose-50 cursor-pointer text-xs flex items-center justify-between transition-colors"
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
                  Current Class & Section *
                  <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Auto-Filled
                  </span>
                </label>
                <input
                  type="text"
                  required
                  readOnly
                  placeholder="Auto-filled upon selecting student"
                  value={referral.class_section}
                  className="w-full text-xs font-bold border border-slate-200 bg-slate-50/80 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Observed Symptoms / Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Complaining of intense stomach pain, vomiting sensation, fever..."
                value={referral.reason}
                onChange={(e) => setReferral({ ...referral, reason: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Temperature (°F) (If checked with classroom thermometer)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 100.4"
                value={referral.temperature_f}
                onChange={(e) => setReferral({ ...referral, temperature_f: e.target.value })}
                className="w-48 text-xs font-mono font-medium border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Dispatching...' : 'Dispatch Referral to Infirmary'}
              </button>
            </div>
          </form>
        </div>

        {/* Staff Health Dossier (Right Col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" />
            My Health Record
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-700 font-black text-xl flex items-center justify-center border-2 border-rose-200">
              A+
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">{user?.name || 'Faculty Member'}</h4>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ') || 'Teacher'}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-400">Blood Group:</span>
              <strong className="text-slate-800 font-mono">A+ Positive</strong>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-400">Allergies:</span>
              <span className="font-medium text-slate-800">No known allergies</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-400">Infirmary Hotline:</span>
              <span className="font-mono font-bold text-rose-700">Ext: 201</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
