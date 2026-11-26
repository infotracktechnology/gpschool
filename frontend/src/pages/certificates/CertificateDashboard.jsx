import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  FileText,
  FileCheck2,
  ClipboardCheck,
  History,
  LayoutTemplate,
  Plus,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckCircle2,
  Printer,
  Edit,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_MAP,
  STATUS_META,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

export const CertificateDashboard = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      total_records: 0,
      total_issued: 0,
      total_approved: 0,
      pending_approvals: 0,
      rejected_count: 0,
      revoked_count: 0,
      issued_today: 0,
      total_reprints: 0,
      active_templates: 0,
      total_templates: 0,
    },
    byType: {},
    pendingList: [],
    recentIssued: [],
  });

  useEffect(() => {
    fetchDashboard();
  }, [selectedBranch?.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const query = selectedBranch?.id ? `?branch_id=${selectedBranch.id}` : '';
      const res = await api.get(`/certificates/dashboard${query}`);
      if (res.success) {
        setData({
          summary: res.summary || {},
          byType: res.byType || {},
          pendingList: res.pendingList || [],
          recentIssued: res.recentIssued || [],
        });
      }
    } catch (err) {
      console.error('Error loading certificate dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const { summary, byType, pendingList, recentIssued } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Certificate Management &amp; Official Registry</h1>
              {selectedBranch?.name && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedBranch.name}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Design reusable CBSE templates, generate student &amp; staff certificates, manage approval workflows, and print verified A4 documents.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/certificates/templates')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 transition"
          >
            <LayoutTemplate className="w-4 h-4 text-indigo-600" />
            Template Designer
          </button>
          <button
            onClick={() => navigate('/certificates/approvals')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
          >
            <ClipboardCheck className="w-4 h-4" />
            Approvals ({summary.pending_approvals})
          </button>
          <button
            onClick={() => navigate('/certificates/bonafide/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Issue Certificate
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Issued Certificates</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.total_issued}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.issued_today} issued today</div>
        </div>

        <div
          onClick={() => navigate('/certificates/approvals')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs hover:border-amber-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">{summary.pending_approvals}</div>
          <div className="text-xs text-amber-600 mt-1">Click to review queue</div>
        </div>

        <div
          onClick={() => navigate('/certificates/templates')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Templates</span>
            <LayoutTemplate className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.active_templates}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.total_templates} total configured</div>
        </div>

        <div
          onClick={() => navigate('/certificates/history')}
          className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Print Logs</span>
            <Printer className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.total_reprints}</div>
          <div className="text-xs text-slate-500 mt-1">Total copies printed</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected / Revoked</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {Number(summary.rejected_count || 0) + Number(summary.revoked_count || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.rejected_count} rejected • {summary.revoked_count} revoked
          </div>
        </div>
      </div>

      {/* 6 Certificate Workspaces */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Certificate Categories &amp; Direct Generators</h2>
            <p className="text-xs text-slate-500">Open any dedicated register or jump directly into generating a new certificate.</p>
          </div>
          <button
            onClick={() => navigate('/certificates/history')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <History className="w-3.5 h-3.5" />
            Full Issue History
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CERTIFICATE_TYPES.map((typeItem) => {
            const stats = byType[typeItem.value] || { total: 0, pending: 0, issued: 0 };
            return (
              <div
                key={typeItem.value}
                className="flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-indigo-200 transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      {typeItem.label}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-white border border-slate-200 text-slate-600">
                      {typeItem.codePrefix}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{typeItem.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-slate-600">
                      Total: <strong className="text-slate-900">{stats.total}</strong>
                    </span>
                    <span className="text-emerald-700">
                      Issued: <strong>{stats.issued}</strong>
                    </span>
                    {stats.pending > 0 && (
                      <span className="text-amber-700 font-semibold">{stats.pending} pending</span>
                    )}
                    {typeItem.supportsStaff && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        Student + Staff
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/70">
                  <button
                    onClick={() => navigate(typeItem.routePath)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Open Register
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(`${typeItem.routePath}/new`)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Activity Split: Pending Approval Queue & Recent Register */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approval Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Pending Approval Queue</h3>
            </div>
            <button
              onClick={() => navigate('/certificates/approvals')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View All
            </button>
          </div>

          {pendingList.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
              <Sparkles className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              No certificate requests waiting for approval right now.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingList.map((item) => {
                const tMeta = CERTIFICATE_TYPE_MAP[item.certificate_type] || {};
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.certificate_no}</span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {tMeta.shortLabel || item.certificate_type}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                        {item.recipient_name}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          ({item.class_or_dept || item.ref_no || item.recipient_type})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Requested {formatDisplayDate(item.created_at)}
                        {item.requested_by_name ? ` by ${item.requested_by_name}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/certificates/approvals/${item.id}`)}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Certificates Issued / Updated */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Certificates &amp; History</h3>
            </div>
            <button
              onClick={() => navigate('/certificates/history')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Open Registry
            </button>
          </div>

          {recentIssued.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl">
              No certificates generated yet. Start by issuing a Bonafide, TC, or Study Certificate.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentIssued.map((item) => {
                const stMeta = STATUS_META[item.status] || STATUS_META.issued;
                const tMeta = CERTIFICATE_TYPE_MAP[item.certificate_type] || {};
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.certificate_no}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${stMeta.badgeClass}`}>
                          {stMeta.label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {tMeta.shortLabel || item.certificate_type}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                        {item.recipient_name}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          • {item.class_or_dept || 'General'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Issue Date: {formatDisplayDate(item.issue_date)} • Reprints: {item.reprint_count || 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/certificates/edit/${item.id}`)}
                        title="Edit Certificate"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/certificates/view/${item.id}/print`)}
                        title="View & Print A4"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
