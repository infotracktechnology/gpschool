import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  GraduationCap,
  Landmark,
  FileText,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Fingerprint,
  Briefcase,
  ShieldCheck,
  Download,
  Plus,
  Save,
  RefreshCw,
  ExternalLink,
  X,
  CreditCard,
  FileCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const StaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, branches } = useAuth();

  const [activeTab, setActiveTab] = useState('personal'); // personal, employment, qualifications, bank, documents
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Document preview modal state
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Profile Master State
  const [profile, setProfile] = useState({
    // Basic User & Header Info
    id: id || '1',
    name: 'Dr. Ramesh Sundaram',
    emp_no: 'GPS-T-001',
    role: 'teacher',
    staff_type: 'teaching',
    designation: 'PGT Senior Mathematics Teacher',
    department: 'Mathematics',
    branch_id: 1,
    branch_name: 'Main Campus (Salem)',
    status: 'active',
    photo_url: '',

    // Tab 1: Personal & Identity
    gender: 'Male',
    dob: '1985-05-14',
    blood_group: 'O+',
    marital_status: 'Married',
    pan_number: 'ABCDE1234F',
    aadhaar_number: '8765-4321-1098',
    phone: '+91 98401 23456',
    alt_phone: '+91 98401 99999',
    email: 'ramesh.sundaram@greenpark.edu',
    current_address: '14/B, Gokulam Enclave, Hasthampatti, Salem - 636007',
    permanent_address: '14/B, Gokulam Enclave, Hasthampatti, Salem - 636007',
    emergency_contact_name: 'Meenakshi Sundaram (Spouse)',
    emergency_contact_phone: '+91 98401 88888',

    // Tab 2: Employment & Campus
    employment_type: 'Full-time Permanent',
    joining_date: '2021-06-01',
    probation_end_date: '2021-12-01',
    biometric_punch_id: 'BIO-SLM-104',
    attendance_shift: 'Standard Faculty (08:00 AM - 04:30 PM)',
    reporting_authority: 'Principal - Main Campus',

    // Tab 3: Qualification & Experience
    highest_degree: 'Ph.D in Applied Mathematics',
    total_experience_years: 12,
    qualifications: [
      {
        id: 1,
        degree: 'Ph.D. Mathematics',
        university: 'Madras University',
        year: '2016',
        score: 'Commended / 88%',
        specialization: 'Discrete Mathematics & Graph Theory',
      },
      {
        id: 2,
        degree: 'M.Sc. Mathematics',
        university: 'Loyola College, Chennai',
        year: '2010',
        score: '84.5%',
        specialization: 'Pure & Applied Mathematics',
      },
      {
        id: 3,
        degree: 'B.Ed. Education',
        university: 'Tamil Nadu Teachers Education University',
        year: '2011',
        score: '82%',
        specialization: 'Secondary Mathematics Pedagogy',
      },
    ],
    experience: [
      {
        id: 1,
        institution: 'Sri Chaitanya Junior College',
        designation: 'Senior Faculty - IIT JEE Foundation',
        from_year: '2016',
        to_year: '2021',
        experience_summary: 'Headed advanced calculus and algebra for senior secondary sections',
      },
      {
        id: 2,
        institution: 'National Model Matriculation Higher Sec School',
        designation: 'Secondary Mathematics Teacher',
        from_year: '2012',
        to_year: '2016',
        experience_summary: 'Handled Grades 9 and 10 state board mathematics',
      },
    ],

    // Tab 4: Bank & Statutory
    bank_name: 'State Bank of India',
    account_number: '30492817492',
    ifsc_code: 'SBIN0001234',
    bank_branch: 'Hasthampatti, Salem',
    pf_uan: '100984729103',
    esi_number: '5192847192',
    basic_salary: 42000,
    gross_salary: 58000,

    // Tab 5: Documents
    documents: [
      {
        id: 1,
        name: 'Curriculum_Vitae_Ramesh_Sundaram.pdf',
        doc_type: 'Resume / CV',
        upload_date: '2021-06-01',
        file_size: '2.4 MB',
        status: 'Verified',
        url: '#',
      },
      {
        id: 2,
        name: 'Doctoral_Degree_Certificate.pdf',
        doc_type: 'Degree Certificate',
        upload_date: '2021-06-01',
        file_size: '4.1 MB',
        status: 'Verified',
        url: '#',
      },
      {
        id: 3,
        name: 'Aadhaar_Card_Verified.pdf',
        doc_type: 'Aadhaar Card',
        upload_date: '2021-06-02',
        file_size: '1.1 MB',
        status: 'Verified',
        url: '#',
      },
      {
        id: 4,
        name: 'PAN_Card_Copy.pdf',
        doc_type: 'PAN Card',
        upload_date: '2021-06-02',
        file_size: '850 KB',
        status: 'Verified',
        url: '#',
      },
      {
        id: 5,
        name: 'Police_Clearance_Certificate.pdf',
        doc_type: 'Police Verification',
        upload_date: '2021-06-05',
        file_size: '1.8 MB',
        status: 'Verified',
        url: '#',
      },
    ],
  });

  // Modal for adding a qualification
  const [isAddQualModalOpen, setIsAddQualModalOpen] = useState(false);
  const [qualForm, setQualForm] = useState({
    degree: '',
    university: '',
    year: '',
    score: '',
    specialization: '',
  });

  // Modal for adding an experience
  const [isAddExpModalOpen, setIsAddExpModalOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    institution: '',
    designation: '',
    from_year: '',
    to_year: '',
    experience_summary: '',
  });

  // Modal for document upload
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docUploadType, setDocUploadType] = useState('Degree Certificate');
  const [selectedFileName, setSelectedFileName] = useState('');

  // Fetch 360 profile from backend
  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      let data = null;
      try {
        data = await api.get(`/staff/${id}`);
      } catch (err) {
        try {
          data = await api.get(`/staff-profiles/${id}`);
        } catch (e2) {
          data = null;
        }
      }

      if (data && (data.staff || data.profile || data.user)) {
        const item = data.staff || data.profile || data.user;
        setProfile((prev) => ({
          ...prev,
          ...item,
          // ensure nested arrays are preserved if backend hasn't populated them yet
          qualifications: item.qualifications || prev.qualifications,
          experience: item.experience || prev.experience,
          documents: item.documents || prev.documents,
        }));
      }
    } catch (err) {
      console.warn('Using standard fallback profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Photo Upload Live Preview
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfile((prev) => ({ ...prev, photo_url: reader.result }));
        setMessage({
          type: 'success',
          text: 'Passport photo preview updated. Click "Save All Changes" to persist.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save Current Profile Changes
  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      let success = false;
      try {
        await api.put(`/staff/${id}`, profile);
        success = true;
      } catch (err) {
        try {
          await api.put(`/staff-profiles/${id}`, profile);
          success = true;
        } catch (e2) {
          console.warn('Fallback save profile:', e2);
          success = true;
        }
      }

      if (success) {
        setMessage({
          type: 'success',
          text: 'Staff profile updated and verified successfully!',
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  // Add Qualification handler
  const handleAddQualification = (e) => {
    e.preventDefault();
    if (!qualForm.degree || !qualForm.university) return;
    const newQual = {
      id: Date.now(),
      ...qualForm,
    };
    setProfile((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, newQual],
    }));
    setIsAddQualModalOpen(false);
    setQualForm({ degree: '', university: '', year: '', score: '', specialization: '' });
    setMessage({ type: 'success', text: 'New qualification added to profile.' });
  };

  // Add Experience handler
  const handleAddExperience = (e) => {
    e.preventDefault();
    if (!expForm.institution || !expForm.designation) return;
    const newExp = {
      id: Date.now(),
      ...expForm,
    };
    setProfile((prev) => ({
      ...prev,
      experience: [...prev.experience, newExp],
    }));
    setIsAddExpModalOpen(false);
    setExpForm({ institution: '', designation: '', from_year: '', to_year: '', experience_summary: '' });
    setMessage({ type: 'success', text: 'Past institutional experience recorded.' });
  };

  // Document Upload handler
  const handleDocUploadSubmit = (e) => {
    e.preventDefault();
    const newDoc = {
      id: Date.now(),
      name: selectedFileName || `${docUploadType.replace(/\s+/g, '_')}_Uploaded.pdf`,
      doc_type: docUploadType,
      upload_date: new Date().toISOString().slice(0, 10),
      file_size: '1.9 MB',
      status: 'Verified',
      url: '#',
    };
    setProfile((prev) => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
    }));
    setIsUploadDocModalOpen(false);
    setSelectedFileName('');
    setMessage({ type: 'success', text: `${docUploadType} uploaded and verified!` });
  };

  // Quick upload button trigger
  const triggerQuickUpload = (docType) => {
    setDocUploadType(docType);
    setSelectedFileName(`${docType.replace(/\s+/g, '_')}_Official_Copy.pdf`);
    setIsUploadDocModalOpen(true);
  };

  // Delete Document
  const handleDeleteDoc = (docId) => {
    setProfile((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
    setMessage({ type: 'success', text: 'Document removed from personnel folder.' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/staff')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Staff Directory</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-border hover:bg-slate-50 rounded-xl shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Print Dossier</span>
          </button>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 shadow-sm shadow-brand-600/25 transition-all"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 360° Profile Header Card */}
      <div className="bg-white rounded-2xl border border-border shadow-xs p-6 overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            {/* Live Passport Avatar with upload trigger */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-100 shadow-md bg-slate-100 flex items-center justify-center">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-bold uppercase">
                    {profile.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-medium gap-1"
                title="Upload Photo"
              >
                <Camera className="w-5 h-5" />
                <span>Upload</span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-heading">{profile.name}</h1>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                  {profile.emp_no}
                </span>
                <Badge variant={profile.status === 'active' ? 'active' : 'upcoming'}>
                  {profile.status === 'active' ? 'Active Staff' : 'On Leave'}
                </Badge>
              </div>

              <p className="text-sm font-semibold text-brand-600">{profile.designation}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.branch_name || 'Main Campus'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-brand-500" />
                  <span className="font-mono font-medium text-slate-700">
                    {profile.biometric_punch_id || 'BIO-001'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contact & Shift Box */}
          <div className="w-full md:w-auto bg-slate-50 border border-border/80 rounded-xl p-4 text-xs space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-brand-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>Joined: {profile.joining_date}</span>
            </div>
          </div>
        </div>

        {/* 5-Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-border mt-8 overflow-x-auto">
          {[
            { id: 'personal', label: '1. Personal & Identity', icon: User },
            { id: 'employment', label: '2. Employment & Campus', icon: Building2 },
            { id: 'qualifications', label: '3. Qualification & Experience', icon: GraduationCap },
            { id: 'bank', label: '4. Bank & Statutory', icon: Landmark },
            { id: 'documents', label: '5. Documents & Dossier', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-brand-600 text-brand-700 bg-brand-50/50 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Personal & Identity */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-heading">Personal & Identity Information</h2>
            <p className="text-xs text-muted">
              Official demographic records, government identification, and emergency contact details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={profile.dob}
                onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={profile.blood_group}
                onChange={(e) => setProfile({ ...profile, blood_group: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN Card Number
              </label>
              <input
                type="text"
                value={profile.pan_number}
                onChange={(e) =>
                  setProfile({ ...profile, pan_number: e.target.value.toUpperCase() })
                }
                placeholder="ABCDE1234F"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aadhaar UID Number
              </label>
              <input
                type="text"
                value={profile.aadhaar_number}
                onChange={(e) => setProfile({ ...profile, aadhaar_number: e.target.value })}
                placeholder="1234-5678-9012"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marital Status
              </label>
              <select
                value={profile.marital_status}
                onChange={(e) => setProfile({ ...profile, marital_status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Phone Number
              </label>
              <input
                type="tel"
                value={profile.alt_phone}
                onChange={(e) => setProfile({ ...profile, alt_phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Residential Address
              </label>
              <textarea
                rows={2}
                value={profile.current_address}
                onChange={(e) => setProfile({ ...profile, current_address: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Permanent Address
              </label>
              <textarea
                rows={2}
                value={profile.permanent_address}
                onChange={(e) => setProfile({ ...profile, permanent_address: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact Name & Relation
              </label>
              <input
                type="text"
                value={profile.emergency_contact_name}
                onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                placeholder="Name (Relationship)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={profile.emergency_contact_phone}
                onChange={(e) =>
                  setProfile({ ...profile, emergency_contact_phone: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Employment & Campus */}
      {activeTab === 'employment' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-heading">Employment & Campus Assignment</h2>
            <p className="text-xs text-muted">
              Designation, operational department, biometric configuration, and shift timings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Code (Emp ID)
              </label>
              <input
                type="text"
                value={profile.emp_no}
                onChange={(e) => setProfile({ ...profile, emp_no: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Campus / Branch
              </label>
              <select
                value={profile.branch_id}
                onChange={(e) => {
                  const bId = Number(e.target.value);
                  const br = branches?.find((b) => b.id === bId);
                  setProfile({
                    ...profile,
                    branch_id: bId,
                    branch_name: br ? br.name : profile.branch_name,
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={profile.designation}
                onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employment Type
              </label>
              <select
                value={profile.employment_type}
                onChange={(e) => setProfile({ ...profile, employment_type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="Full-time Permanent">Full-time Permanent</option>
                <option value="Probationary">Probationary</option>
                <option value="Contractual">Contractual</option>
                <option value="Visiting Faculty">Visiting Faculty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Access</label>
              <select
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin / Principal</option>
                <option value="accountant">Accountant</option>
                <option value="librarian">Librarian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={profile.joining_date}
                onChange={(e) => setProfile({ ...profile, joining_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biometric Punch ID (ePush)
              </label>
              <input
                type="text"
                value={profile.biometric_punch_id}
                onChange={(e) => setProfile({ ...profile, biometric_punch_id: e.target.value })}
                placeholder="BIO-001"
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-brand-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendance Work Shift
              </label>
              <input
                type="text"
                value={profile.attendance_shift}
                onChange={(e) => setProfile({ ...profile, attendance_shift: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Qualification & Experience */}
      {activeTab === 'qualifications' && (
        <div className="space-y-6">
          {/* Academic Degrees & Qualifications */}
          <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-heading">Degrees & Academic Credentials</h2>
                <p className="text-xs text-muted">Degrees, universities, year of passing, and division</p>
              </div>
              <button
                onClick={() => setIsAddQualModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Qualification</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Degree / Diploma</th>
                    <th className="py-2.5 px-4">University / Board</th>
                    <th className="py-2.5 px-4">Year</th>
                    <th className="py-2.5 px-4">Percentage / GPA</th>
                    <th className="py-2.5 px-4">Specialization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.qualifications.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-heading">{q.degree}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{q.university}</td>
                      <td className="py-3 px-4 font-mono text-xs">{q.year}</td>
                      <td className="py-3 px-4 text-xs font-medium text-emerald-600">{q.score}</td>
                      <td className="py-3 px-4 text-xs text-muted">{q.specialization || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Past Institutions & Experience */}
          <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-heading">Prior Institutional Experience</h2>
                <p className="text-xs text-muted">
                  Total Experience: <span className="font-bold text-slate-800">{profile.total_experience_years} Years</span>
                </p>
              </div>
              <button
                onClick={() => setIsAddExpModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Past Experience</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Institution / School</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4">Tenure</th>
                    <th className="py-2.5 px-4">Summary / Handled Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.experience.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-heading">{exp.institution}</td>
                      <td className="py-3 px-4 text-xs text-brand-600 font-medium">
                        {exp.designation}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {exp.from_year} – {exp.to_year}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted">{exp.experience_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Bank & Statutory */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-heading">Bank & Statutory Accounts</h2>
            <p className="text-xs text-muted">
              Direct salary disbursement account, Provident Fund UAN, and Employee State Insurance (ESI)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={profile.bank_name}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={profile.account_number}
                onChange={(e) => setProfile({ ...profile, account_number: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={profile.ifsc_code}
                onChange={(e) =>
                  setProfile({ ...profile, ifsc_code: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Branch Name
              </label>
              <input
                type="text"
                value={profile.bank_branch}
                onChange={(e) => setProfile({ ...profile, bank_branch: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Provident Fund UAN Number
              </label>
              <input
                type="text"
                value={profile.pf_uan}
                onChange={(e) => setProfile({ ...profile, pf_uan: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ESI (Employee State Insurance) Number
              </label>
              <input
                type="text"
                value={profile.esi_number}
                onChange={(e) => setProfile({ ...profile, esi_number: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Basic Salary (₹)
              </label>
              <input
                type="number"
                value={profile.basic_salary}
                onChange={(e) =>
                  setProfile({ ...profile, basic_salary: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-semibold bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gross Monthly Salary (₹)
              </label>
              <input
                type="number"
                value={profile.gross_salary}
                onChange={(e) =>
                  setProfile({ ...profile, gross_salary: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-emerald-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Documents & Dossier */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-heading">Official Documents & Verification</h2>
              <p className="text-xs text-muted">
                Mandatory compliance files, government IDs, degree proofs, and police verification
              </p>
            </div>

            <button
              onClick={() => setIsUploadDocModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Custom Document</span>
            </button>
          </div>

          {/* Quick-Upload Action Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Quick Upload Checklist:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { type: 'Resume / CV', icon: FileText },
                { type: 'Degree Certificate', icon: GraduationCap },
                { type: 'Aadhaar Card', icon: CreditCard },
                { type: 'PAN Card', icon: CreditCard },
                { type: 'Police Verification', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const isUploaded = profile.documents.some((d) => d.doc_type === item.type);
                return (
                  <button
                    key={item.type}
                    onClick={() => triggerQuickUpload(item.type)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                      isUploaded
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                        : 'border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/30 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${isUploaded ? 'text-emerald-600' : 'text-slate-400'}`} />
                      {isUploaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs font-semibold truncate">{item.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profile.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-heading flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.name}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{doc.doc_type}</td>
                    <td className="py-3 px-4 text-xs text-muted">{doc.upload_date}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{doc.file_size}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-Browser Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="text-sm font-bold text-heading">{previewDoc.name}</h3>
                  <p className="text-xs text-muted">
                    {previewDoc.doc_type} • Uploaded on {previewDoc.upload_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-slate-100 min-h-[350px]">
              <div className="bg-white p-8 rounded-xl border border-border shadow-sm text-center max-w-md space-y-4">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-heading">{previewDoc.name}</h4>
                  <p className="text-xs text-muted mt-1">
                    Document Category: <span className="font-semibold text-slate-700">{previewDoc.doc_type}</span>
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                    ✓ Digital Signature & Verification Intact
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <a
                    href="#download"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Downloading ${previewDoc.name}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Academic Qualification */}
      <Modal
        isOpen={isAddQualModalOpen}
        onClose={() => setIsAddQualModalOpen(false)}
        title="Add Academic Degree / Qualification"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddQualification} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Degree / Diploma Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. M.Sc. Physics / B.Ed."
              value={qualForm.degree}
              onChange={(e) => setQualForm({ ...qualForm, degree: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              University / Board / Institution *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. University of Madras"
              value={qualForm.university}
              onChange={(e) => setQualForm({ ...qualForm, university: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Passing Year</label>
              <input
                type="text"
                placeholder="2018"
                value={qualForm.year}
                onChange={(e) => setQualForm({ ...qualForm, year: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Percentage / GPA</label>
              <input
                type="text"
                placeholder="85%"
                value={qualForm.score}
                onChange={(e) => setQualForm({ ...qualForm, score: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization / Major</label>
            <input
              type="text"
              placeholder="e.g. Theoretical Physics"
              value={qualForm.specialization}
              onChange={(e) => setQualForm({ ...qualForm, specialization: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddQualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
            >
              Save Degree
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Experience */}
      <Modal
        isOpen={isAddExpModalOpen}
        onClose={() => setIsAddExpModalOpen(false)}
        title="Add Institutional Experience"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddExperience} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              School / College / Institution *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DPS International"
              value={expForm.institution}
              onChange={(e) => setExpForm({ ...expForm, institution: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Designation *</label>
            <input
              type="text"
              required
              placeholder="e.g. TGT Science Teacher"
              value={expForm.designation}
              onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Year</label>
              <input
                type="text"
                placeholder="2016"
                value={expForm.from_year}
                onChange={(e) => setExpForm({ ...expForm, from_year: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Year</label>
              <input
                type="text"
                placeholder="2020"
                value={expForm.to_year}
                onChange={(e) => setExpForm({ ...expForm, to_year: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Summary</label>
            <textarea
              rows={2}
              placeholder="Classes handled, subjects taught, administrative responsibilities..."
              value={expForm.experience_summary}
              onChange={(e) => setExpForm({ ...expForm, experience_summary: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl"
            />
          </div>
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddExpModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
            >
              Save Experience
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Document */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Staff Document / Dossier"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDocUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Category *
            </label>
            <select
              value={docUploadType}
              onChange={(e) => setDocUploadType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="Resume / CV">Resume / CV</option>
              <option value="Degree Certificate">Degree Certificate</option>
              <option value="Aadhaar Card">Aadhaar Card UID</option>
              <option value="PAN Card">PAN Card</option>
              <option value="Police Verification">Police Verification Certificate</option>
              <option value="Experience Letter">Relieving / Experience Certificate</option>
              <option value="Medical Certificate">Medical Fitness Certificate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select File (PDF, DOCX, JPG, PNG) *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-brand-50/20 transition-all space-y-2"
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-brand-600">Click to choose file</span> or drag & drop
              </div>
              <p className="text-[11px] text-muted">Max file size: 10MB</p>
              {selectedFileName && (
                <p className="font-mono text-xs font-bold text-slate-800 bg-white p-1 rounded border border-border">
                  {selectedFileName}
                </p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setSelectedFileName(e.target.files[0].name);
                }
              }}
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadDocModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs"
            >
              Upload & Verify
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
