import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  LayoutTemplate,
  Sparkles,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CertificateA4Sheet } from '../../components/certificates/CertificatePrintSheet';
import {
  CERTIFICATE_TYPES,
  BORDER_STYLES,
  COLOR_THEMES,
  SIGNATURE_LAYOUTS,
  TEMPLATE_PLACEHOLDERS,
  buildPlaceholderMap,
  renderCertificateText,
} from '../../utils/certificateRenderer';

const SAMPLE_PREVIEW_RECIPIENT = {
  recipient_name: 'Aarav Sharma',
  ref_no: 'GPS-2026-1042',
  class_or_dept: 'Class X - Section A',
  father_name: 'Rajesh Sharma',
  mother_name: 'Meenakshi Sharma',
  dob: '2011-05-14',
  gender: 'Male',
  nationality: 'Indian',
  purpose: 'Passport Verification & Scholarship Application',
  period_from: 'April 2024',
  period_to: 'March 2026',
  conduct_grade: 'Exemplary & Very Good',
  issue_date: new Date().toISOString().slice(0, 10),
  custom_fields: {
    leaving_date: new Date().toISOString().slice(0, 10),
    reason_for_leaving: 'Relocation of Family',
    promoted_to_class: 'Class XI (Science)',
    last_class_studied: 'Class X - Section A',
    last_exam_result: 'Passed CBSE AISSE with Distinction',
    working_days: '220',
    present_days: '214',
    month_dues_paid: 'March 2026',
    subjects_studied: 'English, Mathematics, Science, Social Science, Computer Applications',
    custom_title: 'CERTIFICATE OF ACADEMIC EXCELLENCE',
    custom_achievement: 'Secured First Rank in the Annual Inter-House Science Olympiad 2026.',
  },
};

