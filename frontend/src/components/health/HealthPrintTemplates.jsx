import React from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Shared @media print rules for isolating formal A4 monochrome clinical sheets.
 * Hides application chrome, sidebars, and non-printable screen UI when printing.
 */
export const A4PrintStyles = () => (
  <style>{`
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, header, nav, aside, .sidebar {
        display: none !important;
      }
      main {
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        width: 100% !important;
      }
      .a4-print-only {
        display: block !important;
        width: 100% !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .shadow-xs, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl {
        box-shadow: none !important;
      }
    }
    @media screen {
      .a4-print-only {
        display: none !important;
      }
    }
  `}</style>
);

/**
 * Compute BMI and clinical weight category from height (cm) and weight (kg).
 */
const computeBmiDetails = (heightCm, weightKg) => {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) {
    return { bmi: '—', category: 'Not Computed' };
  }
  const bmiVal = w / Math.pow(h / 100, 2);
  const rounded = bmiVal.toFixed(1);
  let category = 'Normal';
  if (bmiVal < 18.5) category = 'Underweight';
  else if (bmiVal >= 25 && bmiVal < 30) category = 'Overweight';
  else if (bmiVal >= 30) category = 'Obese';
  return { bmi: `${rounded} kg/m²`, category };
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Pure monochrome formal A4 letterhead shared across Health & Infirmary sheets.
 */
