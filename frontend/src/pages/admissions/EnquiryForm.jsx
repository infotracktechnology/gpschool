import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  GraduationCap,
  Share2,
} from 'lucide-react';
import { api } from '../../api/client';

export const EnquiryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [leadSources, setLeadSources] = useState([]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    branch_id: '',
    academic_year_id: '',
    class_id: '',
    lead_source_id: '',
    student_name: '',
    gender: 'male',
    dob: '',
    parent_name: '',
    primary_phone: '',
    email: '',
    remarks: '',
  });

  // Load lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, yearRes, classRes, sourceRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/settings/academic-years'),
          api.get('/academics/classes'),
          api.get('/admissions/settings/lead-sources'),
        ]);

        const bList = branchRes.branches || branchRes.data || [];
        const yList = yearRes.academicYears || yearRes.data || [];
        const cList = classRes.classes || classRes.data || [];
        const sList = sourceRes.leadSources || sourceRes.sources || sourceRes.data || [];

        setBranches(bList);
        setAcademicYears(yList);
        setClasses(cList);
        setLeadSources(sList);

        if (!isEdit) {
          const activeYear = yList.find((y) => y.status === 'active') || yList[0];
          setFormData((prev) => ({
            ...prev,
            branch_id: bList.length > 0 ? String(bList[0].id) : '',
            academic_year_id: activeYear ? String(activeYear.id) : '',
            class_id: cList.length > 0 ? String(cList[0].id) : '',
            lead_source_id: sList.length > 0 ? String(sList[0].id) : '',
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

  // Load existing data if editing
  useEffect(() => {
    if (!isEdit) return;
    const fetchEnquiry = async () => {
      setLoadingData(true);
      try {
        const res = await api.get(`/admissions/enquiries/${id}`);
        const enq = res.enquiry || res.data || {};
        setFormData({
          branch_id: enq.branch_id ? String(enq.branch_id) : '',
          academic_year_id: enq.academic_year_id ? String(enq.academic_year_id) : '',
          class_id: enq.class_id ? String(enq.class_id) : '',
          lead_source_id: enq.lead_source_id ? String(enq.lead_source_id) : '',
          student_name: enq.student_name || '',
          gender: enq.gender || 'male',
          dob: enq.dob ? String(enq.dob).slice(0, 10) : '',
          parent_name: enq.parent_name || '',
          primary_phone: enq.primary_phone || '',
          email: enq.email || '',
          remarks: enq.remarks || '',
        });
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load existing enquiry data.' });
      } finally {
        setLoadingData(false);
      }
    };
    fetchEnquiry();
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
        lead_source_id: formData.lead_source_id ? Number(formData.lead_source_id) : null,
      };

      if (isEdit) {
        await api.put(`/admissions/enquiries/${id}`, payload);
      } else {
        await api.post('/admissions/enquiries', payload);
      }
      navigate('/admissions/enquiries');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save enquiry.' });
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/admissions/enquiries"
            className="p-2 rounded-xl border border-border hover:bg-slate-100 text-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-heading">
              {isEdit ? 'Edit Enquiry Record' : 'New Student Admission Enquiry'}
            </h1>
            <p className="text-sm text-muted">
              Register lead information, contact parameters, and student interest.
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

      {loadingData ? (
        <div className="p-12 text-center text-muted">Loading form details...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Academic & Campus Scope */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Campus & Academic Target
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
                  <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <select
                    required
                    value={formData.academic_year_id}
                    onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                    className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Class <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
                  <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <select
                    required
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lead Source
                </label>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
                  <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <select
                    value={formData.lead_source_id}
                    onChange={(e) => setFormData({ ...formData, lead_source_id: e.target.value })}
                    className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
                  >
                    <option value="">Select Channel</option>
                    {leadSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Student Personal Info */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Student Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parent & Contact Details */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Parent / Guardian & Contact
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent / Guardian Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.primary_phone}
                  onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="parent@example.com"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discussion Remarks / Notes
              </label>
              <textarea
                rows="3"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Parent questions, transportation requirements, sibling reference..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to="/admissions/enquiries"
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving Enquiry...' : isEdit ? 'Update Enquiry' : 'Register Enquiry'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
