import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  LogOut,
  ArrowLeft,
  Check,
  User,
  Clock,
  Building2,
  AlertTriangle,
  Edit,
  Trash2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client';

export const VisitorCheckoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exitRemarks, setExitRemarks] = useState('Badge returned, visit completed safely');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchPass();
  }, [id]);

  const fetchPass = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitors/passes/${id}`);
      if (res.success && res.pass) {
        setPass(res.pass);
        if (res.pass.exit_remarks) setExitRemarks(res.pass.exit_remarks);
      } else {
        setErrorMsg('Visitor pass not found.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load visitor pass details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!pass) return;
    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await api.post(`/visitors/exit/${pass.id}`, { exit_remarks: exitRemarks });
      if (res.success) {
        navigate('/visitors/exit');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to check out visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pass) return;
    if (!window.confirm(`Delete pass ${pass.pass_number} for ${pass.visitor_name}?`)) return;
    try {
      await api.delete(`/visitors/passes/${pass.id}`);
      navigate('/visitors/exit');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete visitor pass');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading gate pass details...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/visitors/exit"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">Visitor Exit &amp; Gate Checkout</p>
            <h1 className="text-xl font-bold text-slate-900">
              Gate Check-Out Verification {pass?.pass_number ? `— ${pass.pass_number}` : ''}
            </h1>
          </div>
        </div>

        {pass && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/visitors/passes/${pass.id}`)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> View Pass
            </button>
            <button
              type="button"
              onClick={() => navigate(`/visitors/entry/${pass.id}/edit`)}
              className="px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded-xl flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Pass
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {pass && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start border-b border-slate-100 pb-6">
            {pass.photo_url ? (
              <img
                src={pass.photo_url}
                alt={pass.visitor_name}
                className="w-28 h-32 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-28 h-32 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <User className="w-10 h-10" />
              </div>
            )}

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Visitor Full Name</span>
                <p className="text-base font-extrabold text-slate-900">{pass.visitor_name}</p>
                <p className="font-mono text-slate-600 mt-0.5">{pass.visitor_phone}</p>
              </div>
              <div>
                <span className="text-slate-400 block">Status &amp; Duration</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      pass.status === 'checked_out'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : pass.is_overstayed
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-brand-50 text-brand-700 border border-brand-200'
                    }`}
                  >
                    {pass.status === 'checked_out'
                      ? 'Already Checked Out'
                      : pass.is_overstayed
                      ? 'Overstayed'
                      : 'Active Inside Campus'}
                  </span>
                  <span className="font-mono font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {pass.duration_minutes || 0} mins elapsed
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Meeting With (Host)</span>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                  {pass.person_to_meet_name} ({pass.department || 'General'})
                </p>
              </div>

              <div>
                <span className="text-slate-400 block">Security Credentials</span>
                <p className="font-medium text-slate-700">
                  {pass.badge_number ? `Badge #${pass.badge_number} • ` : ''}
                  {pass.id_proof_type ? `${pass.id_proof_type}: ${pass.id_proof_number || ''}` : 'Walk-in Verified'}
                </p>
              </div>
            </div>
          </div>

          {pass.is_overstayed === 1 && pass.status === 'active' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Overstay Notice:</strong> Visitor exceeded expected duration of{' '}
                {pass.expected_duration_minutes} minutes. Please note reason below before clearing gate exit.
              </span>
            </div>
          )}

          {pass.status === 'active' ? (
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Gate Officer Exit Remarks &amp; Badge Return Note
                </label>
                <textarea
                  rows={3}
                  value={exitRemarks}
                  onChange={(e) => setExitRemarks(e.target.value)}
                  placeholder="e.g. Visitor badge returned at Main Gate, meeting concluded..."
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/visitors/exit')}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {submitting ? 'Completing Exit...' : 'Confirm & Complete Check-Out'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-bold">Checked Out on {new Date(pass.check_out_time).toLocaleString()}</p>
                  <p className="text-emerald-700">Remarks: {pass.exit_remarks || 'None'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/visitors/exit')}
                className="px-4 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-800"
              >
                Back to Exit Desk
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