export const CertificateTemplateForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const bodyTextareaRef = useRef(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    code: '',
    name: '',
    certificate_type: 'bonafide',
    recipient_scope: 'student',
    category_badge: 'OFFICE OF THE PRINCIPAL • BONAFIDE RECORD',
    title_heading: 'BONAFIDE CERTIFICATE',
    body_template:
      'This is to certify that Master/Miss {{student_name}}, son/daughter of Mr. {{father_name}} and Mrs. {{mother_name}}, bearing Admission No. {{admission_no}}, is a bonafide student of {{class_section}} at {{branch_name}} during Academic Year {{academic_year}}.\n\nThis certificate is issued for the purpose of: {{purpose}}.',
    footer_note: 'Verified from General Admission & Academic Register.',
    border_style: 'classic_double',
    color_theme: 'monochrome',
    signature_layout: 'principal_seal',
    show_student_photo: true,
    show_qr_verification: true,
    is_default: false,
    status: 'active',
  });

  useEffect(() => {
    if (!isEdit) return;
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/certificates/templates/${id}`);
        if (res.success && res.template) {
          const t = res.template;
          setForm({
            code: t.code || '',
            name: t.name || '',
            certificate_type: t.certificate_type || 'bonafide',
            recipient_scope: t.recipient_scope || 'student',
            category_badge: t.category_badge || '',
            title_heading: t.title_heading || '',
            body_template: t.body_template || '',
            footer_note: t.footer_note || '',
            border_style: t.border_style || 'classic_double',
            color_theme: t.color_theme || 'monochrome',
            signature_layout: t.signature_layout || 'principal_seal',
            show_student_photo: Boolean(Number(t.show_student_photo)),
            show_qr_verification: Boolean(Number(t.show_qr_verification)),
            is_default: Boolean(Number(t.is_default)),
            status: t.status || 'active',
          });
        }
      } catch (err) {
        setError(err.message || 'Unable to load template details');
      } finally {
        setLoading(false);
      }
    };
    loadTemplate();
  }, [id, isEdit]);

  const insertPlaceholder = (token) => {
    const el = bodyTextareaRef.current;
    if (!el) {
      setForm((prev) => ({ ...prev, body_template: `${prev.body_template} ${token}` }));
      return;
    }
    const start = el.selectionStart ?? form.body_template.length;
    const end = el.selectionEnd ?? start;
    const nextText =
      form.body_template.slice(0, start) + token + form.body_template.slice(end);
    setForm((prev) => ({ ...prev, body_template: nextText }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.name.trim() || !form.title_heading.trim() || !form.body_template.trim()) {
      setError('Template code, template name, certificate title heading, and body template are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        show_student_photo: form.show_student_photo ? 1 : 0,
        show_qr_verification: form.show_qr_verification ? 1 : 0,
        is_default: form.is_default ? 1 : 0,
      };
      if (isEdit) {
        await api.put(`/certificates/templates/${id}`, payload);
      } else {
        await api.post('/certificates/templates', payload);
      }
      navigate('/certificates/templates');
    } catch (err) {
      setError(err.message || 'Failed to save certificate template');
    } finally {
      setSaving(false);
    }
  };

  const sampleVars = buildPlaceholderMap(
    {
      ...SAMPLE_PREVIEW_RECIPIENT,
      recipient_type: form.recipient_scope === 'staff' ? 'staff' : 'student',
      emp_no: 'EMP-0241',
      department: 'Senior Secondary Science',
    },
    selectedBranch,
    selectedAcademicYear?.name || '2026-27'
  );

  const previewCert = {
    ...SAMPLE_PREVIEW_RECIPIENT,
    certificate_no: `${form.code || 'TPL-01'}/PREVIEW`,
    certificate_type: form.certificate_type,
    recipient_type: form.recipient_scope === 'staff' ? 'staff' : 'student',
    category_badge: form.category_badge,
    title_heading: renderCertificateText(form.title_heading, sampleVars),
    rendered_body: renderCertificateText(form.body_template, sampleVars),
    footer_note: form.footer_note,
    border_style: form.border_style,
    color_theme: form.color_theme,
    signature_layout: form.signature_layout,
    show_student_photo: form.show_student_photo ? 1 : 0,
    show_qr_verification: form.show_qr_verification ? 1 : 0,
    status: 'issued',
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center text-sm text-slate-500">
        Loading template designer...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/certificates/templates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              {isEdit ? `Edit Template: ${form.name || form.code}` : 'Design New Certificate Template'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Click placeholder tags to insert dynamic student, staff, or academic tokens with live A4 preview.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/certificates/templates')}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Template' : 'Save Template'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Designer Controls */}
        <form onSubmit={handleSubmit} className="xl:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Template Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. BON-STD-02"
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Template Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Student Passport Bonafide"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Category *</label>
              <select
                value={form.certificate_type}
                onChange={(e) => setForm({ ...form, certificate_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {CERTIFICATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Scope</label>
              <select
                value={form.recipient_scope}
                onChange={(e) => setForm({ ...form, recipient_scope: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="student">Student Only</option>
                <option value="staff">Staff Only</option>
                <option value="both">Both Student &amp; Staff</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Header Eyebrow Badge</label>
              <input
                type="text"
                value={form.category_badge}
                onChange={(e) => setForm({ ...form, category_badge: e.target.value })}
                placeholder="e.g. OFFICE OF THE PRINCIPAL"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Heading *</label>
              <input
                type="text"
                required
                value={form.title_heading}
                onChange={(e) => setForm({ ...form, title_heading: e.target.value })}
                placeholder="e.g. BONAFIDE CERTIFICATE"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Clickable Dynamic Placeholders */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Click Any Placeholder Token to Insert into Body
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {TEMPLATE_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.token}
                  type="button"
                  onClick={() => insertPlaceholder(ph.token)}
                  title={`Insert ${ph.label}`}
                  className="px-2 py-1 text-[11px] font-mono rounded-lg bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition"
                >
                  {ph.token}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Body Template *</label>
            <textarea
              ref={bodyTextareaRef}
              rows={7}
              required
              value={form.body_template}
              onChange={(e) => setForm({ ...form, body_template: e.target.value })}
              className="w-full px-3 py-2.5 text-sm leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Attestation Note</label>
            <input
              type="text"
              value={form.footer_note}
              onChange={(e) => setForm({ ...form, footer_note: e.target.value })}
              placeholder="e.g. Verified from General Admission Register."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Visual Styling Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Border Style</label>
              <select
                value={form.border_style}
                onChange={(e) => setForm({ ...form, border_style: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
              >
                {COLOR_THEMES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Signature Layout</label>
              <select
                value={form.signature_layout}
                onChange={(e) => setForm({ ...form, signature_layout: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200"
              >
                {SIGNATURE_LAYOUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="flex flex-wrap items-center gap-5 pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_student_photo}
                onChange={(e) => setForm({ ...form, show_student_photo: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              Show Recipient Photo Box
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_qr_verification}
                onChange={(e) => setForm({ ...form, show_qr_verification: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              Include QR Verification Badge
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              Set as Default Template
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="ml-auto px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200"
            >
              <option value="active">Status: Active</option>
              <option value="inactive">Status: Inactive</option>
            </select>
          </div>
        </form>

        {/* Right Live Preview */}
        <div className="xl:col-span-6 space-y-3">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Eye className="w-4 h-4 text-indigo-400" />
              Live A4 Template Preview (Sample Student Data)
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Updates Real-Time
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 overflow-x-auto">
            <CertificateA4Sheet
              certificate={previewCert}
              template={form}
              branch={selectedBranch}
              academicYearName={selectedAcademicYear?.name || '2026-27'}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};