const MonochromeA4Header = ({ title, subtitle, refLabel, refValue, dateValue }) => {
  const { selectedBranch } = useAuth();
  const activeBranch = selectedBranch && selectedBranch.id !== 'all' ? selectedBranch : null;
  const logoSrc = activeBranch?.logo || '/assets/logo.png';
  const schoolName = activeBranch?.name || 'Green Park International Senior Secondary School';
  const branchLocation = [activeBranch?.city, activeBranch?.state].filter(Boolean).join(', ') || 'Salem Campus';

  return (
    <div className="border-b-2 border-black pb-4 mb-5 bg-white text-black">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={logoSrc}
            alt="School Logo"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/assets/logo.png')) {
                e.currentTarget.src = '/assets/logo.png';
              }
            }}
            className="w-14 h-14 object-contain grayscale contrast-125 border border-black p-1 bg-white shrink-0"
          />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide text-black leading-tight">
              {schoolName}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-black mt-0.5">
              Campus Infirmary &amp; Clinical Health Wing
            </p>
            <p className="text-[10px] text-black mt-0.5">
              CBSE Affiliation: 1930452 • Institutional Code: 55321 • {branchLocation}
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] shrink-0 border border-black px-3 py-1.5 bg-white">
          <div className="font-bold uppercase tracking-wider">
            {refLabel}: <span className="font-mono">{refValue}</span>
          </div>
          <div className="mt-0.5">
            Date: <span className="font-semibold">{formatDate(dateValue)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-b border-black py-1.5 text-center bg-white">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-black">{title}</h2>
        {subtitle && <p className="text-[10px] uppercase tracking-wider text-black mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

/**
 * Full A4 Pure Monochrome Formal Health Check-up Report Card.
 */
export const CheckupA4Sheet = ({ report }) => {
  if (!report) return null;

  const { bmi, category } = computeBmiDetails(report.height_cm, report.weight_kg);
  const refCode = `HC-${new Date(report.checkup_date || Date.now()).getFullYear()}-${String(report.id || 0).padStart(4, '0')}`;

  return (
    <div className="bg-white text-black font-sans text-xs leading-relaxed p-6 sm:p-8 max-w-[210mm] mx-auto border border-black print:border-none print:p-0">
      <MonochromeA4Header
        title="Student Periodic Health Check-up Report Card"
        subtitle="Annual School Medical Screening & Physical Assessment Record"
        refLabel="Check-up ID"
        refValue={refCode}
        dateValue={report.checkup_date}
      />

      {/* Section 1: Student Particulars */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          1. Student Particulars
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Student Name</td>
              <td className="border border-black px-3 py-2 font-semibold w-[30%]">{report.student_name || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Admission No</td>
              <td className="border border-black px-3 py-2 font-mono w-[30%]">{report.admission_no || '—'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">Class &amp; Section</td>
              <td className="border border-black px-3 py-2 font-semibold">{report.class_section || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold">Blood Group</td>
              <td className="border border-black px-3 py-2 font-mono font-bold">{report.blood_group || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Anthropometric Measurements */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          2. Anthropometric Measurements &amp; BMI
        </h3>
        <table className="w-full border-collapse border border-black text-xs text-center">
          <thead>
            <tr>
              <th className="border border-black px-3 py-2 font-bold uppercase text-[10px] tracking-wider">Height (cm)</th>
              <th className="border border-black px-3 py-2 font-bold uppercase text-[10px] tracking-wider">Weight (kg)</th>
              <th className="border border-black px-3 py-2 font-bold uppercase text-[10px] tracking-wider">Calculated BMI</th>
              <th className="border border-black px-3 py-2 font-bold uppercase text-[10px] tracking-wider">BMI Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2.5 font-mono font-bold">
                {report.height_cm ? `${report.height_cm} cm` : '—'}
              </td>
              <td className="border border-black px-3 py-2.5 font-mono font-bold">
                {report.weight_kg ? `${report.weight_kg} kg` : '—'}
              </td>
              <td className="border border-black px-3 py-2.5 font-mono font-bold">{bmi}</td>
              <td className="border border-black px-3 py-2.5 font-bold uppercase">{category}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Sensory & Clinical Screening */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          3. Sensory &amp; Clinical Examination
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr>
              <th className="border border-black px-3 py-2 text-left font-bold uppercase text-[10px] tracking-wider w-1/3">
                Clinical Parameter
              </th>
              <th className="border border-black px-3 py-2 text-left font-bold uppercase text-[10px] tracking-wider">
                Clinical Observation / Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">Visual Acuity (Left Eye / Right Eye)</td>
              <td className="border border-black px-3 py-2 font-mono">
                Left: <strong>{report.vision_left || '6/6'}</strong> &nbsp;|&nbsp; Right:{' '}
                <strong>{report.vision_right || '6/6'}</strong>
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">Dental &amp; Oral Hygiene</td>
              <td className="border border-black px-3 py-2">{report.dental_status || 'Healthy'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">ENT (Ear, Nose &amp; Throat)</td>
              <td className="border border-black px-3 py-2">{report.ent_status || 'Normal'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">General Physical Fitness</td>
              <td className="border border-black px-3 py-2 font-bold uppercase">{report.general_fitness || 'Fit'}</td>
            </tr>
            {report.known_allergies && (
              <tr>
                <td className="border border-black px-3 py-2 font-bold">Recorded Allergies</td>
                <td className="border border-black px-3 py-2 font-semibold">{report.known_allergies}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section 4: Physician Remarks */}
      <div className="mb-8">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          4. Examining Physician Assessment &amp; Remarks
        </h3>
        <div className="border border-black p-4 min-h-[110px] bg-white whitespace-pre-line">
          {report.doctor_remarks || 'No abnormal clinical findings noted during routine screening.'}
        </div>
      </div>

      {/* Section 5: Verification & Signatures */}
      <div className="pt-8 mt-8 border-t border-black grid grid-cols-3 gap-6 text-center text-[11px]">
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">School Nurse / In-Charge</div>
          <p className="text-[10px] mt-0.5">Campus Infirmary</p>
        </div>
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">Principal / School Seal</div>
          <p className="text-[10px] mt-0.5">Official Stamp</p>
        </div>
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">Medical Examiner Signature</div>
          <p className="text-[10px] mt-0.5 font-semibold">{report.examiner_name || 'Campus Medical Officer'}</p>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-dashed border-black text-center text-[9px] uppercase tracking-wider">
        Generated via Green Park Campus Health Management System • Keep this report for student cumulative medical records.
      </div>
    </div>
  );
};

/**
 * Full A4 Pure Monochrome Clinical Consultation & Prescription Slip.
 */
export const ConsultationA4Sheet = ({ consult }) => {
  if (!consult) return null;

  const isStudent = consult.patient_type !== 'staff';
  const idLabel = isStudent ? 'Admission No' : 'Employee ID';
  const idValue = isStudent ? consult.admission_no : consult.emp_no;

  return (
    <div className="bg-white text-black font-sans text-xs leading-relaxed p-6 sm:p-8 max-w-[210mm] mx-auto border border-black print:border-none print:p-0">
      <MonochromeA4Header
        title="Infirmary Clinical Consultation & Prescription Slip"
        subtitle="Outpatient Medical Evaluation & Treatment Record"
        refLabel="Slip #"
        refValue={consult.consultation_number}
        dateValue={consult.consultation_date}
      />

      {/* Section 1: Patient & Visit Particulars */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          1. Patient Particulars
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Patient Name</td>
              <td className="border border-black px-3 py-2 font-bold w-[30%]">{consult.patient_name || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Patient Category</td>
              <td className="border border-black px-3 py-2 uppercase font-semibold w-[30%]">
                {isStudent ? 'Student' : 'Staff Member'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">
                {isStudent ? 'Class & Section' : 'Department'}
              </td>
              <td className="border border-black px-3 py-2 font-semibold">{consult.class_or_dept || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold">{idLabel}</td>
              <td className="border border-black px-3 py-2 font-mono">{idValue || '—'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">Blood Group</td>
              <td className="border border-black px-3 py-2 font-mono font-bold">{consult.blood_group || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold">Known Allergies</td>
              <td className="border border-black px-3 py-2 font-semibold">
                {consult.known_allergies || 'None Recorded'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Clinical Findings */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          2. Clinical Evaluation &amp; Diagnosis
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold w-1/4 align-top">
                Presenting Symptoms
              </td>
              <td className="border border-black px-3 py-2.5 whitespace-pre-line">
                {consult.symptoms || '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold align-top">
                Clinical Diagnosis
              </td>
              <td className="border border-black px-3 py-2.5 font-bold text-sm">
                {consult.diagnosis || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 3: Rx Prescription Section */}
      <div className="mb-5">
        <div className="border border-black p-4 min-h-[220px] bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between border-b border-black pb-2 mb-3">
              <span className="text-2xl font-serif font-black tracking-tight text-black">
                ℞ <span className="text-xs font-sans uppercase tracking-widest ml-1">Prescribed Medications &amp; Dosage</span>
              </span>
              <span className="text-[10px] font-mono uppercase">Ref: {consult.consultation_number}</span>
            </div>
            <div className="text-xs leading-relaxed whitespace-pre-line font-medium pl-2">
              {consult.prescription || 'No systemic medications prescribed. Supportive care & observation advised.'}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-dashed border-black text-[10px]">
            Dispensed / Verified at Campus Infirmary Desk: _____________________________
          </div>
        </div>
      </div>

      {/* Section 4: Advice, Rest & Follow-Up */}
      <div className="mb-8">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          3. Physician Advice, Rest &amp; Follow-Up
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold w-1/4 align-top">
                Advice &amp; Rest
              </td>
              <td className="border border-black px-3 py-2.5 whitespace-pre-line">
                {consult.advice_and_rest || 'Continue regular hydration and rest if symptoms persist.'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">
                Follow-Up Review Date
              </td>
              <td className="border border-black px-3 py-2 font-bold">
                {consult.follow_up_date ? formatDate(consult.follow_up_date) : 'As needed / If symptoms persist'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 5: Doctor Signature & Acknowledgements */}
      <div className="pt-8 mt-6 border-t border-black grid grid-cols-2 gap-10 text-[11px]">
        <div className="pt-12">
          <div className="border-t border-black pt-1.5 font-bold uppercase text-center">
            Nurse / Parent / Guardian Acknowledgement
          </div>
          <p className="text-[10px] text-center mt-0.5">Received instructions &amp; clinical summary</p>
        </div>

        <div className="pt-12 text-center">
          <div className="border-t border-black pt-1.5 font-bold uppercase">
            Consulting Physician Signature &amp; Seal
          </div>
          <p className="text-[11px] font-bold mt-0.5">{consult.doctor_name}</p>
          <p className="text-[10px] font-mono">
            Medical Reg. No: {consult.doctor_reg_no || 'Campus Medical Officer'}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-dashed border-black text-center text-[9px] uppercase tracking-wider">
        Green Park Campus Infirmary • In case of medical emergency after school hours, consult your family physician with this slip.
      </div>
    </div>
  );
};

/**
 * Full A4 Pure Monochrome Infirmary Visit & Incident Report Sheet.
 */
export const IncidentA4Sheet = ({ visit }) => {
  if (!visit) return null;

  const isStudent = visit.patient_type !== 'staff';
  const idLabel = isStudent ? 'Admission No' : 'Employee ID';
  const idValue = isStudent ? visit.admission_no : visit.emp_no;

  const dispositionLabel = {
    sent_back_to_class: 'Treated & Sent Back to Class / Duty',
    resting_in_bay: `Resting in Infirmary Bay${visit.bed_number ? ` (${visit.bed_number})` : ''}`,
    sent_home: 'Sent Home with Parent / Guardian',
    referred_hospital: 'Referred to Tie-up Hospital / Emergency Care',
  }[visit.disposition] || visit.disposition;

  return (
    <div className="bg-white text-black font-sans text-xs leading-relaxed p-6 sm:p-8 max-w-[210mm] mx-auto border border-black print:border-none print:p-0">
      <MonochromeA4Header
        title="Infirmary Visit, First Aid & Incident Report"
        subtitle="Campus Medical Triage & Parent Notification Record"
        refLabel="Visit #"
        refValue={visit.visit_number}
        dateValue={visit.visit_date}
      />

      {/* 1. Patient Particulars */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          1. Patient Particulars
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Patient Name</td>
              <td className="border border-black px-3 py-2 font-bold w-[30%]">{visit.patient_name || '—'}</td>
              <td className="border border-black px-3 py-2 font-bold w-1/5">Category</td>
              <td className="border border-black px-3 py-2 uppercase font-semibold w-[30%]">
                {isStudent ? 'Student' : 'Staff Member'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">
                {isStudent ? 'Class & Section' : 'Department'}
              </td>
              <td className="border border-black px-3 py-2 font-semibold">
                {isStudent ? visit.class_section || '—' : visit.department || '—'}
              </td>
              <td className="border border-black px-3 py-2 font-bold">{idLabel}</td>
              <td className="border border-black px-3 py-2 font-mono">{idValue || '—'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2 font-bold">Visit Time &amp; Type</td>
              <td className="border border-black px-3 py-2 uppercase">
                {visit.visit_time || '—'} ({visit.visit_type || 'illness'})
              </td>
              <td className="border border-black px-3 py-2 font-bold">Blood Group</td>
              <td className="border border-black px-3 py-2 font-mono font-bold">{visit.blood_group || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Vitals & Clinical Observations */}
      <div className="mb-5">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          2. Triage Vitals &amp; Chief Complaint
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-2 font-bold w-1/4">Body Temperature</td>
              <td className="border border-black px-3 py-2 font-mono w-1/4">
                {visit.temperature_f ? `${visit.temperature_f} °F` : '—'}
              </td>
              <td className="border border-black px-3 py-2 font-bold w-1/4">Pulse Rate</td>
              <td className="border border-black px-3 py-2 font-mono w-1/4">
                {visit.pulse_bpm ? `${visit.pulse_bpm} bpm` : '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold align-top">Chief Complaint / Injury</td>
              <td colSpan={3} className="border border-black px-3 py-2.5 whitespace-pre-line font-semibold">
                {visit.chief_complaint || '—'}
              </td>
            </tr>
            {visit.known_allergies && (
              <tr>
                <td className="border border-black px-3 py-2 font-bold">Known Allergies Flag</td>
                <td colSpan={3} className="border border-black px-3 py-2 font-bold">
                  {visit.known_allergies}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3. First Aid / Treatment & Disposition */}
      <div className="mb-8">
        <h3 className="text-[11px] font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
          3. First Aid Administered &amp; Disposition Outcome
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-3 font-bold w-1/4 align-top">Treatment / First Aid</td>
              <td className="border border-black px-3 py-3 min-h-[80px] whitespace-pre-line">
                {visit.treatment_given || 'Standard first aid & observation'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold">Current Disposition</td>
              <td className="border border-black px-3 py-2.5 font-bold uppercase">{dispositionLabel}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-2.5 font-bold align-top">Nurse / Incident Remarks</td>
              <td className="border border-black px-3 py-2.5 whitespace-pre-line">
                {visit.remarks || 'No additional remarks.'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Signatures */}
      <div className="pt-8 mt-8 border-t border-black grid grid-cols-3 gap-6 text-center text-[11px]">
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">Attending School Nurse</div>
          <p className="text-[10px] mt-0.5 font-semibold">{visit.attended_by || 'Campus Nurse'}</p>
        </div>
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">Parent / Guardian Sign</div>
          <p className="text-[10px] mt-0.5">If picked up early / notified</p>
        </div>
        <div className="pt-10">
          <div className="border-t border-black pt-1.5 font-bold uppercase">Principal / Infirmary In-Charge</div>
          <p className="text-[10px] mt-0.5">Official Verification</p>
        </div>
      </div>

      <div className="mt-6 pt-2 border-t border-dashed border-black text-center text-[9px] uppercase tracking-wider">
        Campus Health &amp; Safety Audit Record • Green Park Campus Infirmary
      </div>
    </div>
  );
};
