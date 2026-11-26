export const CERTIFICATE_TYPES = [
  {
    value: 'bonafide',
    label: 'Bonafide Certificate',
    shortLabel: 'Bonafide',
    codePrefix: 'BON',
    description: 'Certifies active student enrolment or full-time staff employment for passports, bank accounts, scholarships, and visas.',
    supportsStaff: true,
    routePath: '/certificates/bonafide',
    defaultBadge: 'OFFICE OF THE PRINCIPAL • BONAFIDE RECORD',
    defaultTitle: 'BONAFIDE CERTIFICATE',
  },
  {
    value: 'tc',
    label: 'Transfer Certificate (TC)',
    shortLabel: 'Transfer Cert (TC)',
    codePrefix: 'TC',
    description: 'Official CBSE School Leaving & Transfer Certificate synchronized with Transfer Register & student transfer status.',
    supportsStaff: false,
    routePath: '/certificates/tc',
    defaultBadge: 'AFFILIATED TO CBSE NEW DELHI • SCHOOL LEAVING',
    defaultTitle: 'TRANSFER CERTIFICATE',
  },
  {
    value: 'study',
    label: 'Study Certificate',
    shortLabel: 'Study Cert',
    codePrefix: 'STD',
    description: 'Academic progression & study period verification across classes and academic sessions.',
    supportsStaff: false,
    routePath: '/certificates/study',
    defaultBadge: 'ACADEMIC RECORDS & REGISTRAR',
    defaultTitle: 'STUDY CERTIFICATE',
  },
  {
    value: 'conduct',
    label: 'Conduct Certificate',
    shortLabel: 'Conduct Cert',
    codePrefix: 'CND',
    description: 'Institutional discipline, behavioral standing, and general conduct attestation.',
    supportsStaff: false,
    routePath: '/certificates/conduct',
    defaultBadge: 'DISCIPLINE & STUDENT AFFAIRS',
    defaultTitle: 'CONDUCT CERTIFICATE',
  },
  {
    value: 'character',
    label: 'Character Certificate',
    shortLabel: 'Character Cert',
    codePrefix: 'CHR',
    description: 'Principal’s formal testimonial of moral character, integrity, and co-curricular participation.',
    supportsStaff: false,
    routePath: '/certificates/character',
    defaultBadge: 'OFFICIAL TESTIMONIAL OF THE PRINCIPAL',
    defaultTitle: 'CHARACTER CERTIFICATE',
  },
  {
    value: 'custom',
    label: 'Custom & Merit Certificate',
    shortLabel: 'Custom Cert',
    codePrefix: 'CUS',
    description: 'Custom awards, merit commendations, sports/event excellence, or ad-hoc institutional certificates for students & staff.',
    supportsStaff: true,
    routePath: '/certificates/custom',
    defaultBadge: 'SPECIAL RECOGNITION & MERIT AWARD',
    defaultTitle: 'CERTIFICATE OF RECOGNITION',
  },
];

export const CERTIFICATE_TYPE_MAP = Object.fromEntries(
  CERTIFICATE_TYPES.map((t) => [t.value, t])
);

export const BORDER_STYLES = [
  { value: 'classic_double', label: 'Classic Double Frame', description: 'Heavy outer border + crisp hairline inner frame' },
  { value: 'royal_seal', label: 'Royal Heritage Border', description: 'Corner ornaments & formal ceremonial framing' },
  { value: 'minimal_mono', label: 'Minimalist Modern', description: 'Clean editorial frame with subtle top & bottom rules' },
  { value: 'cbse_formal', label: 'CBSE Official Register', description: 'Formal academic gazette frame with structured data grid' },
];

export const COLOR_THEMES = [
  { value: 'monochrome', label: 'Ink Monochrome', primary: '#18181b', accent: '#3f3f46', softBg: '#f4f4f5', border: '#18181b' },
  { value: 'crimson_gold', label: 'Crimson & Antique Gold', primary: '#7f1d1d', accent: '#b45309', softBg: '#fef2f2', border: '#991b1b' },
  { value: 'navy_royal', label: 'Oxford Navy & Slate', primary: '#1e3a8a', accent: '#1d4ed8', softBg: '#eff6ff', border: '#1e40af' },
];

export const COLOR_THEME_MAP = Object.fromEntries(
  COLOR_THEMES.map((c) => [c.value, c])
);

export const SIGNATURE_LAYOUTS = [
  { value: 'principal_only', label: 'Principal Signature Only' },
  { value: 'principal_seal', label: 'Principal + Office Seal' },
  { value: 'principal_teacher', label: 'Class Mentor + Office Seal + Principal' },
];

