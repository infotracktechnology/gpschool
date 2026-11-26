import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CertificateA4Sheet } from '../../components/certificates/CertificatePrintSheet';
import {
  CERTIFICATE_TYPE_MAP,
  STATUS_META,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

const CAN_APPROVE_ROLES = ['super_admin', 'admin', 'principal'];

export const CertificateApprovalReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, selectedBranch } = useAuth();
  const canApprove = CAN_APPROVE_ROLES.includes(String(user?.role || '').toLowerCase());

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/certificates/${id}`);
      if (res.success && res.certificate) {
        setCert(res.certificate);
        setRemarks(res.certificate.approval_remarks || '');
      }
    } catch (err) {
      setError(err.message || 'Unable to load certificate request');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setError('');
    if ((action === 'reject' || action === 'revoke') && !remarks.trim()) {
      setError(`Please enter a clear reason / remarks before ${action === 'reject' ? 'rejecting' : 'revoking'}.`);
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.patch(`/certificates/${id}/status`, {
        action,
        approval_remarks: remarks.trim(),
        revoke_reason: remarks.trim(),
      });
      if (res.success) {
        if (action === 'approve_issue') {
          navigate(`/certificates/view/${id}/print`);
        } else {
          fetchDetail();
        }
      }
    } catch (err) {
      setError(err.message || 'Workflow update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${cert?.certificate_no}?`)) return;
    try {
      const res = await api.delete(`/certificates/${id}`);
      if (res.success) navigate('/certificates/approvals');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading inspection workspace...</div>;
  }

  if (!cert) {
    return <div className="p-10 text-center text-sm text-rose-600">{error || 'Certificate request not found'}</div>;
  }

  const stMeta = STATUS_META[cert.status] || STATUS_META.pending_approval;
  const tMeta = CERTIFICATE_TYPE_MAP[cert.certificate_type] || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/certificates/approvals')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Inspect Certificate Request: {cert.certificate_no}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${stMeta.badgeClass}`}>
                {stMeta.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {tMeta.label} • {cert.recipient_name} ({cert.class_or_dept || cert.ref_no || cert.recipient_type})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(`/certificates/edit/${cert.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Content
          </button>
          {(cert.status === 'approved' || cert.status === 'issued') && (
            <button
              onClick={() => navigate(`/certificates/view/${cert.id}/print`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" />
              Open A4 Print View
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Metadata + Decision Controls */}
        <div className="xl:col-span-5 space-y-5">
          {/* Recipient Verification Dossier */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Recipient &amp; Request Verification Summary
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div>
                <div className="text-slate-500">Recipient Name</div>
                <div className="font-bold text-slate-900 mt-0.5">{cert.recipient_name}</div>
              </div>
              <div>
                <div className="text-slate-500">{cert.recipient_type === 'staff' ? 'Employee ID' : 'Admission No'}</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{cert.ref_no || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500">{cert.recipient_type === 'staff' ? 'Department' : 'Class & Section'}</div>
                <div className="font-semibold text-slate-800 mt-0.5">{cert.class_or_dept || '—'}</div>
              </div>
              <div>
                <div className="text-slate-500">Date of Birth</div>
                <div className="font-semibold text-slate-800 mt-0.5">{formatDisplayDate(cert.dob)}</div>
              </div>
              <div>
                <div className="text-slate-500">Requested By</div>
                <div className="font-semibold text-slate-800 mt-0.5">{cert.requested_by_name || 'System User'}</div>
              </div>
              <div>
                <div className="text-slate-500">Requested On</div>
                <div className="font-semibold text-slate-800 mt-0.5">{formatDisplayDate(cert.created_at)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-slate-500">Stated Purpose</div>
                <div className="font-semibold text-slate-900 mt-0.5">{cert.purpose || 'Standard Institutional Request'}</div>
              </div>
            </div>

            {cert.certificate_type === 'tc' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <strong>Transfer Certificate Effect:</strong> Approving this TC will create a synchronized record in the CBSE Transfer Register and mark <strong>{cert.recipient_name}</strong> as <strong>Transferred</strong>.
              </div>
            )}
          </div>

          {/* Decision Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Approval / Rejection / Revocation Action
            </h2>

            {!canApprove ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Signed in as <strong>{user?.role}</strong>. Principal or Campus Admin sign-off is required to approve, issue, reject, or revoke certificates.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Principal / Approver Remarks (Required for Reject / Revoke)
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter verification note, fee clearance confirmation, or reason for rejection/revocation..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {cert.status !== 'issued' && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAction('approve_issue')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve &amp; Issue Certificate (Print Ready)
                    </button>
                  )}

                  {cert.status === 'pending_approval' && (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleAction('approve')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        Approve Only (Hold for Printing)
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleAction('reject')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Request
                      </button>
                    </>
                  )}

                  {(cert.status === 'approved' || cert.status === 'issued') && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAction('revoke')}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Revoke &amp; Void Certificate
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Full Inspection Preview */}
        <div className="xl:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 overflow-x-auto">
            <CertificateA4Sheet certificate={cert} branch={selectedBranch} compact />
          </div>
        </div>
      </div>
    </div>
  );
};
