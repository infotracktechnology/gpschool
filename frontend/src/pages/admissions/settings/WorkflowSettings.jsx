import React, { useState, useEffect, useCallback } from 'react';
import {
  GitFork,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  ArrowRight,
  Zap,
  UserCheck,
  FileText,
  UserPlus,
  Compass,
} from 'lucide-react';
import { api } from '../../../api/client';
import { Badge } from '../../../components/common/Badge';

export const WorkflowSettings = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [config, setConfig] = useState({
    enable_enquiry: true,
    enable_application: true,
    allow_direct_enquiry_to_admission: true,
    allow_direct_walkin_admission: true,
  });

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/settings/branches');
        const list = res.branches || res.data || [];
        setBranches(list);
        if (list.length > 0) {
          setSelectedBranchId(String(list[0].id));
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  // Fetch branch workflow configuration
  const fetchWorkflow = useCallback(async (branchId) => {
    if (!branchId) return;
    try {
      const res = await api.get(`/admissions/settings/workflow/${branchId}`);
      const data = res.workflow || res.data || res;
      if (data && typeof data.enable_enquiry !== 'undefined') {
        setConfig({
          enable_enquiry: Boolean(data.enable_enquiry),
          enable_application: Boolean(data.enable_application),
          allow_direct_enquiry_to_admission: Boolean(data.allow_direct_enquiry_to_admission),
          allow_direct_walkin_admission: Boolean(data.allow_direct_walkin_admission),
        });
      } else {
        // Default values
        setConfig({
          enable_enquiry: true,
          enable_application: true,
          allow_direct_enquiry_to_admission: true,
          allow_direct_walkin_admission: true,
        });
      }
    } catch (err) {
      // If not yet configured for this branch, use defaults
      setConfig({
        enable_enquiry: true,
        enable_application: true,
        allow_direct_enquiry_to_admission: true,
        allow_direct_walkin_admission: true,
      });
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchWorkflow(selectedBranchId);
      setMessage(null);
    }
  }, [selectedBranchId, fetchWorkflow]);

  const handleToggle = (key) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/admissions/settings/workflow/${selectedBranchId}`, config);
      setMessage({ type: 'success', text: 'Branch admission workflow settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update workflow settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Determine active workflow modes description
  const getWorkflowModeDescription = () => {
    if (config.enable_enquiry && config.enable_application && config.allow_direct_enquiry_to_admission) {
      return 'Hybrid Agile Mode: Standard 3-stage funnel with fast-track bypass & direct walk-in supported.';
    }
    if (config.enable_enquiry && config.enable_application && !config.allow_direct_enquiry_to_admission) {
      return 'Strict 3-Stage Process: Every student must pass through Enquiry and Application approval.';
    }
    if (!config.enable_enquiry && config.enable_application) {
      return 'Direct Application Mode: Starts at application form submission; enquiries disabled.';
    }
    if (config.enable_enquiry && !config.enable_application) {
      return 'Fast-Track Only Mode: Enquiry leads convert directly to admission without application paperwork.';
    }
    if (!config.enable_enquiry && !config.enable_application) {
      return 'Direct Walk-in Exclusive: All admissions are registered directly at the enrollment counter.';
    }
    return 'Custom Branch Admission Pipeline Configuration';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <GitFork className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Admission Workflow Pipeline</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Configure stage gates, fast-track bypasses, and walk-in policies per campus branch.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-border rounded-xl shadow-sm">
            <Building2 className="w-4 h-4 text-brand-600" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-sm font-medium text-heading bg-transparent outline-none cursor-pointer pr-2"
              disabled={loading || branches.length === 0}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !selectedBranchId}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Pipeline'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Mode Indicator Banner */}
      <div className="bg-gradient-to-r from-brand-50 to-slate-50 border border-brand-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-3 bg-white rounded-xl shadow-xs text-brand-600">
          <Compass className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-heading">Active Pipeline Topology</h3>
            <Badge variant="primary">Dynamic Engine</Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1">{getWorkflowModeDescription()}</p>
        </div>
      </div>

      {/* Visual Pipeline Interactive Diagram */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-card">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Live Flow Visualizer
        </h3>

        <div className="relative py-8 px-4 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
          {/* Stage A: Enquiry */}
          <div
            className={`relative flex-1 w-full rounded-2xl p-5 border-2 transition-all ${
              config.enable_enquiry
                ? 'border-brand-500 bg-brand-50/40 shadow-md ring-4 ring-brand-50'
                : 'border-dashed border-slate-300 bg-slate-50/60 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`p-2 rounded-xl text-xs font-bold ${
                  config.enable_enquiry
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                Stage A
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  config.enable_enquiry
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.enable_enquiry ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserPlus
                className={`w-5 h-5 ${config.enable_enquiry ? 'text-brand-600' : 'text-slate-400'}`}
              />
              <h4 className="font-bold text-heading text-base">Enquiries</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Walk-in & digital inquiry tracking, communication logs, and follow-up timeline alerts.
            </p>
          </div>

          {/* Normal Connector 1 */}
          <div className="hidden md:flex flex-col items-center justify-center px-2">
            <ArrowRight
              className={`w-6 h-6 transition-colors ${
                config.enable_enquiry && config.enable_application
                  ? 'text-brand-600'
                  : 'text-slate-300'
              }`}
            />
            <span className="text-[10px] font-medium text-slate-400 mt-1">Convert</span>
          </div>

          {/* Stage B: Application */}
          <div
            className={`relative flex-1 w-full rounded-2xl p-5 border-2 transition-all ${
              config.enable_application
                ? 'border-indigo-500 bg-indigo-50/40 shadow-md ring-4 ring-indigo-50'
                : 'border-dashed border-slate-300 bg-slate-50/60 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`p-2 rounded-xl text-xs font-bold ${
                  config.enable_application
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                Stage B
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  config.enable_application
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.enable_application ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText
                className={`w-5 h-5 ${
                  config.enable_application ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <h4 className="font-bold text-heading text-base">Applications</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Formal candidate dossier, parent info, previous school records, verification & approval.
            </p>
          </div>

          {/* Normal Connector 2 */}
          <div className="hidden md:flex flex-col items-center justify-center px-2">
            <ArrowRight
              className={`w-6 h-6 transition-colors ${
                config.enable_application ? 'text-indigo-600' : 'text-slate-300'
              }`}
            />
            <span className="text-[10px] font-medium text-slate-400 mt-1">Enroll</span>
          </div>

          {/* Stage C: Confirmed Admission */}
          <div className="relative flex-1 w-full rounded-2xl p-5 border-2 border-emerald-500 bg-emerald-50/40 shadow-md ring-4 ring-emerald-50">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs">
                Stage C
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Core (Always Active)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-heading text-base">Admissions</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Official student registration, section seat quota validation, and admission number issuance.
            </p>
          </div>
        </div>

        {/* Bypass Badges Below Diagram */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              config.allow_direct_enquiry_to_admission && config.enable_enquiry
                ? 'bg-amber-50 text-amber-800 border-amber-200 font-medium'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {config.allow_direct_enquiry_to_admission && config.enable_enquiry
                ? '⚡ Fast-Track Enabled: Enquiry → Direct Admission'
                : 'Fast-Track Bypassing Disabled'}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              config.allow_direct_walkin_admission
                ? 'bg-blue-50 text-blue-800 border-blue-200 font-medium'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {config.allow_direct_walkin_admission
                ? 'Direct Walk-in Admission Allowed'
                : 'Direct Walk-in Restricted'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Switches Panel */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-6">
        <h3 className="font-bold text-heading text-base">Pipeline Stage Gates & Feature Switches</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Switch 1: Enable Enquiry Stage */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-brand-200 transition-colors">
            <div className="pr-4">
              <label htmlFor="enable_enquiry" className="font-semibold text-heading text-sm block cursor-pointer">
                Enable Enquiry Stage
              </label>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Activate the enquiry register and follow-up timeline to capture prospect interest before
                issuing full admission application forms.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enable_enquiry}
              onClick={() => handleToggle('enable_enquiry')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.enable_enquiry ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.enable_enquiry ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Switch 2: Enable Application Stage */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-brand-200 transition-colors">
            <div className="pr-4">
              <label htmlFor="enable_application" className="font-semibold text-heading text-sm block cursor-pointer">
                Enable Application Stage
              </label>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Require parents to fill comprehensive application dossiers (guardian profiles, previous school,
                documents) prior to admission seat confirmation.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enable_application}
              onClick={() => handleToggle('enable_application')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.enable_application ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.enable_application ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Switch 3: Fast-track direct enquiry to admission */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-brand-200 transition-colors">
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <label htmlFor="allow_direct_enquiry_to_admission" className="font-semibold text-heading text-sm block cursor-pointer">
                  Allow Direct Enquiry → Admission (Fast-Track)
                </label>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                  Shortcut
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Allow admission counselors to skip creating a separate application and confirm enrollment
                directly from an open enquiry record.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.allow_direct_enquiry_to_admission}
              onClick={() => handleToggle('allow_direct_enquiry_to_admission')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.allow_direct_enquiry_to_admission ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.allow_direct_enquiry_to_admission ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Switch 4: Allow direct walkin admission */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-border hover:border-brand-200 transition-colors">
            <div className="pr-4">
              <label htmlFor="allow_direct_walkin_admission" className="font-semibold text-heading text-sm block cursor-pointer">
                Allow Direct Walk-in Admission
              </label>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Enable instant desk enrollment without creating an enquiry or application record first
                (ideal for express transfer admissions).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.allow_direct_walkin_admission}
              onClick={() => handleToggle('allow_direct_walkin_admission')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.allow_direct_walkin_admission ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.allow_direct_walkin_admission ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Explanatory Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-800">How workflow settings affect user navigation:</p>
            <p>
              When an admission stage (such as Enquiries or Applications) is disabled for a branch, the
              corresponding navigation links and action buttons are automatically suppressed or redirected to
              ensure a frictionless workflow for campus staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