export const STATUS_META = {
  pending_approval: {
    label: 'Pending Approval',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  issued: {
    label: 'Issued',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  revoked: {
    label: 'Revoked',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    dotClass: 'bg-zinc-500',
  },
};

export const TEMPLATE_PLACEHOLDERS = [
  { token: '{{student_name}}', label: 'Student Name', group: 'Recipient' },
  { token: '{{recipient_name}}', label: 'Recipient Name', group: 'Recipient' },
  { token: '{{admission_no}}', label: 'Admission No / Ref', group: 'Recipient' },
  { token: '{{emp_no}}', label: 'Employee ID', group: 'Recipient' },
  { token: '{{class_section}}', label: 'Class & Section', group: 'Academic' },
  { token: '{{department}}', label: 'Department', group: 'Staff' },
  { token: '{{designation}}', label: 'Designation', group: 'Staff' },
  { token: '{{father_name}}', label: "Father's Name", group: 'Family' },
  { token: '{{mother_name}}', label: "Mother's Name", group: 'Family' },
  { token: '{{dob}}', label: 'Date of Birth', group: 'Recipient' },
  { token: '{{gender}}', label: 'Gender', group: 'Recipient' },
  { token: '{{nationality}}', label: 'Nationality', group: 'Recipient' },
  { token: '{{branch_name}}', label: 'School / Branch Name', group: 'Institution' },
  { token: '{{academic_year}}', label: 'Academic Year', group: 'Academic' },
  { token: '{{issue_date}}', label: 'Issue Date', group: 'Document' },
  { token: '{{purpose}}', label: 'Purpose', group: 'Details' },
  { token: '{{period_from}}', label: 'Study Period From', group: 'Study/Conduct' },
  { token: '{{period_to}}', label: 'Study Period To', group: 'Study/Conduct' },
  { token: '{{conduct_grade}}', label: 'Conduct Grade', group: 'Conduct/TC' },
  { token: '{{leaving_date}}', label: 'Date of Leaving (TC)', group: 'Transfer (TC)' },
  { token: '{{reason_for_leaving}}', label: 'Reason for Leaving (TC)', group: 'Transfer (TC)' },
  { token: '{{promoted_to_class}}', label: 'Promoted To Class (TC)', group: 'Transfer (TC)' },
  { token: '{{custom_title}}', label: 'Custom Title', group: 'Custom' },
  { token: '{{custom_achievement}}', label: 'Achievement / Citation', group: 'Custom' },
];

const parseLocalDateSafe = (val) => {
  if (!val) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  const pureMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureMatch) {
    return new Date(Number(pureMatch[1]), Number(pureMatch[2]) - 1, Number(pureMatch[3]));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDisplayDate = (val) => {
  if (!val) return '—';
  const d = parseLocalDateSafe(val);
  if (!d) return String(val);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const toInputDate = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const d = parseLocalDateSafe(val);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const buildPlaceholderMap = (data = {}, branch = null, academicYearName = '') => {
  const cf = data.custom_fields && typeof data.custom_fields === 'object' ? data.custom_fields : {};
  const recipientName = data.recipient_name || data.student_name || data.full_name || 'Recipient Name';
  const refNo = data.ref_no || data.admission_no || data.emp_no || '—';
  const classOrDept = data.class_or_dept || data.class_section || data.department || '—';

  return {
    student_name: recipientName,
    recipient_name: recipientName,
    admission_no: refNo,
    ref_no: refNo,
    emp_no: data.emp_no || refNo,
    class_section: classOrDept,
    department: data.department || classOrDept,
    designation: data.designation || cf.designation || 'Faculty / Staff',
    father_name: data.father_name || '—',
    mother_name: data.mother_name || '—',
    dob: formatDisplayDate(data.dob),
    gender: data.gender || '—',
    nationality: data.nationality || 'Indian',
    branch_name: data.branch_name || branch?.name || 'School Campus',
    academic_year: data.academic_year_name || academicYearName || 'Current Session',
    purpose: data.purpose || 'Official / General Verification',
    period_from: data.period_from || cf.period_from || 'Joining Date',
    period_to: data.period_to || cf.period_to || 'Present',
    conduct_grade: data.conduct_grade || cf.conduct || 'Good & Satisfactory',
    issue_date: formatDisplayDate(data.issue_date || new Date()),
    leaving_date: formatDisplayDate(cf.leaving_date || data.leaving_date),
    reason_for_leaving: cf.reason_for_leaving || data.reason_for_leaving || 'Parents Transfer / Personal Request',
    promoted_to_class: cf.promoted_to_class || data.promoted_to_class || 'Promoted / Completed',
    last_class_studied: cf.last_class_studied || classOrDept,
    working_days: cf.working_days || '—',
    present_days: cf.present_days || '—',
    custom_title: cf.custom_title || data.title_heading || 'CERTIFICATE OF MERIT',
    custom_achievement:
      cf.custom_achievement ||
      'For exemplary dedication, outstanding achievement, and noteworthy contribution to the institution.',
  };
};

export const renderCertificateText = (templateText = '', varsMap = {}) => {
  if (!templateText) return '';
  return String(templateText).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = varsMap[key];
    return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—';
  });
};
