import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Users,
  MapPin,
  HeartPulse,
  School,
  FolderArchive,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Camera,
  Calendar,
  Building2,
  Layers,
  Phone,
  Mail,
  ShieldCheck,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

export const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, branches, selectedBranch, academicYears, selectedAcademicYear } = useAuth();

  const isNew = !id || id === 'new';
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Lookups
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    // Tab 1: Personal & Identity
    student_name: '',
    dob: '',
    gender: 'male',
    blood_group: 'O+',
    aadhaar_no: '',
    religion: 'Hindu',
    caste_category: 'General',
    nationality: 'Indian',
    mother_tongue: 'English',
    avatar_url: '',

    // Tab 2: Academic & Enrollment
    admission_no: '',
    admission_date: new Date().toISOString().slice(0, 10),
    branch_id: '',
    academic_year_id: '',
    class_id: '',
    section_id: '',
    roll_no: '',
    admission_category: 'General',
    status: 'active',

    // Tab 3: Parents & Guardian
    father_name: '',
    father_phone: '',
    father_email: '',
    father_occupation: '',
    mother_name: '',
    mother_phone: '',
    mother_email: '',
    mother_occupation: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    guardian_relation: '',

    // Tab 4: Address & Contact
    street_address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_relation: 'Parent',

    // Tab 5: Previous School Data
    previous_school: '',
    previous_board: '',
    previous_class: '',
    previous_tc_no: '',
    previous_tc_date: '',
    previous_school_address: '',
    previous_result: '',
    previous_reason_for_leaving: '',

    // Tab 6: Documents & History
    notes: '',
  });

  // Enrollment History from server
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);

  // Initialize branch and academic year defaults
  useEffect(() => {
    if (isNew) {
      setFormData((prev) => ({
        ...prev,
        branch_id:
          prev.branch_id ||
          (selectedBranch && selectedBranch.id !== 'all' ? String(selectedBranch.id) : '') ||
          (branches[0] ? String(branches[0].id) : ''),
        academic_year_id:
          prev.academic_year_id ||
          (selectedAcademicYear ? String(selectedAcademicYear.id) : '') ||
          (academicYears[0] ? String(academicYears[0].id) : ''),
      }));
    }
  }, [isNew, selectedBranch, branches, selectedAcademicYear, academicYears]);

  // Load Classes for selected branch
  useEffect(() => {
    const fetchClasses = async () => {
      if (!formData.branch_id || formData.branch_id === 'all') {
        setClassList([]);
        return;
      }
      try {
        const res = await api.get(`/academics/classes?branch_id=${formData.branch_id}`);
        const classes = res.classes || res.data || [];
        setClassList(classes);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    fetchClasses();
  }, [formData.branch_id]);

  // Load Sections for selected class
  useEffect(() => {
    const fetchSections = async () => {
      if (!formData.branch_id || !formData.class_id) {
        setSectionList([]);
        return;
      }
      try {
        const res = await api.get(
          `/academics/sections?branch_id=${formData.branch_id}&class_id=${formData.class_id}`
        );
        const sections = res.sections || res.data || [];
        setSectionList(sections);
      } catch (err) {
        console.error('Failed to load sections:', err);
      }
    };
    fetchSections();
  }, [formData.branch_id, formData.class_id]);

  // Fetch Existing Student Data
  useEffect(() => {
    if (isNew) return;

    const fetchStudent = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/students/${id}`);
        const data = res.student || res.data || res;
        if (data) {
          setFormData({
            student_name: data.student_name || '',
            dob: data.dob ? data.dob.slice(0, 10) : '',
            gender: data.gender || 'male',
            blood_group: data.blood_group || 'O+',
            aadhaar_no: data.aadhaar_no || '',
            religion: data.religion || 'Hindu',
            caste_category: data.caste_category || 'General',
            nationality: data.nationality || 'Indian',
            mother_tongue: data.mother_tongue || 'English',
            avatar_url: data.avatar_url || '',

            admission_no: data.admission_no || '',
            admission_date: data.admission_date
              ? data.admission_date.slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            branch_id: String(data.branch_id || ''),
            academic_year_id: String(data.academic_year_id || ''),
            class_id: String(data.class_id || ''),
            section_id: String(data.section_id || ''),
            roll_no: data.roll_no || '',
            admission_category: data.admission_category || 'General',
            status: data.status || 'active',

            father_name: data.father_name || '',
            father_phone: data.father_phone || '',
            father_email: data.father_email || '',
            father_occupation: data.father_occupation || '',
            mother_name: data.mother_name || '',
            mother_phone: data.mother_phone || '',
            mother_email: data.mother_email || '',
            mother_occupation: data.mother_occupation || '',
            guardian_name: data.guardian_name || '',
            guardian_phone: data.guardian_phone || '',
            guardian_email: data.guardian_email || '',
            guardian_relation: data.guardian_relation || '',

            street_address: data.street_address || data.address_street || '',
            city: data.city || '',
            state: data.state || '',
            pincode: data.pincode || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            emergency_relation: data.emergency_relation || 'Parent',

            previous_school: data.previous_school || '',
            previous_board: data.previous_board || '',
            previous_class: data.previous_class || '',
            previous_tc_no: data.previous_tc_no || '',
            previous_tc_date: data.previous_tc_date ? data.previous_tc_date.slice(0, 10) : '',
            previous_school_address: data.previous_school_address || '',
            previous_result: data.previous_result || '',
            previous_reason_for_leaving: data.previous_reason_for_leaving || '',

            notes: data.notes || '',
          });

          if (data.enrollments || data.enrollment_history) {
            setEnrollmentHistory(data.enrollments || data.enrollment_history || []);
          }
        }
      } catch (err) {
        console.error('Failed to load student:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to load student details' });
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, isNew]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'branch_id') {
        updated.class_id = '';
        updated.section_id = '';
      } else if (field === 'class_id') {
        updated.section_id = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Basic Validation
    if (!formData.student_name.trim()) {
      setActiveTab('personal');
      setMessage({ type: 'error', text: 'Student Name is required' });
      return;
    }
    if (!formData.admission_no.trim()) {
      setActiveTab('academic');
      setMessage({ type: 'error', text: 'Admission Number is required' });
      return;
    }
    if (!formData.branch_id) {
      setActiveTab('academic');
      setMessage({ type: 'error', text: 'Branch / Campus is required' });
      return;
    }
    if (!formData.class_id) {
      setActiveTab('academic');
      setMessage({ type: 'error', text: 'Class is required' });
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/students', formData);
        setMessage({ type: 'success', text: 'Student admitted and enrolled successfully!' });
        setTimeout(() => {
          const newId = res.student?.id || res.id;
          if (newId) {
            navigate(`/students/${newId}/edit`);
          } else {
            navigate('/students');
          }
        }, 1200);
      } else {
        await api.put(`/students/${id}`, formData);
        setMessage({ type: 'success', text: 'Student profile updated successfully!' });
      }
    } catch (err) {
      console.error('Failed to save student:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save student details' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'personal', label: '1. Personal & Identity', icon: User },
    { id: 'academic', label: '2. Academic & Enrollment', icon: GraduationCap },
    { id: 'parents', label: '3. Parents & Guardian', icon: Users },
    { id: 'address', label: '4. Address & Contact', icon: MapPin },
    { id: 'previous_school', label: '5. Previous School Data', icon: School },
    { id: 'history', label: '6. Documents & History', icon: FolderArchive },
  ];

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Back to Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-2xl shadow-inner overflow-hidden">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt={formData.student_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formData.student_name?.charAt(0).toUpperCase() || 'S'
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter Avatar Image URL:', formData.avatar_url);
                  if (url !== null) handleChange('avatar_url', url);
                }}
                className="absolute -bottom-1 -right-1 p-1 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-xs hover:text-brand-600"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isNew ? 'New Student Admission' : formData.student_name || 'Student Profile'}
                </h1>
                {!isNew && (
                  <Badge
                    variant={
                      formData.status === 'active'
                        ? 'active'
                        : formData.status === 'transferred'
                        ? 'upcoming'
                        : 'inactive'
                    }
                  >
                    {formData.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span>
                  Adm No: <strong>{formData.admission_no || 'Unassigned'}</strong>
                </span>
                <span>•</span>
                <span>
                  Roll No: <strong>{formData.roll_no || '—'}</strong>
                </span>
                <span>•</span>
                <span>
                  Category: <strong className="capitalize">{formData.admission_category}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isNew ? 'Save Admission' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 6 Tabs Navigation Strip */}
        <div className="flex items-center gap-1 mt-6 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-brand-600 text-brand-700 bg-brand-50/40 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content per Tab */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: PERSONAL & IDENTITY */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
                <p className="text-xs text-slate-500">
                  Student's legal identification, birth credentials, and demographic background
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Student Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_name}
                    onChange={(e) => handleChange('student_name', e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => handleChange('blood_group', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Aadhaar Card No (UIDAI)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={formData.aadhaar_no}
                    onChange={(e) => handleChange('aadhaar_no', e.target.value)}
                    placeholder="12-digit Aadhaar number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Religion</label>
                  <select
                    value={formData.religion}
                    onChange={(e) => handleChange('religion', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Hindu">Hindu</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Christian">Christian</option>
                    <option value="Sikh">Sikh</option>
                    <option value="Jain">Jain</option>
                    <option value="Buddhist">Buddhist</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Caste Category
                  </label>
                  <select
                    value={formData.caste_category}
                    onChange={(e) => handleChange('caste_category', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC (Other Backward Class)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker Section)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mother Tongue</label>
                  <input
                    type="text"
                    value={formData.mother_tongue}
                    onChange={(e) => handleChange('mother_tongue', e.target.value)}
                    placeholder="e.g. Hindi, Kannada, Tamil, Telugu"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMIC & ENROLLMENT */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Enrollment & Academic Placement
                </h3>
                <p className="text-xs text-slate-500">
                  Assign student to campus branch, academic year, class grade, and section roster
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.admission_no}
                    onChange={(e) => handleChange('admission_no', e.target.value)}
                    placeholder="e.g. ADM2024-001"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Admission Date</label>
                  <input
                    type="date"
                    value={formData.admission_date}
                    onChange={(e) => handleChange('admission_date', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Campus / Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => handleChange('branch_id', e.target.value)}
                    disabled={user?.role !== 'super_admin' && Boolean(user?.branch_id)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.academic_year_id}
                    onChange={(e) => handleChange('academic_year_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.year_name || ay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Class / Grade <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => handleChange('class_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Class</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={formData.section_id}
                    onChange={(e) => handleChange('section_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Unassigned Section</option>
                    {sectionList.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={formData.roll_no}
                    onChange={(e) => handleChange('roll_no', e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Admission Category
                  </label>
                  <select
                    value={formData.admission_category}
                    onChange={(e) => handleChange('admission_category', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="General">General</option>
                    <option value="RTE">RTE (Right to Education 25%)</option>
                    <option value="Management">Management Quota</option>
                    <option value="Sibling">Sibling Discount</option>
                    <option value="Staff Ward">Staff Ward</option>
                    <option value="Merit">Merit / Scholarship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred (TC)</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PARENTS & GUARDIAN */}
          {activeTab === 'parents' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Family & Guardian Details</h3>
                <p className="text-xs text-slate-500">
                  Primary and secondary parent contacts for communication, SMS alerts, and fee
                  billing
                </p>
              </div>

              {/* Father Details */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  Father's Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={formData.father_name}
                      onChange={(e) => handleChange('father_name', e.target.value)}
                      placeholder="Father's full name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={formData.father_phone}
                      onChange={(e) => handleChange('father_phone', e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.father_email}
                      onChange={(e) => handleChange('father_email', e.target.value)}
                      placeholder="father@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={formData.father_occupation}
                      onChange={(e) => handleChange('father_occupation', e.target.value)}
                      placeholder="e.g. Software Engineer, Business"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Mother Details */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Mother's Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Mother's Name</label>
                    <input
                      type="text"
                      value={formData.mother_name}
                      onChange={(e) => handleChange('mother_name', e.target.value)}
                      placeholder="Mother's full name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={formData.mother_phone}
                      onChange={(e) => handleChange('mother_phone', e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.mother_email}
                      onChange={(e) => handleChange('mother_email', e.target.value)}
                      placeholder="mother@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={formData.mother_occupation}
                      onChange={(e) => handleChange('mother_occupation', e.target.value)}
                      placeholder="e.g. Doctor, Homemaker"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Guardian Details */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Legal Guardian (If Applicable)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Guardian's Name</label>
                    <input
                      type="text"
                      value={formData.guardian_name}
                      onChange={(e) => handleChange('guardian_name', e.target.value)}
                      placeholder="Guardian name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={formData.guardian_phone}
                      onChange={(e) => handleChange('guardian_phone', e.target.value)}
                      placeholder="Guardian mobile"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.guardian_email}
                      onChange={(e) => handleChange('guardian_email', e.target.value)}
                      placeholder="guardian@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={formData.guardian_relation}
                      onChange={(e) => handleChange('guardian_relation', e.target.value)}
                      placeholder="e.g. Uncle, Grandparent"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADDRESS & CONTACT */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Address & Emergency Reach</h3>
                <p className="text-xs text-slate-500">
                  Residential address, postal code, and emergency contact phone lines
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Street Address / House No
                  </label>
                  <input
                    type="text"
                    value={formData.street_address}
                    onChange={(e) => handleChange('street_address', e.target.value)}
                    placeholder="e.g. Flat 304, Emerald Heights, Outer Ring Road"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="e.g. 560037"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Emergency Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    placeholder="Name of contact"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    placeholder="Emergency phone number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergency_relation}
                    onChange={(e) => handleChange('emergency_relation', e.target.value)}
                    placeholder="e.g. Father / Mother / Neighbor"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PREVIOUS SCHOOL DATA */}
          {activeTab === 'previous_school' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Previous Schooling & Transfer Records
                </h3>
                <p className="text-xs text-slate-500">
                  Prior institution history, Transfer Certificate (TC) details, board affiliation, and previous academic performance
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Previous School Name
                  </label>
                  <input
                    type="text"
                    value={formData.previous_school}
                    onChange={(e) => handleChange('previous_school', e.target.value)}
                    placeholder="e.g. St. Xavier's High School / National Public School"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Previous Board / Affiliation
                  </label>
                  <select
                    value={formData.previous_board}
                    onChange={(e) => handleChange('previous_board', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="Matriculation">Matriculation</option>
                    <option value="IB">International Baccalaureate (IB)</option>
                    <option value="Cambridge">Cambridge / IGCSE</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Grade / Class Completed
                  </label>
                  <input
                    type="text"
                    value={formData.previous_class}
                    onChange={(e) => handleChange('previous_class', e.target.value)}
                    placeholder="e.g. Class 4 / Grade 9"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transfer Certificate (TC) Number
                  </label>
                  <input
                    type="text"
                    value={formData.previous_tc_no}
                    onChange={(e) => handleChange('previous_tc_no', e.target.value)}
                    placeholder="e.g. TC-2025/0894"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    TC Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.previous_tc_date}
                    onChange={(e) => handleChange('previous_tc_date', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Previous School Location / City / State
                  </label>
                  <input
                    type="text"
                    value={formData.previous_school_address}
                    onChange={(e) => handleChange('previous_school_address', e.target.value)}
                    placeholder="e.g. Gandhi Nagar, Vellore, Tamil Nadu"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Examination Result / Percentage
                  </label>
                  <input
                    type="text"
                    value={formData.previous_result}
                    onChange={(e) => handleChange('previous_result', e.target.value)}
                    placeholder="e.g. Passed - 88.5% / Grade A"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reason for Leaving / Migration Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={formData.previous_reason_for_leaving}
                    onChange={(e) => handleChange('previous_reason_for_leaving', e.target.value)}
                    placeholder="e.g. Parent job relocation, seeking admission to higher standard, etc."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">
                  Enrollment History & Academic Dossier
                </h3>
                <p className="text-xs text-slate-500">
                  Historical progressions across school years, section allocations, and administrative notes
                </p>
              </div>

              {/* Past Enrollments Table */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-800 text-xs">
                  Academic Progression Across Years
                </h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Academic Year</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Class & Section</th>
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {enrollmentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            {isNew
                              ? 'Initial enrollment will be registered upon saving.'
                              : 'No prior academic years on file.'}
                          </td>
                        </tr>
                      ) : (
                        enrollmentHistory.map((hist, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium">
                              {hist.academic_year_name || hist.year_name || 'Current'}
                            </td>
                            <td className="py-2.5 px-3">{hist.branch_name || 'Main Campus'}</td>
                            <td className="py-2.5 px-3">
                              {hist.class_name} - {hist.section_name || 'A'}
                            </td>
                            <td className="py-2.5 px-3">{hist.roll_no || '—'}</td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  hist.enrollment_status === 'current' ? 'active' : 'default'
                                }
                              >
                                {hist.enrollment_status || 'current'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Remarks / Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confidential Administrative Notes / Remarks
                </label>
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Record special academic concessions, counseling records, or parent agreements..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const currentIndex = tabs.findIndex((t) => t.id === activeTab);
                if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1].id);
              }}
              disabled={activeTab === 'personal'}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              Previous Tab
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'history' && (
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1].id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Next Tab
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 shadow-sm shadow-brand-600/20"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isNew ? 'Submit Admission' : 'Save Profile'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
