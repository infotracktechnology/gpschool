import React from 'react';
import { Building2, CalendarRange } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Reusable Branch & Academic Year Scope strip for Create / Edit pages.
 * When Topbar is set to "All Campuses" (id === 'all'), displays a concrete Branch picker.
 */
export const BranchScopePicker = ({
  branchId,
  onBranchChange,
  academicYearName = '',
  required = true,
  className = '',
}) => {
  const { user, branches, selectedBranch, selectedAcademicYear } = useAuth();
  const isSuperAll = user?.role === 'super_admin' && selectedBranch?.id === 'all';
  const displayBranchName =
    branches.find((b) => String(b.id) === String(branchId))?.name ||
    (selectedBranch?.id !== 'all' ? selectedBranch?.name : '') ||
    'Select Campus Branch';
  const displayAy = academicYearName || selectedAcademicYear?.name || selectedAcademicYear?.code || 'Current Session';

  if (isSuperAll && typeof onBranchChange === 'function') {
    return (
      <div className={`p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-amber-900">
          <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Topbar is in <strong>All Campuses</strong> mode. Choose target campus branch for this record:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            required={required}
            value={branchId || ''}
            onChange={(e) => onBranchChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-white text-slate-800"
          >
            <option value="">-- Select Campus Branch --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-amber-200 text-amber-900 whitespace-nowrap">
            <CalendarRange className="w-3.5 h-3.5" />
            {displayAy}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-600 ${className}`}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium text-slate-700">
        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
        Campus: <strong className="text-slate-900">{displayBranchName}</strong>
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium text-slate-700">
        <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
        Session: <strong className="text-slate-900">{displayAy}</strong>
      </span>
    </div>
  );
};
