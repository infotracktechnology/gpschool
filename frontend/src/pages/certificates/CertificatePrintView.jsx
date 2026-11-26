import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Edit,
  ShieldAlert,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CertificatePrintStyles,
  CertificateA4Sheet,
} from '../../components/certificates/CertificatePrintSheet';
import { CERTIFICATE_TYPE_MAP, STATUS_META } from '../../utils/certificateRenderer';

const CAN_REVOKE_ROLES = ['super_admin', 'admin', 'principal'];

export const CertificatePrintView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, selectedBranch } = useAuth();
  const canRevoke = CAN_REVOKE_ROLES.includes(String(user?.role || '').toLowerCase());

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [showRevokePanel, setShowRevokePanel] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCert();
  }, [id]);

  const fetchCert = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/certificates/${id}`);
      if (res.success && res.certificate) {
        setCert(res.certificate);
      }
    } catch (err) {
      setError(err.message || 'Certificate record not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!cert) return;
    setError('');
    try {
      setPrinting(true);
      const res = await api.post(`/certificates/${id}/print`, {});
      if (res.success && res.certificate) {
        setCert((prev) => ({
          ...prev,
          reprint_count: res.certificate.reprint_count,
          status: res.certificate.status,
          issued_at: res.certificate.issued_at,
        }));
      }
      setTimeout(() => window.print(), 120);
    } catch (err) {
      setError(err.message || 'Cannot print certificate');
    } finally {
      setPrinting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      setError('Please enter a revocation reason.');
      return;
    }
    try {
      const res = await api.patch(`/certificates/${id}/status`, {
        action: 'revoke',
        revoke_reason: revokeReason.trim(),
      });
      if (res.success) {
        setShowRevokePanel(false);
        fetchCert();
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke certificate');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading A4 certificate document...</div>;
  }

  if (!cert) {
    return <div className="p-10 text-center text-sm text-rose-600">{error || 'Certificate not found'}</div>;
  }

  const stMeta = STATUS_META[cert.status] || STATUS_META.issued;
  const tMeta = CERTIFICATE_TYPE_MAP[cert.certificate_type] || {};
  const isPrintable = cert.status === 'issued' || cert.status === 'approved' || cert.status === 'pending_approval';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <CertificatePrintStyles />

      {/* Top Controls (hidden during window.print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(tMeta.routePath || '/certificates/history')}
              className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900">
                  {tMeta.label} • <span className="font-mono">{cert.certificate_no}</span>
                </h1>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${stMeta.badgeClass}`}>
                  {stMeta.label}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                  Printed {cert.reprint_count || 0}x
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {cert.recipient_name} • {cert.class_or_dept || cert.ref_no || 'Official Record'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cert.status === 'pending_approval' && (
              <button
                onClick={() => navigate(`/certificates/approvals/${cert.id}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Go to Approval Screen
              </button>
            )}
            <button
              onClick={() => navigate(`/certificates/edit/${cert.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Certificate
            </button>
            {canRevoke && (cert.status === 'issued' || cert.status === 'approved') && (
              <button
                onClick={() => setShowRevokePanel((s) => !s)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Revoke
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={!isPrintable || printing}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Preparing Print...' : 'Print Official A4'}
            </button>
          </div>
        </div>

        {/* Inline Notice / Alerts */}
        {cert.status === 'pending_approval' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            This certificate is currently marked <strong>Pending Approval</strong> and displays a DRAFT watermark until approved by Principal / Admin.
          </div>
        )}

        {(cert.status === 'rejected' || cert.status === 'revoked') && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>
              Official printing is disabled because this certificate is <strong>{cert.status.toUpperCase()}</strong>.
              {cert.revoke_reason || cert.approval_remarks ? ` Reason: ${cert.revoke_reason || cert.approval_remarks}` : ''}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>
        )}

        {/* Inline Revocation Panel (Zero Modal) */}
        {showRevokePanel && (
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Revoke &amp; Void Certificate {cert.certificate_no}
            </div>
            <input
              type="text"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Enter mandatory revocation reason (e.g. Incorrect DOB / Cancelled Transfer)..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 bg-white"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleRevoke}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Confirm Revoke
              </button>
              <button
                onClick={() => setShowRevokePanel(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Centered A4 Certificate Sheet */}
      <div className="py-2">
        <CertificateA4Sheet certificate={cert} branch={selectedBranch} />
      </div>
    </div>
  );
};
