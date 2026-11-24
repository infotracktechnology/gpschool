import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Building2,
  GraduationCap,
  Landmark,
  FileText,
  Phone,
  Mail,
  MapPin,
  Fingerprint,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  Download,
  Eye,
  X,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';

export const PortalProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [previewDoc, setPreviewDoc] = useState(null);

  // Profile data state
  const [profile, setProfile] = useState({
    name: user?.name || 'Dr. Ramesh Sundaram',
    emp_no: user?.emp_no || 'GPS-T-001',
    role: 'Teacher',
    designation: user?.designation || 'PGT Senior Mathematics Teacher',
    department: user?.department || 'Mathematics Department',
    branch_name: user?.branch_name || 'Main Campus (Salem)',
    status: 'active',
    gender: 'Male',
    dob: '1985-05-14',
    blood_group: 'O+',
    marital_status: 'Married',
    pan_number: 'ABCDE1234F',
    aadhaar_number: '8765-4321-1098',
    phone: user?.phone || '+91 98401 23456',
    alt_phone: '+91 98401 99999',
    email: user?.email || 'ramesh.sundaram@greenpark.edu',
    current_address: '14/B, Gokulam Enclave, Hasthampatti, Salem - 636007',
    permanent_address: '14/B, Gokulam Enclave, Hasthampatti, Salem - 636007',
    emergency_contact: 'Meenakshi Sundaram (Spouse) • +91 98401 88888',
    employment_type: 'Full-time Permanent Faculty',
    joining_date: '2021-06-01',
    biometric_punch_id: 'BIO-SLM-104',
    shift: 'Standard Faculty (08:00 AM - 04:30 PM)',
    highest_degree: 'Ph.D. in Applied Mathematics',
    total_experience_years: 12,
    bank_name: 'State Bank of India',
    account_number: '30492817492',
    ifsc_code: 'SBIN0001234',
    pf_uan: '100984729103',
    esi_number: '5192847192',
    qualifications: [
      { id: 1, degree: 'Ph.D. Mathematics', university: 'Madras University', year: '2016', score: 'Commended (88%)', spec: 'Graph Theory' },
      { id: 2, degree: 'M.Sc. Mathematics', university: 'Loyola College, Chennai', year: '2010', score: '84.5%', spec: 'Applied Mathematics' },
      { id: 3, degree: 'B.Ed. Education', university: 'TNTEU', year: '2011', score: '82%', spec: 'Mathematics Pedagogy' },
    ],
    experience: [
      { id: 1, institution: 'Sri Chaitanya Junior College', role: 'Senior Faculty - IIT JEE', tenure: '2016 - 2021' },
      { id: 2, institution: 'National Model Matriculation School', role: 'Secondary Math Teacher', tenure: '2012 - 2016' },
    ],
    documents: [
      { id: 1, name: 'Curriculum_Vitae_Ramesh.pdf', type: 'Resume / CV', date: '2021-06-01', size: '2.4 MB' },
      { id: 2, name: 'Doctoral_Degree_Certificate.pdf', type: 'Degree Certificate', date: '2021-06-01', size: '4.1 MB' },
      { id: 3, name: 'Aadhaar_Card_Verified.pdf', type: 'Aadhaar Card', date: '2021-06-02', size: '1.1 MB' },
      { id: 4, name: 'PAN_Card_Copy.pdf', type: 'PAN Card', date: '2021-06-02', size: '850 KB' },
      { id: 5, name: 'Police_Clearance_Certificate.pdf', type: 'Police Verification', date: '2021-06-05', size: '1.8 MB' },
    ],
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 360 Header Banner */}
      <div className="bg-white rounded-3xl border border-border shadow-xs p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md shrink-0">
              {profile.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-heading">{profile.name}</h1>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                  {profile.emp_no}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Personnel Record</span>
                </span>
              </div>

              <p className="text-sm font-semibold text-emerald-700">{profile.designation}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.branch_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono font-medium text-slate-700">{profile.biometric_punch_id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all"
            >
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Print My Dossier</span>
            </button>
          </div>
        </div>

        {/* 5 Tabs */}
        <div className="flex items-center gap-2 border-b border-border overflow-x-auto pt-2">
          {[
            { id: 'personal', label: '1. Personal & Identity', icon: User },
            { id: 'employment', label: '2. Employment & Campus', icon: Building2 },
            { id: 'qualifications', label: '3. Qualification & Experience', icon: GraduationCap },
            { id: 'bank', label: '4. Bank & Statutory', icon: Landmark },
            { id: 'documents', label: '5. Official Documents', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
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
            <h3 className="text-base font-bold text-heading">Personal & Demographic Record</h3>
            <p className="text-xs text-muted">Official identity data synced with institutional HR files</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Gender</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.gender}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Date of Birth</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.dob}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Blood Group</span>
              <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{profile.blood_group}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">PAN Card Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.pan_number}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Aadhaar Card Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.aadhaar_number}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Marital Status</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.marital_status}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-border sm:col-span-3">
              <span className="text-muted block">Residential Address</span>
              <span className="font-medium text-slate-800 text-sm mt-0.5 block">{profile.current_address}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-border sm:col-span-3">
              <span className="text-muted block">Emergency Contact</span>
              <span className="font-medium text-slate-800 text-sm mt-0.5 block">{profile.emergency_contact}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Employment & Campus */}
      {activeTab === 'employment' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-heading">Employment & Campus Particulars</h3>
            <p className="text-xs text-muted">Contract status, shift timings, and biometric registration</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Employee Code (Emp ID)</span>
              <span className="font-mono font-bold text-brand-700 text-sm mt-0.5 block">{profile.emp_no}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Campus Branch</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.branch_name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Employment Type</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.employment_type}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Official Designation</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.designation}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Joining Date</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.joining_date}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Biometric Punch ID</span>
              <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">{profile.biometric_punch_id}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border sm:col-span-3">
              <span className="text-muted block">Daily Shift Timings</span>
              <span className="font-medium text-slate-800 text-sm mt-0.5 block">{profile.shift}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Qualification & Experience */}
      {activeTab === 'qualifications' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-heading">Degrees & Prior Academic Experience</h3>
            <p className="text-xs text-muted">
              Total Professional Experience: <span className="font-bold text-slate-900">{profile.total_experience_years} Years</span>
            </p>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Degree</th>
                  <th className="py-2.5 px-3">University</th>
                  <th className="py-2.5 px-3">Year</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Specialization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profile.qualifications.map((q) => (
                  <tr key={q.id}>
                    <td className="py-3 px-3 font-bold text-slate-900">{q.degree}</td>
                    <td className="py-3 px-3 text-slate-700">{q.university}</td>
                    <td className="py-3 px-3 font-mono">{q.year}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-700">{q.score}</td>
                    <td className="py-3 px-3 text-muted">{q.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Bank & Statutory */}
      {activeTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-heading">Salary Bank Account & Statutory Numbers</h3>
            <p className="text-xs text-muted">Account details verified for monthly electronic salary credit</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Bank Name</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.bank_name}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Account Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.account_number}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">IFSC Code</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.ifsc_code}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">Provident Fund (UAN)</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.pf_uan}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-border">
              <span className="text-muted block">ESI Insurance Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{profile.esi_number}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Official Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-heading">Uploaded Personnel Documents & Proofs</h3>
            <p className="text-xs text-muted">Verified compliance certificates stored in your personnel record</p>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profile.documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{d.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{d.type}</td>
                    <td className="py-3 px-3 text-muted">{d.date}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setPreviewDoc(d)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-Browser Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-heading">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 bg-slate-50 rounded-xl space-y-2">
              <FileCheck className="w-12 h-12 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">{previewDoc.type}</p>
              <p className="text-xs text-muted">Digitally Signed & Verified Document</p>
            </div>
            <button
              onClick={() => alert(`Downloading ${previewDoc.name}`)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700"
            >
              Download Verified Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
