import React, { useEffect, useMemo, useState } from 'react';
import {
  COLOR_THEME_MAP,
  CERTIFICATE_TYPE_MAP,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

/**
 * Print isolation CSS: guarantees A4 Portrait output shows ONLY .certificate-print-root
 */
export const CertificatePrintStyles = () => (
  <style>{`
    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      html, body {
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body * {
        visibility: hidden !important;
      }
      .certificate-print-root,
      .certificate-print-root * {
        visibility: visible !important;
      }
      .certificate-print-root {
        position: fixed !important;
        inset: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `}</style>
);

/**
 * Deterministic crisp vector QR matrix badge from certificate serial string
 */
const QrVerificationBadge = ({ serialNo, color = '#18181b', compact = false }) => {
  const cells = useMemo(() => {
    const seedStr = String(serialNo || 'CERT-DRAFT-PREVIEW');
    let hash = 2166136261;
    for (let i = 0; i < seedStr.length; i += 1) {
      hash ^= seedStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const grid = [];
    const size = 11;
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        // Finder patterns in top-left, top-right, bottom-left corners
        const inTL = r < 3 && c < 3;
        const inTR = r < 3 && c >= size - 3;
        const inBL = r >= size - 3 && c < 3;
        if (inTL || inTR || inBL) {
          const onEdge =
            (inTL && (r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1))) ||
            (inTR && (r === 0 || r === 2 || c === size - 3 || c === size - 1 || (r === 1 && c === size - 2))) ||
            (inBL && (r === size - 3 || r === size - 1 || c === 0 || c === 2 || (r === size - 2 && c === 1)));
          if (onEdge) grid.push([c, r]);
        } else {
          const bit = ((hash >> ((r * size + c) % 24)) ^ (r * 7 + c * 13)) & 1;
          if (bit === 1) grid.push([c, r]);
        }
      }
    }
    return grid;
  }, [serialNo]);

  const boxSize = compact ? 52 : 66;
  return (
    <div className="inline-flex items-center gap-2.5 border border-zinc-200 bg-white px-2.5 py-2">
      <svg
        width={boxSize}
        height={boxSize}
        viewBox="0 0 11 11"
        shapeRendering="crispEdges"
        aria-label="Certificate Verification QR"
      >
        <rect width="11" height="11" fill="#ffffff" />
        {cells.map(([x, y], idx) => (
          <rect key={idx} x={x} y={y} width="1" height="1" fill={color} />
        ))}
      </svg>
      <div className="text-[9px] leading-tight text-zinc-600">
        <div className="font-bold uppercase tracking-wider text-zinc-900">QR Verify</div>
        <div className="font-mono font-semibold text-zinc-800 mt-0.5">{serialNo || 'DRAFT-PREVIEW'}</div>
        <div className="text-[8px] text-zinc-500 mt-0.5">Institutional Registry</div>
      </div>
    </div>
  );
};

/**
 * Reusable Official A4 Certificate Sheet (Live Preview + Full Print Output)
 */
