import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Sliders,
} from 'lucide-react';
import { api } from '../../api/client';

const COMMON_SUBJECT_PRESETS = [
  {
    label: 'English (Lang)',
    name: 'English',
    code: 'ENG',
    category: 'Languages',
    requirement: 'compulsory',
    is_language: true,
    language_name: 'English',
    language_level: '1st_language',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Tamil (Lang)',
    name: 'Tamil',
    code: 'TAM',
    category: 'Languages',
    requirement: 'compulsory',
    is_language: true,
    language_name: 'Tamil',
    language_level: '2nd_language',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Hindi (Lang)',
    name: 'Hindi',
    code: 'HIN',
    category: 'Languages',
    requirement: 'compulsory',
    is_language: true,
    language_name: 'Hindi',
    language_level: '2nd_language',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Mathematics',
    name: 'Mathematics',
    code: 'MATH',
    category: 'Core Academic',
    requirement: 'compulsory',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'General Science',
    name: 'General Science',
    code: 'SCI',
    category: 'Core Academic',
    requirement: 'compulsory',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Social Science',
    name: 'Social Science',
    code: 'SOC',
    category: 'Core Academic',
    requirement: 'compulsory',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Moral Science / Value Ed.',
    name: 'Moral Science',
    code: 'VE',
    category: 'Value Education',
    requirement: 'compulsory',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 50,
    pass_marks: 18,
    credits: 1,
  },
  {
    label: 'Computer Science',
    name: 'Computer Science',
    code: 'CS',
    category: 'Skill / Vocational',
    requirement: 'elective',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
  },
  {
    label: 'Physical Education',
    name: 'Physical Education',
    code: 'PET',
    category: 'Co-Curricular',
    requirement: 'compulsory',
    is_language: false,
    language_name: '',
    language_level: '',
    max_marks: 100,
    pass_marks: 35,
    credits: 2,
  },
];

const CATEGORIES = [
  'Core Academic',
  'Languages',
  'Co-Curricular',
  'Skill / Vocational',
  'Value Education',
  'Competitive / Entrance',
];

const LANGUAGE_LEVELS = [
  { value: '1st_language', label: '1st Language (Primary)' },
  { value: '2nd_language', label: '2nd Language' },
  { value: '3rd_language', label: '3rd Language' },
  { value: 'optional', label: 'Optional Language' },
];

const parseFlag = (val) => {
  if (val === undefined || val === null) return true;
  if (val === false || val === 0 || val === '0') return false;
  return Boolean(val);
};

const parseBool = (val) => {
  if (!val || val === 0 || val === '0' || val === false) return false;
  return true;
};

