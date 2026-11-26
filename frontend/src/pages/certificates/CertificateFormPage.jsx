import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  UserCheck,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Send,
  Save,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CertificateA4Sheet } from '../../components/certificates/CertificatePrintSheet';
import {
  CERTIFICATE_TYPE_MAP,
  BORDER_STYLES,
  COLOR_THEMES,
  SIGNATURE_LAYOUTS,
  buildPlaceholderMap,
  renderCertificateText,
  toInputDate,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

const CAN_DIRECT_ISSUE_ROLES = ['super_admin', 'admin', 'principal'];

export const CertificateFormPage = ({ mode = 'create', defaultType = 'bonafide' }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = mode === 'edit' || Boolean(id);
  const navigate = useNavigate();
  const { user, selectedBranch, selectedAcademicYear } = useAuth();

  const canDirectIssue = CAN_DIRECT_ISSUE_ROLES.includes(String(user?.role || '').toLowerCase());
  const requestedTemplateId = searchParams.get('templateId');

  const [certType, setCertType] = useState(defaultType);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Autocomplete states
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [searchingLookup, setSearchingLookup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Track if user edited body manually so token auto-sync doesn't clobber custom wording unexpectedly
  const [manualBodyEdit, setManualBodyEdit] = useState(isEdit);
  const [rawTemplateBody, setRawTemplateBody] = useState('');
  const [rawTemplateTitle, setRawTemplateTitle] = useState('');

  const [form, setForm] = useState({
    certificate_no: '',
    status: 'pending_approval',
    template_id: '',
    recipient_type: 'student',
    student_id: null,
    staff_id: null,
    branch_id: selectedBranch?.id || 1,
    branch_name: selectedBranch?.name || '',
    branch_code: selectedBranch?.code || '',
    branch_logo: selectedBranch?.logo || '',
    academic_year_id: selectedAcademicYear?.id || '',
    academic_year_name: selectedAcademicYear?.name || '',
    recipient_name: '',
    ref_no: '',
    class_or_dept: '',
    designation: '',
    father_name: '',
    mother_name: '',
    dob: '',
    gender: '',
    nationality: 'Indian',
    photo_url: '',
    category_badge: '',
    title_heading: CERTIFICATE_TYPE_MAP[defaultType]?.defaultTitle || 'CERTIFICATE',
    rendered_body: '',
    footer_note: '',
    border_style: 'classic_double',
    color_theme: 'monochrome',
    signature_layout: 'principal_seal',
    show_student_photo: true,
    show_qr_verification: true,
    purpose: '',
    period_from: '',
    period_to: '',
    conduct_grade: 'Very Good & Satisfactory',
    issue_date: toInputDate(new Date()),
    custom_fields: {
      application_date: toInputDate(new Date()),
      leaving_date: toInputDate(new Date()),
      reason_for_leaving: 'Relocation of Family / Parents Request',
      last_class_studied: '',
      last_exam_result: 'Passed',
      failed_status: 'No',
      promoted_to_class: 'Promoted to Next Class',
      working_days: '220',
      present_days: '210',
      month_dues_paid: 'Up to Current Month',
      dues_cleared: true,
      subjects_studied: 'English, Mathematics, Science, Social Studies, Second Language',
      fee_concession: 'None',
      extra_activities: 'Sports, Cultural & NSS/NCC Participation',
      remarks: '',
      custom_title: 'CERTIFICATE OF EXCELLENCE',
      custom_achievement: '',
    },
  });

  const typeMeta = CERTIFICATE_TYPE_MAP[certType] || CERTIFICATE_TYPE_MAP.bonafide;

  // Load templates for certType
  const loadTemplatesForType = async (targetType, preferredTemplateId = null, applyToForm = false) => {
    try {
      const res = await api.get(`/certificates/templates?certificate_type=${targetType}&status=active`);
      if (res.success) {
        const list = res.templates || [];
        setTemplates(list);
        if (applyToForm && list.length > 0) {
          const picked =
            (preferredTemplateId && list.find((t) => String(t.id) === String(preferredTemplateId))) ||
            list.find((t) => Number(t.is_default) === 1 && (t.recipient_scope === form.recipient_type || t.recipient_scope === 'both')) ||
            list[0];
          if (picked) {
            applyTemplateToForm(picked);
          }
        }
        return list;
      }
      return [];
    } catch (err) {
      console.error('Error loading templates:', err);
      return [];
    }
  };

  useEffect(() => {
    if (!isEdit) {
      setCertType(defaultType);
      setForm((prev) => ({
        ...prev,
        recipient_type: 'student',
        branch_id: selectedBranch?.id || prev.branch_id,
        branch_name: selectedBranch?.name || prev.branch_name,
        branch_logo: selectedBranch?.logo || prev.branch_logo,
        academic_year_id: selectedAcademicYear?.id || prev.academic_year_id,
        academic_year_name: selectedAcademicYear?.name || prev.academic_year_name,
      }));
      loadTemplatesForType(defaultType, requestedTemplateId, true);
    }
  }, [defaultType, isEdit]);

  // Edit mode loader
  useEffect(() => {
    if (!isEdit) return;
    const loadExisting = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/certificates/${id}`);
        if (res.success && res.certificate) {
          const c = res.certificate;
          setCertType(c.certificate_type);
          const loadedTemplates = await loadTemplatesForType(c.certificate_type, c.template_id, false);
          const matchedTpl = loadedTemplates.find((t) => String(t.id) === String(c.template_id));
          if (matchedTpl) {
            setRawTemplateBody(matchedTpl.body_template || '');
            setRawTemplateTitle(matchedTpl.title_heading || '');
            const expectedVars = buildPlaceholderMap(
              {
                ...c,
                dob: toInputDate(c.dob),
                issue_date: toInputDate(c.issue_date),
              },
              selectedBranch,
              c.academic_year_name || selectedAcademicYear?.name
            );
            const expectedBody = renderCertificateText(matchedTpl.body_template || '', expectedVars);
            setManualBodyEdit(String(c.rendered_body || '').trim() !== String(expectedBody || '').trim());
          } else {
            setManualBodyEdit(true);
          }
          setForm((prev) => ({
            ...prev,
            certificate_no: c.certificate_no,
            status: c.status,
            template_id: c.template_id ? String(c.template_id) : '',
            recipient_type: c.recipient_type || 'student',
            student_id: c.student_id || null,
            staff_id: c.staff_id || null,
            branch_id: c.branch_id || prev.branch_id,
            branch_name: c.branch_name || prev.branch_name,
            branch_code: c.branch_code || prev.branch_code,
            branch_logo: c.branch_logo || prev.branch_logo,
            academic_year_id: c.academic_year_id || '',
            academic_year_name: c.academic_year_name || prev.academic_year_name,
            recipient_name: c.recipient_name || '',
            ref_no: c.ref_no || '',
            class_or_dept: c.class_or_dept || '',
            father_name: c.father_name || '',
            mother_name: c.mother_name || '',
            dob: toInputDate(c.dob),
            gender: c.gender || '',
            nationality: c.nationality || 'Indian',
            photo_url: c.photo_url || '',
            category_badge: c.template_badge || CERTIFICATE_TYPE_MAP[c.certificate_type]?.defaultBadge || '',
            title_heading: c.title_heading || '',
            rendered_body: c.rendered_body || '',
            footer_note: c.footer_note || '',
            border_style: c.border_style || 'classic_double',
            color_theme: c.color_theme || 'monochrome',
            signature_layout: c.signature_layout || 'principal_seal',
            show_student_photo: Boolean(Number(c.show_student_photo)),
            show_qr_verification: Boolean(Number(c.show_qr_verification)),
            purpose: c.purpose || '',
            period_from: c.period_from || '',
            period_to: c.period_to || '',
            conduct_grade: c.conduct_grade || '',
            issue_date: toInputDate(c.issue_date),
            custom_fields: {
              ...prev.custom_fields,
              ...(c.custom_fields || {}),
              application_date: toInputDate(c.custom_fields?.application_date),
              leaving_date: toInputDate(c.custom_fields?.leaving_date),
            },
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load certificate record');
      } finally {
        setLoading(false);
      }
    };
    loadExisting();
  }, [id, isEdit]);

  const applyTemplateToForm = (tpl, overrides = null) => {
    if (!tpl) return;
    setRawTemplateBody(tpl.body_template || '');
    setRawTemplateTitle(tpl.title_heading || '');
    setManualBodyEdit(false);

    setForm((prev) => {
      const merged = overrides ? { ...prev, ...overrides } : prev;
      const vars = buildPlaceholderMap(merged, selectedBranch, merged.academic_year_name);
      return {
        ...merged,
        template_id: String(tpl.id),
        category_badge: tpl.category_badge || '',
        title_heading: renderCertificateText(tpl.title_heading || '', vars),
        rendered_body: renderCertificateText(tpl.body_template || '', vars),
        footer_note: tpl.footer_note || '',
        border_style: tpl.border_style || 'classic_double',
        color_theme: tpl.color_theme || 'monochrome',
        signature_layout: tpl.signature_layout || 'principal_seal',
        show_student_photo: Boolean(Number(tpl.show_student_photo)),
        show_qr_verification: Boolean(Number(tpl.show_qr_verification)),
      };
    });
  };

  // Re-render raw template whenever recipient/fields change (unless manually customized)
  useEffect(() => {
    if (!rawTemplateBody || manualBodyEdit) return;
    const vars = buildPlaceholderMap(form, selectedBranch, form.academic_year_name);
    setForm((prev) => ({
      ...prev,
      title_heading: renderCertificateText(rawTemplateTitle || prev.title_heading, vars),
      rendered_body: renderCertificateText(rawTemplateBody, vars),
    }));
  }, [
    form.recipient_name,
    form.ref_no,
    form.class_or_dept,
    form.designation,
    form.father_name,
    form.mother_name,
    form.dob,
    form.purpose,
    form.period_from,
    form.period_to,
    form.conduct_grade,
    form.issue_date,
    form.branch_name,
    form.academic_year_name,
    form.custom_fields,
  ]);

  // Search student or staff autocomplete
  const handleLookupSearch = async (qVal) => {
    setLookupQuery(qVal);
    setShowDropdown(true);
    try {
      setSearchingLookup(true);
      const endpoint =
        form.recipient_type === 'staff'
          ? `/certificates/search-staff?q=${encodeURIComponent(qVal)}`
          : `/certificates/search-students?q=${encodeURIComponent(qVal)}`;
      const res = await api.get(endpoint);
      if (res.success) {
        setLookupResults(form.recipient_type === 'staff' ? res.staff || [] : res.students || []);
      }
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setSearchingLookup(false);
    }
  };

  const handleSelectStudent = (stu) => {
    setShowDropdown(false);
    setLookupQuery(`${stu.student_name} (${stu.admission_no})`);
    setForm((prev) => ({
      ...prev,
      recipient_type: 'student',
      student_id: stu.id,
      staff_id: null,
      recipient_name: stu.student_name || '',
      ref_no: stu.admission_no || '',
      class_or_dept: stu.class_section || stu.class_name || '',
      father_name: stu.father_name || '',
      mother_name: stu.mother_name || '',
      dob: toInputDate(stu.dob),
      gender: stu.gender || '',
      nationality: stu.nationality || 'Indian',
      photo_url: stu.avatar_url || '',
      branch_id: stu.branch_id || prev.branch_id,
      branch_name: stu.branch_name || prev.branch_name,
      branch_code: stu.branch_code || prev.branch_code,
      branch_logo: stu.branch_logo || prev.branch_logo,
      academic_year_id: stu.academic_year_id || prev.academic_year_id,
      academic_year_name: stu.academic_year_name || prev.academic_year_name,
      custom_fields: {
        ...prev.custom_fields,
        last_class_studied: stu.class_section || stu.class_name || prev.custom_fields.last_class_studied,
      },
    }));
  };

  const handleSelectStaff = (stf) => {
    setShowDropdown(false);
    setLookupQuery(`${stf.full_name} (${stf.emp_no})`);
    const matchingStaffTpl = templates.find((t) => t.recipient_scope === 'staff');

    const nextOverrides = {
      recipient_type: 'staff',
      staff_id: stf.id,
      student_id: null,
      recipient_name: stf.full_name || '',
      ref_no: stf.emp_no || '',
      class_or_dept: [stf.department, stf.designation].filter(Boolean).join(' • '),
      designation: stf.designation || '',
      father_name: '',
      mother_name: '',
      dob: toInputDate(stf.dob),
      gender: stf.gender || '',
      nationality: 'Indian',
      photo_url: stf.avatar_url || '',
      branch_id: stf.branch_id || form.branch_id,
      branch_name: stf.branch_name || form.branch_name,
      branch_code: stf.branch_code || form.branch_code,
      branch_logo: stf.branch_logo || form.branch_logo,
    };

    if (matchingStaffTpl && !isEdit) {
      applyTemplateToForm(matchingStaffTpl, nextOverrides);
    } else {
      setForm((prev) => ({ ...prev, ...nextOverrides }));
    }
  };

  const handleRecipientTypeSwitch = (nextType) => {
    setLookupQuery('');
    setLookupResults([]);
    const matchingTpl = templates.find((t) => t.recipient_scope === nextType || t.recipient_scope === 'both');
    const resetFields = {
      recipient_type: nextType,
      student_id: null,
      staff_id: null,
      recipient_name: '',
      ref_no: '',
      class_or_dept: '',
      designation: '',
      father_name: '',
      mother_name: '',
      dob: '',
      photo_url: '',
    };
    if (matchingTpl && !isEdit) {
      applyTemplateToForm(matchingTpl, resetFields);
    } else {
      setForm((prev) => ({ ...prev, ...resetFields }));
    }
  };

  const handleReapplyTemplate = () => {
    const picked = templates.find((t) => String(t.id) === String(form.template_id)) || templates[0];
    if (picked) applyTemplateToForm(picked);
  };

  const updateCustomField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [key]: value },
    }));
  };

  const submitForm = async (actionMode = 'submit') => {
    setError('');
    if (!form.recipient_name.trim() || !form.title_heading.trim() || !form.rendered_body.trim()) {
      setError('Please select or enter a recipient, certificate title heading, and body text.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        certificate_type: certType,
        show_student_photo: form.show_student_photo ? 1 : 0,
        show_qr_verification: form.show_qr_verification ? 1 : 0,
        action_mode: actionMode,
        resubmit: actionMode === 'resubmit',
      };

      let saved;
      if (isEdit) {
        saved = await api.put(`/certificates/${id}`, payload);
        if (saved.success) {
          navigate(`/certificates/view/${id}/print`);
        }
      } else {
        saved = await api.post('/certificates', payload);
        if (saved.success && saved.certificate) {
          if (saved.certificate.status === 'issued') {
            navigate(`/certificates/view/${saved.certificate.id}/print`);
          } else {
            navigate(`/certificates/approvals/${saved.certificate.id}`);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save certificate');
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = templates.find((t) => String(t.id) === String(form.template_id));

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Loading certificate workbench...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(typeMeta.routePath || '/certificates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEdit ? `Edit ${typeMeta.label} (${form.certificate_no})` : `Issue New ${typeMeta.label}`}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Search recipient to auto-fill profile fields, choose a template, customize particulars, and inspect live A4 preview.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(typeMeta.routePath || '/certificates')}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          {isEdit ? (
            <>
              {form.status === 'rejected' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitForm('resubmit')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                >
                  <Send className="w-4 h-4" />
                  Save &amp; Resubmit
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => submitForm('save')}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Updating...' : 'Save Changes & Preview'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => submitForm('submit')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
              {canDirectIssue && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => submitForm('issue')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? 'Issuing...' : 'Approve & Issue Immediately'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Form Column */}
        <div className="xl:col-span-6 space-y-5">
          {/* 1. Recipient Lookup Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">1. Recipient Selection &amp; Auto-Fill</h2>
              {typeMeta.supportsStaff && !isEdit && (
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleRecipientTypeSwitch('student')}
                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      form.recipient_type === 'student' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecipientTypeSwitch('staff')}
                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      form.recipient_type === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Staff
                  </button>
                </div>
              )}
            </div>

            {/* Autocomplete Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookupQuery}
                onFocus={() => handleLookupSearch(lookupQuery)}
                onChange={(e) => handleLookupSearch(e.target.value)}
                placeholder={
                  form.recipient_type === 'staff'
                    ? 'Search staff by name, employee ID, or department...'
                    : 'Search student by name, admission no, class, or parent name...'
                }
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {showDropdown && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {searchingLookup ? (
                    <div className="p-3 text-xs text-slate-500">Searching directory...</div>
                  ) : lookupResults.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">No matching records found. You can also enter fields manually below.</div>
                  ) : form.recipient_type === 'staff' ? (
                    lookupResults.map((stf) => (
                      <button
                        key={stf.id}
                        type="button"
                        onClick={() => handleSelectStaff(stf)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/60 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{stf.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {stf.emp_no} • {stf.department || 'General'} ({stf.designation || 'Staff'})
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Select
                        </span>
                      </button>
                    ))
                  ) : (
                    lookupResults.map((stu) => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => handleSelectStudent(stu)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/60 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{stu.student_name}</div>
                          <div className="text-xs text-slate-500">
                            {stu.admission_no} • {stu.class_section || 'Unassigned Class'} • Father: {stu.father_name || '—'}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            stu.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {stu.status}
                        </span>
                      </button>
                    ))
                  )}
                  <div className="p-2 text-right bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Close Suggestions
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Auto-filled Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {form.recipient_type === 'staff' ? 'Staff Full Name *' : 'Student Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {form.recipient_type === 'staff' ? 'Employee ID' : 'Admission No'}
                </label>
                <input
                  type="text"
                  value={form.ref_no}
                  onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {form.recipient_type === 'staff' ? 'Department & Designation' : 'Class & Section'}
                </label>
                <input
                  type="text"
                  value={form.class_or_dept}
                  onChange={(e) => setForm({ ...form, class_or_dept: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>

              {form.recipient_type === 'student' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Father&apos;s Name</label>
                    <input
                      type="text"
                      value={form.father_name}
                      onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mother&apos;s Name</label>
                    <input
                      type="text"
                      value={form.mother_name}
                      onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 2. Template & Specific Certificate Particulars */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">2. Template &amp; Certificate Particulars</h2>
              {templates.length > 0 && (
                <button
                  type="button"
                  onClick={handleReapplyTemplate}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-sync Tokens
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Active Template</label>
                <select
                  value={form.template_id}
                  onChange={(e) => {
                    const tpl = templates.find((t) => String(t.id) === e.target.value);
                    if (tpl) applyTemplateToForm(tpl);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                >
                  <option value="">Custom / Manual Formatting</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason for Request</label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Passport Verification, Education Loan, Scholarship, Higher Studies"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
              />
            </div>

            {(certType === 'study' || certType === 'conduct' || certType === 'character') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period From</label>
                  <input
                    type="text"
                    value={form.period_from}
                    onChange={(e) => setForm({ ...form, period_from: e.target.value })}
                    placeholder="e.g. April 2024"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period To</label>
                  <input
                    type="text"
                    value={form.period_to}
                    onChange={(e) => setForm({ ...form, period_to: e.target.value })}
                    placeholder="e.g. March 2026"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            )}

            {(certType === 'conduct' || certType === 'character' || certType === 'tc') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">General Conduct &amp; Character Grade</label>
                <select
                  value={form.conduct_grade}
                  onChange={(e) => setForm({ ...form, conduct_grade: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
                >
                  <option value="Exemplary & Excellent">Exemplary &amp; Excellent</option>
                  <option value="Very Good & Satisfactory">Very Good &amp; Satisfactory</option>
                  <option value="Good">Good</option>
                  <option value="Satisfactory">Satisfactory</option>
                </select>
              </div>
            )}

            {/* Tailored CBSE Transfer Certificate Fields */}
            {certType === 'tc' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  CBSE Transfer Certificate (TC) Particulars
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Application Date</label>
                    <input
                      type="date"
                      value={form.custom_fields.application_date || ''}
                      onChange={(e) => updateCustomField('application_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Leaving *</label>
                    <input
                      type="date"
                      value={form.custom_fields.leaving_date || ''}
                      onChange={(e) => updateCustomField('leaving_date', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Class Studied</label>
                    <input
                      type="text"
                      value={form.custom_fields.last_class_studied || ''}
                      onChange={(e) => updateCustomField('last_class_studied', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Promoted To Class</label>
                    <input
                      type="text"
                      value={form.custom_fields.promoted_to_class || ''}
                      onChange={(e) => updateCustomField('promoted_to_class', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Exam Result</label>
                    <input
                      type="text"
                      value={form.custom_fields.last_exam_result || ''}
                      onChange={(e) => updateCustomField('last_exam_result', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Month Dues Paid</label>
                    <input
                      type="text"
                      value={form.custom_fields.month_dues_paid || ''}
                      onChange={(e) => updateCustomField('month_dues_paid', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Total Working Days</label>
                    <input
                      type="number"
                      value={form.custom_fields.working_days || ''}
                      onChange={(e) => updateCustomField('working_days', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Days Present</label>
                    <input
                      type="number"
                      value={form.custom_fields.present_days || ''}
                      onChange={(e) => updateCustomField('present_days', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjects Studied</label>
                  <input
                    type="text"
                    value={form.custom_fields.subjects_studied || ''}
                    onChange={(e) => updateCustomField('subjects_studied', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leaving</label>
                  <input
                    type="text"
                    value={form.custom_fields.reason_for_leaving || ''}
                    onChange={(e) => updateCustomField('reason_for_leaving', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Tailored Custom Certificate Fields */}
            {certType === 'custom' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Custom Recognition &amp; Citation Details
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Award / Certificate Heading</label>
                  <input
                    type="text"
                    value={form.custom_fields.custom_title || ''}
                    onChange={(e) => {
                      updateCustomField('custom_title', e.target.value);
                      if (!manualBodyEdit && !rawTemplateTitle.includes('{{')) {
                        setForm((prev) => ({ ...prev, title_heading: e.target.value }));
                      }
                    }}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Achievement / Citation Paragraph</label>
                  <textarea
                    rows={3}
                    value={form.custom_fields.custom_achievement || ''}
                    onChange={(e) => updateCustomField('custom_achievement', e.target.value)}
                    placeholder="e.g. Awarded First Place in the State Inter-School Debate & Quiz Championship 2026."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Final Content & Visual Formatting */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">3. Document Content &amp; Visual Appearance</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Title Heading *</label>
              <input
                type="text"
                required
                value={form.title_heading}
                onChange={(e) => setForm({ ...form, title_heading: e.target.value })}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Rendered Certificate Body *</label>
                {manualBodyEdit && rawTemplateBody && (
                  <span className="text-[11px] text-amber-600 font-medium">Custom-edited text</span>
                )}
              </div>
              <textarea
                rows={6}
                required
                value={form.rendered_body}
                onChange={(e) => {
                  setManualBodyEdit(true);
                  setForm({ ...form, rendered_body: e.target.value });
                }}
                className="w-full px-3 py-2 text-sm leading-relaxed rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Note</label>
              <input
                type="text"
                value={form.footer_note}
                onChange={(e) => setForm({ ...form, footer_note: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Border Style</label>
                <select
                  value={form.border_style}
                  onChange={(e) => setForm({ ...form, border_style: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                >
                  {BORDER_STYLES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color Theme</label>
                <select
                  value={form.color_theme}
                  onChange={(e) => setForm({ ...form, color_theme: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                >
                  {COLOR_THEMES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Signature Block</label>
                <select
                  value={form.signature_layout}
                  onChange={(e) => setForm({ ...form, signature_layout: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                >
                  {SIGNATURE_LAYOUTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_student_photo}
                  onChange={(e) => setForm({ ...form, show_student_photo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Show Photo Box
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_qr_verification}
                  onChange={(e) => setForm({ ...form, show_qr_verification: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Show QR Verification Code
              </label>
            </div>
          </div>
        </div>

        {/* Right Live A4 Preview */}
        <div className="xl:col-span-6 space-y-3 xl:sticky xl:top-4">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Eye className="w-4 h-4 text-indigo-400" />
              Live A4 Print Preview • {formatDisplayDate(form.issue_date)}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              {canDirectIssue ? 'Direct Issue Ready' : 'Principal Approval Required'}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 overflow-x-auto">
            <CertificateA4Sheet
              certificate={{
                ...form,
                certificate_type: certType,
                show_student_photo: form.show_student_photo ? 1 : 0,
                show_qr_verification: form.show_qr_verification ? 1 : 0,
                status: isEdit ? form.status : 'issued',
              }}
              template={selectedTemplate}
              branch={selectedBranch}
              academicYearName={form.academic_year_name || selectedAcademicYear?.name}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};
