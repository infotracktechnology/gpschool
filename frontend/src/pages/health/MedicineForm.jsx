import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Pill, ArrowLeft, Save, Search, AlertTriangle, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export const MedicineForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [patientType, setPatientType] = useState('student');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatientAlerts, setSelectedPatientAlerts] = useState('');

  const [form, setForm] = useState({
    patient_name: '',
    class_or_dept: '',
    inventory_id: '',
    medicine_name: 'Paracetamol Suspension (120mg/5ml)',
    dosage_qty: '5 ml',
    quantity_units: 1,
    reason: 'Mild fever and discomfort after lunch',
    dispensed_by: 'Nurse Saradha',
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const invRes = await api.get('/health/inventory');
        if (invRes.success) {
          setInventory(invRes.items || []);
        }

        if (isEdit) {
          const res = await api.get(`/health/medicines/${id}`);
          if (res.success && res.log) {
            const l = res.log;
            setPatientType(l.patient_type || 'student');
            setPatientSearchTerm(l.patient_name || '');
            setForm({
              patient_name: l.patient_name || '',
              class_or_dept: l.class_or_dept || '',
              inventory_id: l.inventory_id || '',
              medicine_name: l.medicine_name || '',
              dosage_qty: l.dosage_qty || '',
              quantity_units: l.quantity_units || 1,
              reason: l.reason || '',
              dispensed_by: l.dispensed_by || 'Nurse Saradha',
            });
          }
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load form details');
      } finally {
        setLoading(false);
      }
    };
    init();
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
        patient_name: item.student_name,
        class_or_dept: clsSec || 'Class 1 - A',
      }));
      setPatientSearchTerm(`${item.student_name} (${item.admission_no || ''})`);
      setSelectedPatientAlerts(item.known_allergies || '');
    } else {
      setForm((prev) => ({
        ...prev,
        patient_name: item.full_name,
        class_or_dept: item.department || 'General Staff',
      }));
      setPatientSearchTerm(`${item.full_name} (${item.emp_no || ''})`);
      setSelectedPatientAlerts('');
    }
    setPatientSearchResults([]);
  };

  const handleInventoryPick = (invId) => {
    const selected = inventory.find((i) => String(i.id) === String(invId));
    setForm((prev) => ({
      ...prev,
      inventory_id: invId,
      medicine_name: selected ? selected.medicine_name : prev.medicine_name,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.patient_name.trim() || !form.medicine_name.trim() || !form.dosage_qty.trim()) {
      setErrorMsg('Recipient, Medicine Name, and Dosage are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        patient_type: patientType,
        inventory_id: form.inventory_id ? Number(form.inventory_id) : null,
      };
      if (isEdit) {
        await api.put(`/health/medicines/${id}`, payload);
      } else {
        await api.post('/health/medicines', payload);
      }
      navigate('/health/medicines');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save medicine dispensing record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading medicine form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/health/medicines"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/health/medicines" className="hover:text-rose-600">
              Medicine Administration
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{isEdit ? 'Edit Log' : 'Dispense Medicine'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Pill className="w-5 h-5 text-rose-600" />
            {isEdit ? `Edit Medicine Log: ${form.patient_name}` : 'Dispense Medicine'}
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
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl max-w-sm">
          <button
            type="button"
            onClick={() => {
              setPatientType('student');
              setPatientSearchTerm('');
              setPatientSearchResults([]);
              setSelectedPatientAlerts('');
              setForm((prev) => ({ ...prev, patient_name: '', class_or_dept: '' }));
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
              setForm((prev) => ({ ...prev, patient_name: '', class_or_dept: '' }));
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
              <strong>Medical Warning:</strong> Known Allergies: <span className="font-bold">{selectedPatientAlerts}</span>
            </span>
          </div>
        )}

        {/* Inventory Picker */}
        {!isEdit && inventory.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Pick from Infirmary Stock (Auto-Deducts Inventory on Save)
            </label>
            <select
              value={form.inventory_id}
              onChange={(e) => handleInventoryPick(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              <option value="">-- Optional: Manual Entry (No Stock Deduction) --</option>
              {inventory.map((inv) => (
                <option key={inv.id} value={inv.id} disabled={inv.status === 'expired' || inv.quantity_available <= 0}>
                  {inv.medicine_name} — {inv.quantity_available} {inv.unit} left ({inv.status.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              value={form.medicine_name}
              onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dosage Label *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5 ml, 1 Tablet"
              value={form.dosage_qty}
              onChange={(e) => setForm({ ...form, dosage_qty: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Units Dispensed
            </label>
            <input
              type="number"
              min="1"
              value={form.quantity_units}
              onChange={(e) => setForm({ ...form, quantity_units: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Reason for Medication
            </label>
            <input
              type="text"
              placeholder="e.g. Headache after PE, Dehydration"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Dispensed By
            </label>
            <input
              type="text"
              value={form.dispensed_by}
              onChange={(e) => setForm({ ...form, dispensed_by: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/medicines"
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
            {submitting ? 'Saving...' : isEdit ? 'Update Dispensing Log' : 'Record Dispensing'}
          </button>
        </div>
      </form>
    </div>
  );
};