export const SubjectForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  // Dropdown Lookups
  const [boards, setBoards] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingSubject, setLoadingSubject] = useState(isEdit);

  // Form State
  const [formData, setFormData] = useState({
    board_id: '',
    class_id: '',
    stream_id: '',
    name: '',
    code: '',
    category: 'Core Academic',
    requirement: 'compulsory',
    status: 'active',
    // Language Configuration
    is_language: false,
    language_name: '',
    language_level: '1st_language',
    // Evaluation settings
    max_marks: 100,
    pass_marks: 35,
    credits: 4,
    // 8 Participation Flags (all default true)
    flag_exam: true,
    flag_gradebook: true,
    flag_report_card: true,
    flag_attendance: true,
    flag_homework: true,
    flag_assignment: true,
    flag_timetable: true,
    flag_promotion: true,
  });

  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Load lookups
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [boardsRes, classesRes, streamsRes] = await Promise.all([
          api.get('/settings/boards').catch(() => ({ boards: [] })),
          api.get('/academics/classes').catch(() => ({ classes: [] })),
          api.get('/academics/streams').catch(() => ({ streams: [] })),
        ]);

        const boardList = boardsRes.boards || boardsRes.data || [];
        const classList = classesRes.classes || classesRes.data || [];
        const streamList = streamsRes.streams || streamsRes.data || [];

        setBoards(boardList);
        setClasses(classList);
        setStreams(streamList);

        if (!isEdit) {
          if (boardList.length > 0) {
            setFormData((prev) => ({ ...prev, board_id: prev.board_id || String(boardList[0].id) }));
          }
          if (classList.length > 0) {
            setFormData((prev) => ({ ...prev, class_id: prev.class_id || String(classList[0].id) }));
          }
        }
      } catch (err) {
        console.error('Failed to load metadata lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchMetadata();
  }, [isEdit]);

  // Load existing subject if in edit mode
  useEffect(() => {
    if (!isEdit) {
      setLoadingSubject(false);
      return;
    }

    let isMounted = true;

    const fetchSubject = async () => {
      setLoadingSubject(true);
      try {
        const res = await api.get(`/academics/subjects/${id}`);
        const s = res.subject || res.data || res;
        if (s && isMounted) {
          setFormData({
            board_id: s.board_id != null ? String(s.board_id) : '',
            class_id: s.class_id != null ? String(s.class_id) : '',
            stream_id: s.stream_id != null ? String(s.stream_id) : '',
            name: s.name || '',
            code: s.code || '',
            category: s.category || 'Core Academic',
            requirement: s.requirement || 'compulsory',
            status: s.status || 'active',
            is_language: parseBool(s.is_language),
            language_name: s.language_name || '',
            language_level: s.language_level || '1st_language',
            max_marks: s.max_marks ?? 100,
            pass_marks: s.pass_marks ?? 35,
            credits: s.credits ?? 4,
            flag_exam: parseFlag(s.flag_exam),
            flag_gradebook: parseFlag(s.flag_gradebook),
            flag_report_card: parseFlag(s.flag_report_card),
            flag_attendance: parseFlag(s.flag_attendance),
            flag_homework: parseFlag(s.flag_homework),
            flag_assignment: parseFlag(s.flag_assignment),
            flag_timetable: parseFlag(s.flag_timetable),
            flag_promotion: parseFlag(s.flag_promotion),
          });
        }
      } catch (err) {
        console.error('Failed to fetch subject details:', err);
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load subject information' });
        }
      } finally {
        if (isMounted) {
          setLoadingSubject(false);
        }
      }
    };

    fetchSubject();

    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  // Apply Quick Preset Button
  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      code: preset.code,
      category: preset.category,
      requirement: preset.requirement,
      is_language: preset.is_language,
      language_name: preset.language_name,
      language_level: preset.language_level || prev.language_level,
      max_marks: preset.max_marks,
      pass_marks: preset.pass_marks,
      credits: preset.credits,
    }));
  };

  // Toggle all 8 flags
  const handleToggleAllFlags = (check) => {
    setFormData((prev) => ({
      ...prev,
      flag_exam: check,
      flag_gradebook: check,
      flag_report_card: check,
      flag_attendance: check,
      flag_homework: check,
      flag_assignment: check,
      flag_timetable: check,
      flag_promotion: check,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.board_id || !formData.class_id) {
      setMessage({ type: 'error', text: 'Education Board and Class are required' });
      return;
    }

    if (!formData.name?.trim() || !formData.code?.trim()) {
      setMessage({ type: 'error', text: 'Subject Name and Subject Code are required' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const numMax = parseFloat(formData.max_marks);
    const numPass = parseFloat(formData.pass_marks);
    const numCredits = parseFloat(formData.credits);

    const payload = {
      ...formData,
      board_id: parseInt(formData.board_id, 10),
      class_id: parseInt(formData.class_id, 10),
      stream_id: formData.stream_id ? parseInt(formData.stream_id, 10) : null,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      category: formData.category ? formData.category.trim() : 'Core Academic',
      requirement: formData.requirement || 'compulsory',
      status: formData.status || 'active',
      is_language: Boolean(formData.is_language),
      language_name: formData.is_language ? formData.language_name?.trim() || null : null,
      language_level: formData.is_language ? formData.language_level || '1st_language' : null,
      max_marks: isNaN(numMax) ? 100 : numMax,
      pass_marks: isNaN(numPass) ? 35 : numPass,
      credits: isNaN(numCredits) ? 4 : numCredits,
      flag_exam: Boolean(formData.flag_exam),
      flag_gradebook: Boolean(formData.flag_gradebook),
      flag_report_card: Boolean(formData.flag_report_card),
      flag_attendance: Boolean(formData.flag_attendance),
      flag_homework: Boolean(formData.flag_homework),
      flag_assignment: Boolean(formData.flag_assignment),
      flag_timetable: Boolean(formData.flag_timetable),
      flag_promotion: Boolean(formData.flag_promotion),
    };

    try {
      if (isEdit) {
        await api.put(`/academics/subjects/${id}`, payload);
      } else {
        await api.post('/academics/subjects', payload);
      }
      navigate('/academics/subjects');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save subject' });
      setSubmitting(false);
    }
  };

  if ((isEdit && loadingSubject) || loadingLookups) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/academics/subjects"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Subjects Catalog
            </Link>
            <h1 className="text-2xl font-bold text-heading">
              {isEdit ? 'Edit Subject' : 'Add New Subject'}
            </h1>
          </div>
        </div>

        <div className="bg-surface p-12 rounded-2xl border border-border shadow-sm text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">
            {isEdit ? 'Loading subject details...' : 'Loading form options...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/academics/subjects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Subjects Catalog
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">
              {isEdit ? 'Edit Subject' : 'Add New Subject'}
            </h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Configure curriculum subject, syllabus hierarchy, and evaluation flags.
          </p>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Quick 1-Click Common Subjects Auto-Fill Pill Buttons */}
      <div className="bg-gradient-to-r from-brand-50/70 via-slate-50 to-brand-50/30 p-5 rounded-2xl border border-brand-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Quick 1-Click Auto-Fill Common Subjects
          </h2>
        </div>
        <p className="text-xs text-muted mb-3">
          Click any preset below to automatically fill standard naming, codes, categories, and language settings:
        </p>

        <div className="flex flex-wrap gap-2">
          {COMMON_SUBJECT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-border hover:border-brand-300 shadow-xs transition-all active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Hierarchy */}
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-heading uppercase tracking-wide border-b border-border pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            1. Core Hierarchy
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Board */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Education Board <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.board_id}
                onChange={(e) => setFormData({ ...formData, board_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="">Select Board</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stream / Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stream / Group (Optional)
              </label>
              <select
                value={formData.stream_id}
                onChange={(e) => setFormData({ ...formData, stream_id: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="">None / Common to all</option>
                {streams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Subject Details */}
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-heading uppercase tracking-wide border-b border-border pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            2. Subject Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics, English, General Science"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MATH, ENG-01, SCI-10"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                {Array.from(
                  new Set([...CATEGORIES, ...(formData.category ? [formData.category] : [])])
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement</label>
              <select
                value={formData.requirement}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="compulsory">Compulsory</option>
                <option value="elective">Elective</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Language Configuration */}
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-bold text-heading uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              3. Language Configuration
            </h2>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_language}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_language: e.target.checked,
                    language_name: e.target.checked ? formData.language_name || formData.name : '',
                  })
                }
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-border"
              />
              <span>Is this a Language Subject?</span>
            </label>
          </div>

          {formData.is_language ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/40 p-4 rounded-xl border border-purple-100 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Language Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={formData.is_language}
                  placeholder="e.g. English, Tamil, Hindi, Sanskrit, French"
                  value={formData.language_name}
                  onChange={(e) => setFormData({ ...formData, language_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Language Level
                </label>
                <select
                  value={formData.language_level}
                  onChange={(e) => setFormData({ ...formData, language_level: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                >
                  {LANGUAGE_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted italic">
              Non-language subject. Check the box above if this is a language course (e.g. English,
              Tamil, Hindi).
            </p>
          )}
        </div>

        {/* Section 4: Collapsible Advanced Settings (Marks, Evaluation Flags) */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full px-6 py-4 bg-slate-50/80 hover:bg-slate-100/80 border-b border-border flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-brand-600" />
              <div>
                <span className="text-sm font-bold text-heading">
                  Advanced Settings: Grading & Participation Flags
                </span>
                <span className="block text-xs text-muted">
                  Credit score, passing marks, and feature participation
                </span>
              </div>
            </div>
            {advancedOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {advancedOpen && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Marks & Credits */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Marks & Credits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Max Marks (Default: 100)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={formData.max_marks}
                      onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Pass Marks (Default: 35)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.pass_marks}
                      onChange={(e) => setFormData({ ...formData, pass_marks: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Credits (Default: 4)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 8 Participation Checkboxes */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    School Module Participation Flags
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllFlags(true)}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllFlags(false)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-border">
                  {[
                    { key: 'flag_exam', label: '1. Exam' },
                    { key: 'flag_gradebook', label: '2. Gradebook' },
                    { key: 'flag_report_card', label: '3. Report Card' },
                    { key: 'flag_attendance', label: '4. Attendance' },
                    { key: 'flag_homework', label: '5. Homework' },
                    { key: 'flag_assignment', label: '6. Assignment' },
                    { key: 'flag_timetable', label: '7. Timetable' },
                    { key: 'flag_promotion', label: '8. Promotion' },
                  ].map((flag) => (
                    <label
                      key={flag.key}
                      className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData[flag.key])}
                        onChange={(e) =>
                          setFormData({ ...formData, [flag.key]: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-border"
                      />
                      <span>{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Link
            to="/academics/subjects"
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving...' : isEdit ? 'Update Subject' : 'Save Subject'}
          </button>
        </div>
      </form>
    </div>
  );
};
