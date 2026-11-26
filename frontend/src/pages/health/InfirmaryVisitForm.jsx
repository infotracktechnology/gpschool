import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  HeartPulse,
  ArrowLeft,
  Save,
  Search,
  AlertTriangle,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { api } from '../../api/client';

export const InfirmaryVisitForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [patientType, setPatientType] = useState('student');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatientAlerts, setSelectedPatientAlerts] = useState('');

  const [form, setForm] = useState({
    student_id: null,
    staff_id: null,
    patient_name: '',
    class_section: '',
    department: '',
    visit_date: new Date().toISOString().slice(0, 10),
    visit_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    visit_type: 'illness',
    chief_complaint: 'High fever and headache',
    treatment_given: 'Cold compress, ORS hydration provided',
    temperature_f: '99.5',
    pulse_bpm: '82',
    disposition: 'resting_in_bay',
    bed_number: 'Bed 1',
    attended_by: 'Nurse Saradha',
    remarks: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    const loadVisit = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/visits/${id}`);
        if (res.success && res.visit) {
          const v = res.visit;
          setPatientType(v.patient_type || 'student');
          setPatientSearchTerm(v.patient_name || '');
          setSelectedPatientAlerts(v.known_allergies || '');
          setForm({
            student_id: v.student_id || null,
            staff_id: v.staff_id || null,
            patient_name: v.patient_name || '',
            class_section: v.class_section || '',
            department: v.department || '',
            visit_date: v.visit_date ? new Date(v.visit_date).toISOString().slice(0, 10) : '',
            visit_time: v.visit_time || '',
            visit_type: v.visit_type || 'illness',
            chief_complaint: v.chief_complaint || '',
            treatment_given: v.treatment_given || '',
            temperature_f: v.temperature_f || '',
            pulse_bpm: v.pulse_bpm || '',
            disposition: v.disposition || 'sent_back_to_class',
            bed_number: v.bed_number || '',
            attended_by: v.attended_by || 'Nurse Saradha',
            remarks: v.remarks || '',
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load infirmary visit details');
      } finally {
        setLoading(false);
      }
    };
    loadVisit();
  }, [id, isEdit]);

  const handlePatientSearch = async (val) => {
    setPatientSearchTerm(val);
    if (!val || val.trim().length < 1) {
      setPatientSearchResults([]);
      return;
    }
    try {
      setIsSearchingPatient(true);
      const endpoint =
        patientType === 'student'
          ? `/health/search-students?q=${encodeURIComponent(val)}`
          : `/health/search-staff?q=${encodeURIComponent(val)}`;
      const res = await api.get(endpoint);
      if (res.success) {
        setPatientSearchResults(patientType === 'student' ? res.students : res.staff);
      }
    } catch (err) {
      console.error('Error searching patient:', err);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const selectPatient = (item) => {
    if (patientType === 'student') {
      const clsSec = item.class_section || `${item.class_name || ''} - ${item.section_name || ''}`.trim();
      setForm((prev) => ({
        ...prev,
        student_id: item.id,
        staff_id: null,
        patient_name: item.student_name,
        class_section: clsSec || 'Class 1 - A',
        department: '',
      }));
      setPatientSearchTerm(`${item.student_name} (${item.admission_no})`);
      setSelectedPatientAlerts(item.known_allergies || '');
    } else {
      setForm((prev) => ({
        ...prev,
        student_id: null,
        staff_id: item.id,
        patient_name: item.full_name,
        department: item.department || 'General Staff',
        class_section: '',
      }));
      setPatientSearchTerm(`${item.full_name} (${item.emp_no})`);
      setSelectedPatientAlerts('');
    }
    setPatientSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.patient_name.trim() || !form.chief_complaint.trim()) {
      setErrorMsg('Please select a student or staff patient and enter Chief Complaint.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...form, patient_type: patientType };
      if (isEdit) {
        await api.put(`/health/visits/${id}`, payload);
      } else {
        await api.post('/health/visits', payload);
      }
      navigate('/health/infirmary');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save infirmary visit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading visit form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/health/infirmary"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/health/infirmary" className="hover:text-rose-600">
                Infirmary Desk
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {isEdit ? 'Edit Visit & Disposition' : 'Log Patient Visit'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              {isEdit ? `Edit Infirmary Visit: ${form.patient_name}` : 'Log New Infirmary Visit'}
            </h1>
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={() => navigate(`/health/infirmary/${id}/print`)}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print A4 Incident Slip
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
        {/* Patient Type Switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl max-w-sm">
          <button
            type="button"
            onClick={() => {
              setPatientType('student');
              setPatientSearchTerm('');
              setPatientSearchResults([]);
              setSelectedPatientAlerts('');
              setForm((prev) => ({
                ...prev,
                patient_name: '',
                class_section: '',
                department: '',
                student_id: null,
                staff_id: null,
              }));
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              patientType === 'student' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => {
              setPatientType('staff');
              setPatientSearchTerm('');
              setPatientSearchResults([]);
              setSelectedPatientAlerts('');
              setForm((prev) => ({
                ...prev,
                patient_name: '',
                class_section: '',
                department: '',
                student_id: null,
                staff_id: null,
              }));
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              patientType === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Staff Member
          </button>
        </div>

        {/* Patient Lookup & Auto-Filled Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {patientType === 'student' ? 'Select Student *' : 'Select Staff *'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder={
                  patientType === 'student' ? 'Type student name or adm no...' : 'Type staff name or emp no...'
                }
                value={patientSearchTerm}
                onChange={(e) => handlePatientSearch(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {isSearchingPatient && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</span>
              )}
            </div>

            {patientSearchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {patientSearchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectPatient(item)}
                    className="p-2.5 hover:bg-rose-50 cursor-pointer text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {patientType === 'student' ? item.student_name : item.full_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {patientType === 'student'
                          ? `Adm: ${item.admission_no} | Class: ${item.class_section || item.class_name || 'N/A'}`
                          : `Emp: ${item.emp_no} | Dept: ${item.department || 'General'}`}
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
              {patientType === 'student' ? 'Class & Section' : 'Department'}
              <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                Auto-Filled
              </span>
            </label>
            <input
              type="text"
              required
              readOnly
              placeholder={patientType === 'student' ? 'Auto-filled upon selecting student' : 'Auto-filled upon selecting staff'}
              value={patientType === 'student' ? form.class_section : form.department}
              className="w-full text-xs font-bold border border-slate-200 bg-slate-50/80 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        {selectedPatientAlerts && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Medical Alert:</strong> Known Allergies: <span className="font-bold">{selectedPatientAlerts}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Visit Type
            </label>
            <select
              value={form.visit_type}
              onChange={(e) => setForm({ ...form, visit_type: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              <option value="illness">Illness / Fever</option>
              <option value="injury">Injury / First Aid</option>
              <option value="routine">Routine Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Visit Date
            </label>
            <input
              type="date"
              value={form.visit_date}
              onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Temperature (°F)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.temperature_f}
              onChange={(e) => setForm({ ...form, temperature_f: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Pulse (bpm)
            </label>
            <input
              type="number"
              value={form.pulse_bpm}
              onChange={(e) => setForm({ ...form, pulse_bpm: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Chief Complaint / Reason *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Severe headache, Fever 101°F, Playground knee scrape"
            value={form.chief_complaint}
            onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Treatment &amp; First Aid Given *
          </label>
          <textarea
            rows={3}
            required
            placeholder="e.g. Wound dressed with antiseptic gauze, ORS provided"
            value={form.treatment_given}
            onChange={(e) => setForm({ ...form, treatment_given: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Disposition Outcome
            </label>
            <select
              value={form.disposition}
              onChange={(e) => setForm({ ...form, disposition: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              <option value="resting_in_bay">Resting in Infirmary Bay</option>
              <option value="sent_back_to_class">Sent Back to Class / Work</option>
              <option value="sent_home">Sent Home with Parent</option>
              <option value="referred_hospital">Referred to Hospital</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Infirmary Bed #
            </label>
            <input
              type="text"
              placeholder="e.g. Bed 1"
              value={form.bed_number}
              onChange={(e) => setForm({ ...form, bed_number: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Attending Staff / Nurse
            </label>
            <input
              type="text"
              value={form.attended_by}
              onChange={(e) => setForm({ ...form, attended_by: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Clinical Observations &amp; Parent Pickup Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Notes regarding recovery, parent communication, or pickup..."
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/infirmary"
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
            {submitting ? 'Saving...' : isEdit ? 'Update Infirmary Visit' : 'Record Infirmary Visit'}
          </button>
        </div>
      </form>
    </div>
  );
};
