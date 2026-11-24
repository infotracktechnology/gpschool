import React from "react";
import {
  UserRound,
  Calendar,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  GraduationCap,
  ShieldCheck,
  Building2,
  Users,
  Award,
  Sparkles,
} from "lucide-react";
import { useStudent } from "../../context/StudentContext";

export const StudentProfileView = () => {
  const { student, loading } = useStudent();

  if (!student) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-bold text-slate-600">
          Loading student dossier...
        </p>
      </div>
    );
  }

  const studentName = student.student_name || "Student";
  const admissionNo = student.admission_no || "ADM001";
  const className = student.class_name
    ? `${student.class_name}${student.section_name ? ` (${student.section_name})` : ""}`
    : "Class 5 (A)";
  const branchName = student.branch_name || "Green Park Campus";

  return (
    <div className="space-y-6">
      {/* 1. Profile Hero Banner */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white p-6 sm:p-8 text-slate-900 shadow-md relative overflow-hidden">
        {" "}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200 p-0.5 shadow-md shrink-0">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-2xl font-black text-blue-600 overflow-hidden">
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={studentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                studentName.charAt(0)
              )}
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {admissionNo}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {studentName}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium pt-1">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                {className}
              </span>

              <span>•</span>

              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                {branchName}
              </span>

              {student.roll_no && (
                <>
                  <span>•</span>
                  <span>Roll No: <strong>{student.roll_no}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Personal Information */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <UserRound className="w-4 h-4 text-emerald-600" />
            <span>Personal Particulars </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">
                Date of Birth (DOB)
              </span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {student.dob
                  ? new Date(student.dob).toLocaleDateString("en-IN")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Gender</span>
              <p className="font-bold text-slate-800 text-sm capitalize mt-0.5">
                {student.gender || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Blood Group</span>
              <p className="font-bold text-rose-700 text-sm mt-0.5">
                {student.blood_group || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Mother Tongue</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {student.mother_tongue || "Tamil"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">
                Religion & Community
              </span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {student.religion || "—"}{" "}
                {student.caste_category ? `(${student.caste_category})` : ""}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Nationality</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {student.nationality || "Indian"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Academic & Enrollment Details */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <GraduationCap className="w-4 h-4 text-sky-600" />
            <span>Academic & Enrollment Details</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">
                Admission Number
              </span>
              <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                {admissionNo}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Enrolled Class</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {className}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Campus Branch</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {branchName}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Admission Date</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {student.admission_date
                  ? new Date(student.admission_date).toLocaleDateString("en-IN")
                  : "2026-06-01"}
              </p>
            </div>
            {student.previous_school && (
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">
                  Previous Institution
                </span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {student.previous_school}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Parent & Guardian Contact Information */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <Users className="w-4 h-4 text-amber-600" />
            <span>Parent & Guardian Information </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Father Details */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Father's Particulars
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {student.father_name || "Father Name Not Recorded"}
              </div>
              <div className="flex flex-wrap gap-3 text-slate-600 pt-0.5">
                {student.father_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {student.father_phone}
                  </span>
                )}
                {student.father_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-emerald-600" />
                    {student.father_email}
                  </span>
                )}
              </div>
            </div>

            {/* Mother Details */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mother's Particulars
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {student.mother_name || "Mother Name Not Recorded"}
              </div>
              {student.mother_phone && (
                <div className="text-slate-600 pt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {student.mother_phone}
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            {/* {(student.emergency_contact_name || student.emergency_contact_phone) && (
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  Emergency Contact
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {student.emergency_contact_name || 'Emergency Contact'}
                </div>
                {student.emergency_contact_phone && (
                  <div className="text-rose-700 pt-0.5 flex items-center gap-1 font-semibold">
                    <Phone className="w-3 h-3" />
                    {student.emergency_contact_phone}
                  </div>
                )}
              </div>
            )} */}
          </div>
        </div>

        {/* 5. Residential Address & Transportation */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-rose-600" />
            <span>Residential Address & Logistics</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Street Address</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5 leading-relaxed">
                {student.street_address || "No street address logged."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">City</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {student.city || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">State</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {student.state || "Tamil Nadu"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">PIN Code</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {student.pincode || "—"}
                </p>
              </div>
            </div>

            {student.bus_stop && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium">
                  School Bus Route & Stop
                </span>
                <p className="font-bold text-emerald-800 text-sm mt-0.5">
                  Stop: {student.bus_stop}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileView;
