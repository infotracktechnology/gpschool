import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  School,
  ShieldCheck,
  GraduationCap,
  Building2,
  FileCheck2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [username, setUsername] = useState('admin@schoolerp.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState('super_admin');

  const { login } = useAuth();
  const navigate = useNavigate();

  // 1-Click Demo Role Presets to impress clients during live presentations
  const demoRoles = [
    {
      id: 'super_admin',
      label: 'Super Admin',
      badge: 'All Campuses',
      desc: 'Full Enterprise Access',
      username: 'admin@schoolerp.com',
      pass: 'Admin@123',
    },
    {
      id: 'principal',
      label: 'Principal',
      badge: 'Salem Campus',
      desc: 'Academic & Campus Head',
      username: 'principal@schoolerp.com',
      pass: 'Admin@123',
    },
    {
      id: 'teacher',
      label: 'Teacher Portal',
      badge: 'GPS-T-001',
      desc: 'Faculty & Attendance Suite',
      username: 'GPS-T-001',
      pass: '9840123456',
    },
    {
      id: 'branch_admin',
      label: 'Campus Admin',
      badge: 'Central Branch',
      desc: 'Operations & Admissions',
      username: 'campus@schoolerp.com',
      pass: 'Admin@123',
    },
    {
      id: 'student',
      label: 'Student Portal',
      badge: 'GPS/2026/001',
      desc: 'Student / Parent Dossier',
      username: 'GPS/2026/001',
      pass: '13052019',
    },
  ];

  const handleSelectDemo = (role) => {
    setSelectedDemoRole(role.id);
    setUsername(role.username);
    setPassword(role.pass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(username, password);
      const role = data?.user?.role || (username.startsWith('GPS-T') ? 'teacher' : 'admin');
      if (role === 'teacher' || role === 'staff') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your institutional credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-stretch overflow-hidden text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* LEFT PANEL: LUXURY SCHOOL ERP SHOWCASE */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-7/12 relative flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 border-r border-slate-800/80 overflow-hidden">
        {/* Ambient Decorative Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        {/* Top Header Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center p-2">
                <img
                  src="/assets/logo.png"
                  alt="School ERP Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML = '<span class="text-emerald-400 font-black text-xl">GP</span>';
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">GREEN PARK SCHOOL ERP</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  v2.6 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Green Park Institutions • Multi-Campus Academic Operating System</p>
            </div>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
         
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Empowering Modern Schools with{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Unified Academic Intelligence.
            </span>
          </h1>

          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Architected specifically for leading educational institutions. Effortlessly manage multi-branch admissions, digital student dossiers, batch section allocations, CBSE & State Board structures, and automated Transfer Certificates.
          </p>

          {/* 4 Feature Value Props */}
          <div className="grid grid-cols-2 gap-3.5 mt-8">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Multi-Campus Sync</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Green Park School & Central Campus synchronized under one dashboard.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-2.5">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Digital Student Suite</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Photo uploads, certificates, TC engine & bulk portal credential generator.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Curriculum & TC Engine</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                CBSE, ICSE & State Board aligned academic groups and instant printable TCs.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition-all">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Enterprise Security</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Role-based authorization (Super Admin, Principal, Teacher) & encrypted logs.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Metrics & Trust */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Green Park School Core API Online</span>
          </div>
          <div>
            <span>ISO 27001 Certified • Bank-Grade 256-Bit SSL</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SIGN IN FORM */}
      <div className="w-full lg:w-5/12 xl:w-5/12 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white relative text-slate-900">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Only Header Logo */}
          <div className="text-center lg:hidden mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-950 shadow-md mb-2 p-1 text-emerald-400 font-bold text-lg">
              GP
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Green Park School ERP</h1>
            <p className="text-xs text-slate-500">Green Park Institutions • Multi-Campus School Portal</p>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a quick demo role or enter your institutional login credentials.
            </p>
          </div>

          {/* 1-CLICK DEMO PROFILE SELECTOR */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick 1-Click Demo Profiles:
              </span>
              <span className="text-[10px] text-slate-400">Auto-fills credentials</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {demoRoles.map((role) => {
                const isSelected = selectedDemoRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectDemo(role)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-[11px] truncate flex items-center gap-1">
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                      <span className="truncate">{role.label}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">{role.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message Toast */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username / Institutional ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setSelectedDemoRole('');
                  }}
                  placeholder="e.g. admin@schoolerp.com or GPS/2026/001"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'For password resets or credential reissuance, please contact the System Super Administrator or Campus IT Support.'
                    )
                  }
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSelectedDemoRole('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <span>Remember me on this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-emerald-600/35 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Trust Note */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Green Park School & Central Campus ERP • Authorized Access Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