export const CertificateA4Sheet = ({
  certificate = {},
  template = null,
  branch = null,
  academicYearName = '',
  compact = false,
}) => {
  const certType = certificate.certificate_type || template?.certificate_type || 'bonafide';
  const typeMeta = CERTIFICATE_TYPE_MAP[certType] || CERTIFICATE_TYPE_MAP.bonafide;

  const borderStyle = certificate.border_style || template?.border_style || 'classic_double';
  const colorThemeKey = certificate.color_theme || template?.color_theme || 'monochrome';
  const signatureLayout = certificate.signature_layout || template?.signature_layout || 'principal_seal';
  const showPhoto =
    certificate.show_student_photo !== undefined
      ? Boolean(Number(certificate.show_student_photo))
      : template?.show_student_photo !== undefined
      ? Boolean(Number(template.show_student_photo))
      : true;
  const showQr =
    certificate.show_qr_verification !== undefined
      ? Boolean(Number(certificate.show_qr_verification))
      : template?.show_qr_verification !== undefined
      ? Boolean(Number(template.show_qr_verification))
      : true;

  const theme = COLOR_THEME_MAP[colorThemeKey] || COLOR_THEME_MAP.monochrome;

  const schoolName = branch?.name || certificate.branch_name || 'GREEN PARK SCHOOL';
  const schoolLogo = branch?.logo || certificate.branch_logo || '/assets/logo.png';
  const schoolAddress = [branch?.address || certificate.branch_address, branch?.city || certificate.branch_city, branch?.state || certificate.branch_state]
    .filter(Boolean)
    .join(', ');
  const schoolContact = [
    branch?.phone || certificate.branch_phone ? `Ph: ${branch?.phone || certificate.branch_phone}` : null,
    branch?.email || certificate.branch_email ? `Email: ${branch?.email || certificate.branch_email}` : null,
    branch?.code || certificate.branch_code ? `Campus Code: ${branch?.code || certificate.branch_code}` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  const categoryBadge =
    certificate.template_badge ||
    certificate.category_badge ||
    template?.category_badge ||
    typeMeta.defaultBadge;

  const titleHeading =
    certificate.title_heading ||
    template?.title_heading ||
    typeMeta.defaultTitle;

  const bodyContent = certificate.rendered_body || template?.body_template || '';
  const footerNote = certificate.footer_note ?? template?.footer_note ?? '';
  const status = certificate.status || 'issued';
  const reprintCount = Number(certificate.reprint_count || 0);
  const cf =
    certificate.custom_fields && typeof certificate.custom_fields === 'object'
      ? certificate.custom_fields
      : {};

  // Frame styling per borderStyle
  const outerFrameStyle =
    borderStyle === 'minimal_mono'
      ? { borderTop: `5px solid ${theme.primary}`, borderBottom: `5px solid ${theme.primary}`, borderLeft: '1px solid #d4d4d8', borderRight: '1px solid #d4d4d8' }
      : borderStyle === 'royal_seal'
      ? { border: `4px solid ${theme.primary}`, outline: `2px solid ${theme.accent}`, outlineOffset: '-8px' }
      : borderStyle === 'cbse_formal'
      ? { border: `3px solid ${theme.primary}` }
      : { border: `3px double ${theme.primary}` };

  const innerFrameClass =
    borderStyle === 'classic_double' || borderStyle === 'cbse_formal'
      ? 'border border-zinc-400/70'
      : '';

  const showDraftWatermark = status === 'pending_approval';
  const showVoidWatermark = status === 'revoked' || status === 'rejected';

  const photoSrc = certificate.photo_url || null;
  const [photoError, setPhotoError] = useState(false);
  useEffect(() => {
    setPhotoError(false);
  }, [photoSrc]);

  const initials = String(certificate.recipient_name || 'R')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={`certificate-print-root relative bg-white text-zinc-900 mx-auto select-text ${
        compact ? 'p-3' : 'p-5 sm:p-7'
      }`}
      style={{
        maxWidth: compact ? '100%' : '210mm',
        minHeight: compact ? '520px' : '274mm',
        boxShadow: compact ? 'none' : '0 10px 30px rgba(0,0,0,0.08)',
        ...outerFrameStyle,
      }}
    >
      {/* Royal corner accents */}
      {borderStyle === 'royal_seal' && (
        <>
          <div className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: theme.accent }} />
          <div className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: theme.accent }} />
          <div className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: theme.accent }} />
          <div className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: theme.accent }} />
        </>
      )}

      {/* Subtle watermark */}
      {(showDraftWatermark || showVoidWatermark) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
          <span
            className="text-4xl sm:text-5xl font-black uppercase tracking-[0.25em] -rotate-24 border-4 px-6 py-2 opacity-15"
            style={{
              color: showVoidWatermark ? '#b91c1c' : '#b45309',
              borderColor: showVoidWatermark ? '#b91c1c' : '#b45309',
            }}
          >
            {status === 'revoked'
              ? 'REVOKED — VOID'
              : status === 'rejected'
              ? 'REJECTED DRAFT'
              : 'PENDING APPROVAL'}
          </span>
        </div>
      )}

      <div className={`relative z-0 flex flex-col justify-between h-full ${innerFrameClass} ${compact ? 'p-4' : 'p-6 sm:p-8'}`} style={{ minHeight: compact ? '490px' : '256mm' }}>
        <div>
          {/* 1. Institutional Letterhead */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b-2" style={{ borderColor: theme.primary }}>
            <div className="flex items-center gap-3.5">
              <div className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} shrink-0 rounded-lg border border-zinc-200 bg-white flex items-center justify-center overflow-hidden p-1`}>
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
                  {categoryBadge}
                </div>
                <h1 className={`${compact ? 'text-lg' : 'text-2xl'} font-extrabold tracking-tight uppercase mt-0.5`} style={{ color: theme.primary, fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}>
                  {schoolName}
                </h1>
                {schoolAddress && (
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">{schoolAddress}</p>
                )}
                {schoolContact && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">{schoolContact}</p>
                )}
              </div>
            </div>

            {showPhoto && (
              <div className={`${compact ? 'w-16 h-20' : 'w-20 h-24'} shrink-0 border-2 border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center overflow-hidden`}>
                {photoSrc && !photoError ? (
                  <img
                    src={photoSrc}
                    alt={certificate.recipient_name || 'Photo'}
                    onError={() => setPhotoError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <span className="text-lg font-bold text-zinc-400">{initials}</span>
                    <span className="text-[8px] uppercase tracking-wider text-zinc-400 mt-1">Affix Photo</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 2. Reference Strip */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mt-3 text-[11px] border"
            style={{ backgroundColor: theme.softBg, borderColor: `${theme.border}33` }}
          >
            <div>
              <span className="font-semibold text-zinc-500 uppercase tracking-wider mr-1.5">Serial / Cert No:</span>
              <span className="font-mono font-bold text-zinc-900">
                {certificate.certificate_no || 'AUTO-GENERATED ON SAVE'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(certificate.academic_year_name || academicYearName) && (
                <span>
                  <span className="font-semibold text-zinc-500 uppercase tracking-wider mr-1">Session:</span>
                  <span className="font-semibold text-zinc-900">{certificate.academic_year_name || academicYearName}</span>
                </span>
              )}
              <span>
                <span className="font-semibold text-zinc-500 uppercase tracking-wider mr-1">Date:</span>
                <span className="font-semibold text-zinc-900">
                  {formatDisplayDate(certificate.issue_date || new Date())}
                </span>
              </span>
              {reprintCount > 1 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-zinc-400 text-zinc-700 bg-white">
                  Copy #{reprintCount}
                </span>
              )}
            </div>
          </div>

          {/* 3. Main Certificate Heading */}
          <div className="text-center my-5">
            <h2
              className={`inline-block uppercase tracking-[0.18em] font-extrabold pb-1.5 border-b-2 ${
                compact ? 'text-lg' : 'text-2xl'
              }`}
              style={{
                color: theme.primary,
                borderColor: theme.accent,
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
              }}
            >
              {titleHeading}
            </h2>
          </div>

          {/* 4. Recipient Identity Pill Bar */}
          {certificate.recipient_name && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2.5 mb-4 border border-zinc-200 bg-zinc-50/70 text-[11px]">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  {certificate.recipient_type === 'staff' ? 'Staff Member' : 'Student Name'}
                </div>
                <div className="font-bold text-zinc-900 truncate">{certificate.recipient_name}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  {certificate.recipient_type === 'staff' ? 'Employee ID' : 'Admission No'}
                </div>
                <div className="font-mono font-semibold text-zinc-800">{certificate.ref_no || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  {certificate.recipient_type === 'staff' ? 'Department' : 'Class & Section'}
                </div>
                <div className="font-semibold text-zinc-800">{certificate.class_or_dept || '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Date of Birth</div>
                <div className="font-semibold text-zinc-800">{formatDisplayDate(certificate.dob)}</div>
              </div>
            </div>
          )}

          {/* 5. Formal Narrative Body */}
          <div
            className={`${compact ? 'text-xs leading-relaxed' : 'text-[14px] leading-[1.85]'} text-zinc-800 whitespace-pre-line text-justify px-1`}
            style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
          >
            {bodyContent || 'Certificate body content will appear here as you edit the template or recipient fields.'}
          </div>

          {/* 6. Official CBSE Transfer Certificate Particular Table (renders cleanly for TC type) */}
          {certType === 'tc' && (
            <div className="mt-5 border border-zinc-300 text-[11px]">
              <div
                className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-white"
                style={{ backgroundColor: theme.primary }}
              >
                CBSE / School Leaving Register Particulars
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200">
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Father&apos;s Name:</span>
                  <span className="font-semibold text-zinc-900 text-right">{certificate.father_name || '—'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Mother&apos;s Name:</span>
                  <span className="font-semibold text-zinc-900 text-right">{certificate.mother_name || '—'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Nationality / Category:</span>
                  <span className="font-semibold text-zinc-900 text-right">{certificate.nationality || 'Indian'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Last Class Studied:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.last_class_studied || certificate.class_or_dept || '—'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">School Annual Exam Result:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.last_exam_result || 'Passed'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Promoted To Higher Class:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.promoted_to_class || 'Eligible for Promotion'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Attendance (Present / Working Days):</span>
                  <span className="font-semibold text-zinc-900 text-right">
                    {cf.present_days || '—'} / {cf.working_days || '—'}
                  </span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Month Up To Which Dues Paid:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.month_dues_paid || 'Cleared'}</span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Date of Application / Leaving:</span>
                  <span className="font-semibold text-zinc-900 text-right">
                    {cf.application_date ? `${formatDisplayDate(cf.application_date)} / ` : ''}
                    {formatDisplayDate(cf.leaving_date || certificate.issue_date)}
                  </span>
                </div>
                <div className="p-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">General Conduct & Fee Concession:</span>
                  <span className="font-semibold text-zinc-900 text-right">
                    {certificate.conduct_grade || cf.conduct || 'Good'} {cf.fee_concession ? `(${cf.fee_concession})` : ''}
                  </span>
                </div>
                <div className="p-2 col-span-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Subjects Studied:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.subjects_studied || 'As per CBSE Curriculum'}</span>
                </div>
                <div className="p-2 col-span-2 flex justify-between gap-2">
                  <span className="text-zinc-500 font-medium">Reason for Leaving:</span>
                  <span className="font-semibold text-zinc-900 text-right">{cf.reason_for_leaving || certificate.purpose || 'Parents Request'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 7. Bottom Footer Note + QR Verification + Signatories */}
        <div className="mt-8 pt-4 border-t border-zinc-200">
          {footerNote && (
            <p className="text-[10px] italic text-zinc-500 mb-4">{footerNote}</p>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Verification QR */}
            <div>
              {showQr && (
                <QrVerificationBadge
                  serialNo={certificate.certificate_no}
                  color={theme.primary}
                  compact={compact}
                />
              )}
            </div>

            {/* Signatory Blocks */}
            <div className="flex items-end gap-6 sm:gap-8 ml-auto">
              {signatureLayout === 'principal_teacher' && (
                <div className="text-center min-w-[115px]">
                  <div className="h-10 border-b border-zinc-400 mb-1.5" />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">Class Mentor / Registrar</div>
                  <div className="text-[9px] text-zinc-500">Prepared &amp; Verified By</div>
                </div>
              )}

              {(signatureLayout === 'principal_seal' || signatureLayout === 'principal_teacher') && (
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="w-16 h-16 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-center opacity-70"
                    style={{ borderColor: theme.accent, color: theme.accent }}
                  >
                    <span className="text-[7px] font-bold uppercase tracking-widest leading-tight px-1">
                      OFFICIAL SEAL
                    </span>
                    <span className="text-[6px] uppercase mt-0.5">{branch?.code || 'SCHOOL'}</span>
                  </div>
                </div>
              )}

              <div className="text-center min-w-[135px]">
                <div className="h-10 border-b border-zinc-500 mb-1.5" />
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                  Principal / Head of Institution
                </div>
                <div className="text-[9px] text-zinc-500">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
