import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  GraduationCap,
  User,
  Users,
  Home,
  School,
} from 'lucide-react';
import { api } from '../../api/client';

export const ApplicationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('student');

  const [formData, setFormData] = useState({
    branch_id: '',
    academic_year_id: '',
    class_id: '',
    student_name: '',
    gender: 'male',
    dob: '',
    blood_group: '',
    aadhaar_no: '',
    religion: '',
    mother_tongue: '',
    father_name: '',
    father_occupation: '',
    father_phone: '',
    mother_name: '',
    mother_phone: '',
    address_street: '',
    city: '',
    state: '',
    pincode: '',
    prev_school_name: '',
    prev_class_passed: '',
    prev_tc_no: '',
  });

  // Load lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, yearRes, classRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/settings/academic-years'),
          api.get('/academics/classes'),
        ]);

        const bList = branchRes.branches || branchRes.data || [];
        const yList = yearRes.academicYears || yearRes.data || [];
        const cList = classRes.classes || classRes.data || [];

        setBranches(bList);
        setAcademicYears(yList);
        setClasses(cList);

        if (!isEdit) {
          const activeYear = yList.find((y) => y.status === 'active') || yList[0];
          setFormData((prev) => ({
            ...prev,
            branch_id: bList.length > 0 ? String(bList[0].id) : '',
            academic_year_id: activeYear ? String(activeYear.id) : '',
            class_id: cList.length > 0 ? String(cList[0].id) : '',
          }));
        }
      } catch (err) {
        console.error('Failed to load lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, [isEdit]);

  // Load existing data if edit
  useEffect(() => {
    if (!isEdit) return;
    const fetchApp = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/admissions/applications/${id}`);
        const app = res.application || res.data || {};
        setFormData({
          branch_id: app.branch_id ? String(app.branch_id) : '',
          academic_year_id: app.academic_year_id ? String(app.academic_year_id) : '',
          class_id: app.class_id ? String(app.class_id) : '',
          student_name: app.student_name || '',
          gender: app.gender || 'male',
          dob: app.dob ? String(app.dob).slice(0, 10) : '',
          blood_group: app.blood_group || '',
          aadhaar_no: app.aadhaar_no || '',
          religion: app.religion || '',
          mother_tongue: app.mother_tongue || '',
          father_name: app.father_name || '',
          father_occupation: app.father_occupation || '',
          father_phone: app.father_phone || '',
          mother_name: app.mother_name || '',
          mother_phone: app.mother_phone || '',
          address_street: app.address_street || '',
          city: app.city || '',
          state: app.state || '',
          pincode: app.pincode || '',
          prev_school_name: app.prev_school_name || '',
          prev_class_passed: app.prev_class_passed || '',
          prev_tc_no: app.prev_tc_no || '',
        });
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load application data.' });
      } finally {
        setLoadingData(false);
      }
    };
    fetchApp();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        branch_id: Number(formData.branch_id),
        academic_year_id: Number(formData.academic_year_id),
        class_id: Number(formData.class_id),
      };

      if (isEdit) {
        await api.put(`/admissions/applications/${id}`, payload);
      } else {
        await api.post('/admissions/applications', payload);
      }
      navigate('/admissions/applications');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit application.' });
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'student', label: '1. Student Details', icon: User },
    { id: 'parents', label: '2. Parent & Guardian', icon: Users },
    { id: 'address', label: '3. Residential Address', icon: Home },
    { id: 'prev_school', label: '4. Prior School & TC', icon: School },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/admissions/applications"
            className="p-2 rounded-xl border border-border hover:bg-slate-100 text-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-heading">
              {isEdit ? 'Edit Admission Application' : 'New Admission Application Dossier'}
            </h1>
            <p className="text-sm text-muted">
              Complete student candidate profile, parent demographics, residential, and academic history.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1 text-sm font-semibold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loadingData ? (
        <div className="p-12 text-center text-muted">Loading form details...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab 1: Student Details */}
          {activeTab === 'student' && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Enrollment Target & Student Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.academic_year_id}
                    onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applying Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    placeholder="Candidate full name"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaar_no}
                    onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                    placeholder="12 digit UID"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Religion / Community
                  </label>
                  <input
                    type="text"
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    placeholder="e.g. Hindu, Muslim, Christian"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mother Tongue
                  </label>
                  <input
                    type="text"
                    value={formData.mother_tongue}
                    onChange={(e) => setFormData({ ...formData, mother_tongue: e.target.value })}
                    placeholder="e.g. Hindi, English"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('parents')}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                  Next: Parent Info →
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Parent & Guardian Details */}
          {activeTab === 'parents' && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Father & Mother Information
              </h3>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-border space-y-4">
                <h4 className="font-semibold text-heading text-sm">Father's Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Father's Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      placeholder="Father full name"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Father's Occupation
                    </label>
                    <input
                      type="text"
                      value={formData.father_occupation}
                      onChange={(e) =>
                        setFormData({ ...formData, father_occupation: e.target.value })
                      }
                      placeholder="e.g. Engineer, Business"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Father's Mobile <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.father_phone}
                      onChange={(e) => setFormData({ ...formData, father_phone: e.target.value })}
                      placeholder="Mobile number"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-border space-y-4">
                <h4 className="font-semibold text-heading text-sm">Mother's Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      value={formData.mother_name}
                      onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                      placeholder="Mother full name"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mother's Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mother_phone}
                      onChange={(e) => setFormData({ ...formData, mother_phone: e.target.value })}
                      placeholder="Mobile number"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('student')}
                  className="px-5 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600"
                >
                  ← Back to Student
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                  Next: Residential Address →
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Residential Address */}
          {activeTab === 'address' && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Residential Address & Postal Data
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  value={formData.address_street}
                  onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                  placeholder="House number, apartment/colony, street locality"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Pune, Mumbai, Bangalore"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Maharashtra, Karnataka"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 411001"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('parents')}
                  className="px-5 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600"
                >
                  ← Back to Parent Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('prev_school')}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                  Next: Prior Schooling →
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Previous School & TC Details */}
          {activeTab === 'prev_school' && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Prior School Records & Transfer Certificate
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Previous School Name
                  </label>
                  <input
                    type="text"
                    value={formData.prev_school_name}
                    onChange={(e) =>
                      setFormData({ ...formData, prev_school_name: e.target.value })
                    }
                    placeholder="e.g. St. Xavier's High School"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Class Passed
                  </label>
                  <input
                    type="text"
                    value={formData.prev_class_passed}
                    onChange={(e) =>
                      setFormData({ ...formData, prev_class_passed: e.target.value })
                    }
                    placeholder="e.g. Class 4"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Certificate (TC) No
                  </label>
                  <input
                    type="text"
                    value={formData.prev_tc_no}
                    onChange={(e) => setFormData({ ...formData, prev_tc_no: e.target.value })}
                    placeholder="e.g. TC/2024/991"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className="px-5 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600"
                >
                  ← Back to Address
                </button>
                <div className="flex items-center gap-3">
                  <Link
                    to="/admissions/applications"
                    className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? 'Saving...' : isEdit ? 'Update Application' : 'Submit Application'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
