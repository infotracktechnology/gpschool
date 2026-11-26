import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PageHeader = ({ title, subtitle, badge, actions, onBack }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={() => (onBack === -1 ? navigate(-1) : navigate(onBack))}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60">
                {badge}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
};

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  partial_received: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  inspected: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  discontinued: 'bg-rose-50 text-rose-700 border-rose-200',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
  low_stock: 'bg-amber-50 text-amber-700 border-amber-200',
  out_of_stock: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const StatusBadge = ({ status, label }) => {
  const key = String(status || '').toLowerCase();
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}>
      {label || String(status || '').replace(/_/g, ' ')}
    </span>
  );
};

export const EmptyState = ({ icon: Icon, message = 'No records found' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
    {Icon && <Icon className="w-10 h-10 mb-3 opacity-50" />}
    <p className="text-sm">{message}</p>
  </div>
);

export const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
  </div>
);

export const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-white';

export const btnPrimary =
  'px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50';

export const btnSecondary =
  'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors';

export const btnDanger =
  'px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors';

export const cardCls = 'bg-white rounded-2xl border border-slate-200/80 shadow-xs';

export const fmtMoney = (v) => {
  const n = Number(v) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(String(d).slice(0, 10));
  if (isNaN(dt)) return String(d).slice(0, 10);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
