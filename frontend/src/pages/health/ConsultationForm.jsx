import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  ArrowLeft,
  Save,
  Search,
  AlertTriangle,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { api } from '../../api/client';

export const ConsultationForm = () => {
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
    doctor_name: 'Dr. S. K. Ramanathan, MD',
    doctor_reg_no: 'TN-MED-44821',
    student_id: null,
    staff_id: null,
    patient_name: '',
    class_or_dept: '',
    consultation_date: new Date().toISOString().slice(0, 10),
    symptoms: 'Throat pain, dry cough, slight wheezing',
    diagnosis: 'Acute Pharyngitis & Mild Bronchial Spasm',
    prescription: 'Amoxicillin 250mg twice daily x 3 days, Cetirizine 5mg at bedtime',
    advice_and_rest: 'Avoid cold beverages, warm saline gargle 3 times daily, rest from sports for 3 days',
    follow_up_date: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/consultations/${id}`);
        if (res.success && res.consultation) {
          const c = res.consultation;
          setPatientType(c.patient_type || 'student');
          setPatientSearchTerm(c.patient_name || '');
          setSelectedPatientAlerts(c.known_allergies || '');
          setForm({
            doctor_name: c.doctor_name || 'Dr. S. K. Ramanathan, MD',
            doctor_reg_no: c.doctor_reg_no || 'TN-MED-44821',
            student_id: c.student_id || null,
            staff_id: c.staff_id || null,
            patient_name: c.patient_name || '',
            class_or_dept: c.class_or_dept || '',
            consultation_date: c.consultation_date
              ? new Date(c.consultation_date).toISOString().slice(0, 10)
              : '',
            symptoms: c.symptoms || '',
            diagnosis: c.diagnosis || '',
            prescription: c.prescription || '',
            advice_and_rest: c.advice_and_rest || '',
            follow_up_date: c.follow_up_date
              ? new Date(c.follow_up_date).toISOString().slice(0, 10)
              : '',
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load consultation details');
      } finally {
        setLoading(false);
      }
    };
    load();
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
        setPatientSearchResults(patientType === 'student' ? res.students || [] : res.staff || []);
      }
    } catch (err) {
      console.error('Error searching patient:', err);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const selectPatient = (item) => {
    if (patientType === 'student') {
      const clsSec =
        item.class_section ||
        (item.class_name ? `${item.class_name} - ${item.section_name || ''}`.trim() : '');
      setForm((prev) => ({
        ...prev,
        student_id: item.id,
        staff_id: null,
        patient_name: item.student_name,
        class_or_dept: clsSec || 'Class 1 - A',
      }));
      setPatientSearchTerm(`${item.student_name} (${item.admission_no || ''})`);
      setSelectedPatientAlerts(item.known_allergies || '');
    } else {
      setForm((prev) => ({
        ...prev,
        student_id: null,
        staff_id: item.id,
        patient_name: item.full_name,
        class_or_dept: item.department || 'General Staff',
      }));
      setPatientSearchTerm(`${item.full_name} (${item.emp_no || ''})`);
      setSelectedPatientAlerts('');
    }
    setPatientSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.doctor_name.trim() || !form.patient_name.trim() || !form.diagnosis.trim()) {
      setErrorMsg('Doctor Name, Patient Name, and Diagnosis are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...form, patient_type: patientType };
      if (isEdit) {
        await api.put(`/health/consultations/${id}`, payload);
      } else {
        await api.post('/health/consultations', payload);
      }
      navigate('/health/consultations');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save doctor consultation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading consultation form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/health/consultations"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Link to="/health/consultations" className="hover:text-rose-600">
                Doctor Consultations
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-800">
                {isEdit ? 'Edit Consultation' : 'New Consultation'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-rose-600" />
              {isEdit ? `Edit Consultation: ${form.patient_name}` : 'Record Doctor Consultation'}
            </h1>
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={() => navigate(`/health/consultations/${id}/print`)}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print A4 Slip
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Doctor Name *
            </label>
            <input
              type="text"
              required
              value={form.doctor_name}
              onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Doctor Reg #
            </label>
            <input
              type="text"
              value={form.doctor_reg_no}
              onChange={(e) => setForm({ ...form, doctor_reg_no: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        {/* Patient Type Switcher */}
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
                student_id: null,
                staff_id: null,
                patient_name: '',
                class_or_dept: '',
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
                student_id: null,
                staff_id: null,
                patient_name: '',
                class_or_dept: '',
              }));
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              patientType === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            Staff Member
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {patientType === 'student' ? 'Select Student *' : 'Select Staff *'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder={
                  patientType === 'student' ? 'Type student name or adm no...' : 'Type staff name or emp no...'
                }
                value={patientSearchTerm}
                onChange={(e) => handlePatientSearch(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-slate-800"
              />
              {isSearchingPatient && (
                <span className="absolute right-3 top-3 text-[10px] text-slate-400">Searching...</span>
              )}
            </div>

            {patientSearchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {patientSearchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectPatient(item)}
                    className="p-2.5 hover:bg-rose-50 cursor-pointer text-xs flex items-center justify-between"
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
              value={form.class_or_dept}
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

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Symptoms &amp; Complaints *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Persistent cough, high fever"
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Clinical Diagnosis *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Acute Pharyngitis"
            value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Prescription / Medications
          </label>
          <textarea
            rows={3}
            placeholder="Medication names, dosage, and duration..."
            value={form.prescription}
            onChange={(e) => setForm({ ...form, prescription: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Advice &amp; Rest Recommendations
          </label>
          <input
            type="text"
            placeholder="e.g. Rest from physical activity for 3 days"
            value={form.advice_and_rest}
            onChange={(e) => setForm({ ...form, advice_and_rest: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Consultation Date
            </label>
            <input
              type="date"
              value={form.consultation_date}
              onChange={(e) => setForm({ ...form, consultation_date: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Follow-Up Date (Optional)
            </label>
            <input
              type="date"
              value={form.follow_up_date}
              onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/consultations"
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
            {submitting ? 'Saving...' : isEdit ? 'Update Consultation' : 'Record Consultation'}
          </button>
        </div>
      </form>
    </div>
  );
};
