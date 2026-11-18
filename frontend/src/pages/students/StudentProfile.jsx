import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Upload,
  Download,
  Eye,
  FileCheck,
  X,
  File,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

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

  // Photo Upload State (Stage on select, persist on submit)
  const [photoFile, setPhotoFile] = useState(null);
  const photoInputRef = useRef(null);

  // Tab 6 Documents State
  const [documents, setDocuments] = useState([]);
  const [stagedDocs, setStagedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState('Birth Certificate');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFile, setNewDocFile] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const docFileInputRef = useRef(null);

  // Enrollment History from server
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);

  // Initialize defaults for NEW student with full cascade
  useEffect(() => {
    if (!isNew) return;

    const initNewStudent = async () => {
      const defaultBranchId =
        (selectedBranch && selectedBranch.id !== 'all' ? String(selectedBranch.id) : '') ||
        (branches.length > 0 ? String(branches[0].id) : '2');

      const defaultYearId =
        (selectedAcademicYear ? String(selectedAcademicYear.id) : '') ||
        (academicYears.length > 0 ? String(academicYears[0].id) : '2');

      let defaultClassId = '';
      let defaultSectionId = '';

      if (defaultBranchId) {
        try {
          const cRes = await api.get(`/academics/classes?branch_id=${defaultBranchId}`);
          const cList = cRes.classes || cRes.data || [];
          setClassList(cList);

          if (cList.length > 0) {
            defaultClassId = String(cList[0].id);
            const sRes = await api.get(
              `/academics/sections?branch_id=${defaultBranchId}&class_id=${defaultClassId}`
            );
            const sList = sRes.sections || sRes.data || [];
            setSectionList(sList);
            if (sList.length > 0) {
              defaultSectionId = String(sList[0].id);
            }
          }
        } catch (err) {
          console.error('Error preloading new student defaults:', err);
        }
      }

      setFormData((prev) => ({
        ...prev,
        branch_id: prev.branch_id || defaultBranchId,
        academic_year_id: prev.academic_year_id || defaultYearId,
        class_id: prev.class_id || defaultClassId,
        section_id: prev.section_id || defaultSectionId,
      }));
    };

    initNewStudent();
  }, [isNew, selectedBranch, branches, selectedAcademicYear, academicYears]);

  // Load Classes for selected branch if not already loaded
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

  // Load Sections for selected class if not already loaded
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
        const currentEnrollment =
          res.current_enrollment || (res.enrollments && res.enrollments[0]) || {};

        if (data) {
          const bId = String(data.branch_id || currentEnrollment.branch_id || '');
          const yId = String(data.academic_year_id || currentEnrollment.academic_year_id || '');
          const cId = String(data.class_id || currentEnrollment.class_id || '');
          const sId = String(data.section_id || currentEnrollment.section_id || '');

          // Immediately fetch classes for this branch so options populate
          if (bId) {
            try {
              const cRes = await api.get(`/academics/classes?branch_id=${bId}`);
              const cList = cRes.classes || cRes.data || [];
              setClassList(cList);

              if (cId) {
                const sRes = await api.get(`/academics/sections?branch_id=${bId}&class_id=${cId}`);
                const sList = sRes.sections || sRes.data || [];
                setSectionList(sList);
              }
            } catch (err) {
              console.error('Error preloading classes/sections for existing student:', err);
            }
          }

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
            branch_id: bId,
            branch_name: data.branch_name || currentEnrollment.branch_name || '',
            academic_year_id: yId,
            academic_year_name: data.academic_year_name || currentEnrollment.academic_year_name || '',
            class_id: cId,
            class_name: data.class_name || currentEnrollment.class_name || '',
            section_id: sId,
            section_name: data.section_name || currentEnrollment.section_name || '',
            roll_no: data.roll_no || currentEnrollment.roll_no || '',
            admission_category:
              data.admission_category || currentEnrollment.admission_category || 'General',
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

          if (res.enrollments || data.enrollments || data.enrollment_history) {
            setEnrollmentHistory(
              res.enrollments || data.enrollments || data.enrollment_history || []
            );
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

  // Branch change with reactive cascade
  const handleBranchChange = async (newBranchId) => {
    handleChange('branch_id', newBranchId);
    handleChange('class_id', '');
    handleChange('section_id', '');
    setClassList([]);
    setSectionList([]);
    if (!newBranchId) return;

    try {
      const cRes = await api.get(`/academics/classes?branch_id=${newBranchId}`);
      const cList = cRes.classes || cRes.data || [];
      setClassList(cList);

      if (cList.length > 0) {
        const firstCId = String(cList[0].id);
        const sRes = await api.get(
          `/academics/sections?branch_id=${newBranchId}&class_id=${firstCId}`
        );
        const sList = sRes.sections || sRes.data || [];
        setSectionList(sList);
        setFormData((prev) => ({
          ...prev,
          branch_id: newBranchId,
          class_id: firstCId,
          section_id: sList.length > 0 ? String(sList[0].id) : '',
        }));
      }
    } catch (err) {
      console.error('Error on branch change:', err);
    }
  };

  // Class change with reactive cascade
  const handleClassChange = async (newClassId) => {
    handleChange('class_id', newClassId);
    handleChange('section_id', '');
    setSectionList([]);
    if (!newClassId || !formData.branch_id) return;

    try {
      const sRes = await api.get(
        `/academics/sections?branch_id=${formData.branch_id}&class_id=${newClassId}`
      );
      const sList = sRes.sections || sRes.data || [];
      setSectionList(sList);
      if (sList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          class_id: newClassId,
          section_id: String(sList[0].id),
        }));
      }
    } catch (err) {
      console.error('Error on class change:', err);
    }
  };

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

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, WEBP)' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Photo size exceeds maximum limit of 5MB' });
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    // Instant live preview in top header avatar AND Personal Tab card
    setFormData((prev) => ({ ...prev, avatar_url: localPreviewUrl }));

    // If editing existing student, immediately upload and persist to DB
    if (!isNew && id) {
      try {
        const photoData = new FormData();
        photoData.append('photo', file);
        const uploadRes = await api.upload(`/students/${id}/photo`, photoData);
        if (uploadRes.avatar_url) {
          setFormData((prev) => ({ ...prev, avatar_url: uploadRes.avatar_url }));
          setPhotoFile(null);
          setMessage({
            type: 'success',
            text: 'Student photo uploaded and saved successfully! Top profile view updated.',
          });
        }
      } catch (err) {
        console.error('Failed to upload photo immediately:', err);
        setMessage({ type: 'error', text: 'Failed to upload photo: ' + err.message });
      }
    } else {
      setMessage({
        type: 'success',
        text: 'Photo selected! Live preview updated on top. Save admission to persist.',
      });
    }

    if (e.target) e.target.value = '';
  };

  const fetchDocuments = useCallback(async () => {
    if (isNew || !id) return;
    setLoadingDocs(true);
    try {
      const res = await api.get(`/students/${id}/documents`);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadDocument = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDocFile) {
      setMessage({ type: 'error', text: 'Please choose a document file to upload' });
      return;
    }

    // For new students, stage the document for upload upon saving admission
    if (isNew) {
      const newStaged = {
        id: 'staged-' + Date.now(),
        file: newDocFile,
        document_type: newDocType,
        title: newDocTitle.trim() || newDocFile.name,
        file_name: newDocFile.name,
        file_size: newDocFile.size,
        file_type: newDocFile.type,
        file_url: URL.createObjectURL(newDocFile),
        created_at: new Date().toISOString(),
        isStaged: true,
      };
      setStagedDocs((prev) => [newStaged, ...prev]);
      setNewDocFile(null);
      setNewDocTitle('');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      setMessage({
        type: 'success',
        text: `${newDocType} attached to admission record! It will be uploaded on save.`,
      });
      return;
    }

    // For existing student, upload to server immediately
    setUploadingDoc(true);
    try {
      const docFormData = new FormData();
      docFormData.append('file', newDocFile);
      docFormData.append('document_type', newDocType);
      docFormData.append('title', newDocTitle.trim() || newDocFile.name);

      await api.upload(`/students/${id}/documents`, docFormData);
      setMessage({ type: 'success', text: `${newDocType} uploaded successfully!` });
      setNewDocFile(null);
      setNewDocTitle('');
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      console.error('Failed to upload document:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to upload document' });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId, isStaged = false) => {
    if (isStaged) {
      setStagedDocs((prev) => prev.filter((d) => d.id !== docId));
      setMessage({ type: 'success', text: 'Attached document removed' });
      return;
    }
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/students/${id}/documents/${docId}`);
      setMessage({ type: 'success', text: 'Document deleted successfully' });
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete document' });
    }
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
      let finalAvatarUrl = formData.avatar_url;
      if (photoFile && isNew) {
        const photoData = new FormData();
        photoData.append('photo', photoFile);
        const uploadRes = await api.upload('/students/upload-photo', photoData);
        if (uploadRes.avatar_url) {
          finalAvatarUrl = uploadRes.avatar_url;
        }
      }

      const payload = { ...formData, avatar_url: finalAvatarUrl };

      if (isNew) {
        const res = await api.post('/students', payload);
        const newId = res.student?.id || res.id;

        // Auto-upload any staged documents for the newly created student
        if (newId && stagedDocs.length > 0) {
          for (const sDoc of stagedDocs) {
            try {
              const docFormData = new FormData();
              docFormData.append('file', sDoc.file);
              docFormData.append('document_type', sDoc.document_type);
              docFormData.append('title', sDoc.title);
              await api.upload(`/students/${newId}/documents`, docFormData);
            } catch (err) {
              console.error('Error uploading staged doc:', err);
            }
          }
        }

        setMessage({ type: 'success', text: 'Student admitted and enrolled successfully!' });
        setTimeout(() => {
          if (newId) {
            navigate(`/students/${newId}/edit`);
          } else {
            navigate('/students');
          }
        }, 1200);
      } else {
        await api.put(`/students/${id}`, payload);
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
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-xs hover:text-brand-600 hover:border-brand-300 transition-colors"
                title="Upload Photo (Click to Browse)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={photoInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handlePhotoSelect}
              />
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

              {/* Student Profile Photo Upload Card */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 text-brand-700 flex items-center justify-center font-bold text-3xl shadow-sm overflow-hidden shrink-0 cursor-pointer relative group hover:border-brand-500 transition-colors"
                  title="Click to Upload Photo"
                >
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt="Student Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-300 group-hover:text-brand-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm">Student Profile Photo</h4>
                    {photoFile && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-md">
                        Unsaved Preview
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload a clear passport-size photograph. Formats: JPG, PNG, WEBP (Max 5MB). Photo updates the header profile instantly.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-brand-500 hover:text-brand-600 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-brand-600" />
                      <span>{formData.avatar_url ? 'Change Photo' : 'Upload Student Photo'}</span>
                    </button>
                    {formData.avatar_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          handleChange('avatar_url', '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
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
                    value={formData.branch_id ? String(formData.branch_id) : ''}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    disabled={user?.role !== 'super_admin' && Boolean(user?.branch_id)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Branch</option>
                    {branches
                      .filter((b) => b.id !== 'all')
                      .map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.name}
                        </option>
                      ))}
                    {formData.branch_id && !branches.some((b) => String(b.id) === String(formData.branch_id)) && (
                      <option value={String(formData.branch_id)}>
                        {formData.branch_name || `Branch #${formData.branch_id}`}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.academic_year_id ? String(formData.academic_year_id) : ''}
                    onChange={(e) => handleChange('academic_year_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={String(ay.id)}>
                        {ay.year_name || ay.name}
                      </option>
                    ))}
                    {formData.academic_year_id && !academicYears.some((ay) => String(ay.id) === String(formData.academic_year_id)) && (
                      <option value={String(formData.academic_year_id)}>
                        {formData.academic_year_name || `Academic Year #${formData.academic_year_id}`}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Class / Grade <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id ? String(formData.class_id) : ''}
                    onChange={(e) => handleClassChange(e.target.value)}
                    disabled={!formData.branch_id}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Class</option>
                    {classList.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                    {formData.class_id && !classList.some((c) => String(c.id) === String(formData.class_id)) && (
                      <option value={String(formData.class_id)}>
                        {formData.class_name || `Class #${formData.class_id}`}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    value={formData.section_id ? String(formData.section_id) : ''}
                    onChange={(e) => handleChange('section_id', e.target.value)}
                    disabled={!formData.class_id}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Unassigned Section</option>
                    {sectionList.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        Section {s.name}
                      </option>
                    ))}
                    {formData.section_id && !sectionList.some((s) => String(s.id) === String(formData.section_id)) && (
                      <option value={String(formData.section_id)}>
                        Section {formData.section_name || formData.section_id}
                      </option>
                    )}
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
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Official Student Documents & Academic Progression
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload and manage official student certificates (Birth Certificate, Transfer Certificate, Aadhaar Card, Marksheets) and track historical academic progression
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg border border-brand-200">
                    {documents.length} Document{documents.length === 1 ? '' : 's'} on Record
                  </span>
                </div>
              </div>

              {/* Document Uploader Box (Available for both New and Existing Students) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand-600" />
                    {isNew ? 'Attach Official Document to Admission' : 'Upload Official Student Document'}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    PDF, JPG, PNG, WEBP (Max 10MB) • {isNew ? 'Attaches immediately to admission record' : 'Saved immediately to dossier'}
                  </span>
                </div>

                {/* Quick Select Preset Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Quick Select:</span>
                  {[
                    'Birth Certificate',
                    'Transfer Certificate',
                    'Aadhaar Card',
                    'Previous Marksheet',
                    'Medical Certificate',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setNewDocType(preset);
                        docFileInputRef.current?.click();
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-brand-500 rounded-lg text-[11px] font-medium text-slate-700 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-brand-600" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end pt-1">
                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Document Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="Birth Certificate">Birth Certificate</option>
                      <option value="Transfer Certificate">Transfer Certificate (TC)</option>
                      <option value="Aadhaar Card">Aadhaar Card / ID Proof</option>
                      <option value="Previous Marksheet">Previous School Marksheet</option>
                      <option value="Medical Certificate">Medical Fitness / Vaccine Card</option>
                      <option value="Caste Certificate">Caste / Category Certificate</option>
                      <option value="Income Certificate">Income / EWS Certificate</option>
                      <option value="Conduct Certificate">Conduct / Character Certificate</option>
                      <option value="Other">Other Supporting Document</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Custom Title / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. TC-2025/0894 or Original Birth Cert"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-4 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select File <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="file"
                        ref={docFileInputRef}
                        accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                        onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white file:border file:border-slate-200 file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={uploadingDoc || !newDocFile}
                      onClick={handleUploadDocument}
                      className="px-4 py-2 mt-auto rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      {uploadingDoc ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isNew ? 'Attach' : 'Upload'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Student Dossier Documents ({documents.length + stagedDocs.length})
                  </h4>
                  {loadingDocs && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing...
                    </span>
                  )}
                </div>

                <div className="border border-border rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Document Title</th>
                        <th className="py-2.5 px-3">File Name</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Status / Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documents.length === 0 && stagedDocs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No documents attached yet. Use the upload box or Quick Select buttons above to add Birth Certificate, TC, Aadhaar, etc.
                          </td>
                        </tr>
                      ) : (
                        [...stagedDocs, ...documents].map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {doc.document_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {doc.title || doc.file_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] truncate max-w-[180px]">
                              {doc.file_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {doc.isStaged ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  Staged (Will Save on Submit)
                                </span>
                              ) : doc.created_at ? (
                                new Date(doc.created_at).toLocaleDateString()
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                                  title="Preview Document"
                                >
                                  <Eye className="w-3.5 h-3.5 text-brand-600" />
                                </button>
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.file_name}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors inline-flex items-center cursor-pointer"
                                  title="Download Document"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-600" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc.id, doc.isStaged)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Past Enrollments Table */}
              <div className="space-y-2 pt-2">
                <h4 className="font-semibold text-slate-800 text-xs">
                  Academic Progression Across Years
                </h4>
                <div className="border border-border rounded-xl overflow-hidden bg-white">
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
              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Confidential Administrative Notes / Remarks
                </label>
                <textarea
                  rows={3}
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

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.title || previewDoc.file_name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-border text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{previewDoc.document_type}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">{previewDoc.file_name}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  {previewDoc.file_size ? `${(previewDoc.file_size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>
              <a
                href={previewDoc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-xs shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>

            <div className="min-h-[400px] max-h-[70vh] flex items-center justify-center bg-slate-900/5 rounded-2xl border border-border p-2 overflow-auto">
              {previewDoc.file_type?.startsWith('image/') ||
              previewDoc.file_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img
                  src={previewDoc.file_url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-md"
                />
              ) : previewDoc.file_type === 'application/pdf' ||
                previewDoc.file_url?.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.file_url}
                  title={previewDoc.title}
                  className="w-full h-[65vh] rounded-xl border-0 bg-white shadow-md"
                />
              ) : (
                <div className="text-center py-12">
                  <File className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Preview not supported</p>
                  <p className="text-xs text-slate-500 mt-1">
                    This file format cannot be displayed inline. You can download and open it on your device.
                  </p>
                  <a
                    href={previewDoc.file_url}
                    download
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-brand-700"
                  >
                    <Download className="w-4 h-4" /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
