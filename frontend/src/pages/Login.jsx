import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('admin@schoolerp.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo & Name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-brand-900/50 mb-3 p-1">
            <img
              src="/assets/logo.png"
              alt="School ERP Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">School ERP Portal</h1>
          <p className="text-sm text-slate-400 mt-1">
            Academic & Multi-Campus Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-3xl shadow-2xl border border-slate-800/10 p-8">
          <h2 className="text-lg font-bold text-heading mb-1">Sign In to Dashboard</h2>
          <p className="text-xs text-muted mb-6">Enter your administrator credentials to proceed</p>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@schoolerp.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-heading"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-heading"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="mt-6 pt-5 border-t border-border/80">
            <p className="text-[11px] text-muted text-center">
              Default seeded Super Admin:{' '}
              <span className="font-mono text-slate-700 font-medium">admin@schoolerp.com</span> /{' '}
              <span className="font-mono text-slate-700 font-medium">Admin@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
