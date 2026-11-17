import React, { useState, useEffect, useCallback } from 'react';
import {
  Hash,
  Building2,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../../../api/client';
import { Badge } from '../../../components/common/Badge';

export const NumberSeriesSettings = () => {
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Default series structures for Enquiry, Application, Admission
  const [seriesData, setSeriesData] = useState({
    enquiry: {
      prefix: 'ENQ/',
      include_year: true,
      current_number: 1,
      padding_digits: 4,
    },
    application: {
      prefix: 'APP/',
      include_year: true,
      current_number: 1,
      padding_digits: 4,
    },
    admission: {
      prefix: 'ADM/',
      include_year: true,
      current_number: 1,
      padding_digits: 4,
    },
  });

  // Load branches and academic years
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, yearRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/settings/academic-years'),
        ]);

        const branchList = branchRes.branches || branchRes.data || [];
        const yearList = yearRes.academicYears || yearRes.data || [];

        setBranches(branchList);
        setAcademicYears(yearList);

        if (branchList.length > 0) setSelectedBranchId(String(branchList[0].id));
        if (yearList.length > 0) {
          const activeYear = yearList.find((y) => y.status === 'active') || yearList[0];
          setSelectedAcademicYearId(String(activeYear.id));
        }
      } catch (err) {
        console.error('Failed to load lookup data:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchLookups();
  }, []);

  // Fetch existing series configuration
  const fetchSeries = useCallback(async () => {
    if (!selectedBranchId || !selectedAcademicYearId) return;
    try {
      const res = await api.get(
        `/admissions/settings/series?branch_id=${selectedBranchId}&academic_year_id=${selectedAcademicYearId}`
      );
      const list = res.series || res.data || [];

      const updated = { ...seriesData };
      list.forEach((item) => {
        if (updated[item.series_type]) {
          updated[item.series_type] = {
            prefix: item.prefix || '',
            include_year: Boolean(item.include_year),
            current_number: Number(item.current_number) || 1,
            padding_digits: Number(item.padding_digits) || 4,
            id: item.id,
          };
        }
      });
      setSeriesData(updated);
    } catch (err) {
      // Use defaults if not yet persisted
    }
  }, [selectedBranchId, selectedAcademicYearId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleChange = (type, field, value) => {
    setSeriesData((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  // Find selected academic year label (e.g. "2025-2026" -> "2025-26/")
  const getYearPrefix = () => {
    const yearObj = academicYears.find((y) => String(y.id) === String(selectedAcademicYearId));
    if (!yearObj || !yearObj.name) return '2025-26/';
    const parts = yearObj.name.split('-');
    if (parts.length === 2 && parts[1].length === 4) {
      return `${parts[0]}-${parts[1].slice(2)}/`;
    }
    return `${yearObj.name}/`;
  };

  // Generate live preview string
  const generatePreview = (type) => {
    const s = seriesData[type];
    const padded = String(s.current_number || 1).padStart(s.padding_digits || 4, '0');
    const yearPart = s.include_year ? getYearPrefix() : '';
    return `${s.prefix || ''}${yearPart}${padded}`;
  };

  const handleSave = async () => {
    if (!selectedBranchId || !selectedAcademicYearId) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        branch_id: Number(selectedBranchId),
        academic_year_id: Number(selectedAcademicYearId),
        series: [
          { series_type: 'enquiry', ...seriesData.enquiry },
          { series_type: 'application', ...seriesData.application },
          { series_type: 'admission', ...seriesData.admission },
        ],
      };

      await api.post('/admissions/settings/series', payload);
      setMessage({ type: 'success', text: 'Number sequence configurations saved successfully!' });
      fetchSeries();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save number sequence settings.' });
    } finally {
      setSaving(false);
    }
  };

  const seriesMeta = [
    {
      key: 'enquiry',
      title: 'Enquiry Number Sequence',
      subtitle: 'Issued upon registering student enquiries at front desk or web portal',
      color: 'border-brand-200 bg-brand-50/20',
      badge: 'ENQ Sequence',
    },
    {
      key: 'application',
      title: 'Application Number Sequence',
      subtitle: 'Assigned to admission application forms upon official submission',
      color: 'border-indigo-200 bg-indigo-50/20',
      badge: 'APP Sequence',
    },
    {
      key: 'admission',
      title: 'Admission Number Sequence',
      subtitle: 'Permanent student enrollment identifier assigned upon class allotment',
      color: 'border-emerald-200 bg-emerald-50/20',
      badge: 'ADM Sequence',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Hash className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Admission Number Sequences</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Configure automated numbering prefixes, academic year embeds, and counters for each stage.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedBranchId || !selectedAcademicYearId}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Sequences'}</span>
        </button>
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

      {/* Selectors Bar */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-4">
        {/* Branch Selector */}
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Campus Branch
          </label>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
            <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
              disabled={loadingLookups}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Academic Year Selector */}
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Academic Session
          </label>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 border border-border rounded-xl">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="w-full text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
              disabled={loadingLookups}
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === 'active' ? '(Current Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3 Number Sequence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {seriesMeta.map((meta) => {
          const item = seriesData[meta.key];
          const previewVal = generatePreview(meta.key);

          return (
            <div
              key={meta.key}
              className={`bg-white border rounded-2xl p-6 shadow-card flex flex-col justify-between ${meta.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="primary">{meta.badge}</Badge>
                </div>
                <h3 className="font-bold text-heading text-lg">{meta.title}</h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">{meta.subtitle}</p>

                {/* Live Preview Pill */}
                <div className="mt-5 p-3.5 bg-slate-900 rounded-xl text-white">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Live Sample Format</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="font-mono text-base font-semibold text-emerald-400 tracking-wider">
                    {previewVal}
                  </div>
                </div>

                {/* Form Controls */}
                <div className="mt-5 space-y-4">
                  {/* Prefix */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prefix String
                    </label>
                    <input
                      type="text"
                      value={item.prefix}
                      onChange={(e) => handleChange(meta.key, 'prefix', e.target.value)}
                      placeholder="e.g. ENQ/"
                      className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  {/* Include Year Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">
                        Include Academic Year
                      </span>
                      <span className="text-[11px] text-muted">
                        Appends session e.g. <span className="font-mono">{getYearPrefix()}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.include_year}
                      onClick={() => handleChange(meta.key, 'include_year', !item.include_year)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        item.include_year ? 'bg-brand-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.include_year ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Start Number / Next Counter */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Next Counter
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.current_number}
                        onChange={(e) =>
                          handleChange(meta.key, 'current_number', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Zero Padding
                      </label>
                      <select
                        value={item.padding_digits}
                        onChange={(e) =>
                          handleChange(meta.key, 'padding_digits', parseInt(e.target.value) || 4)
                        }
                        className="w-full px-3 py-2 text-sm bg-white border border-border rounded-xl font-mono focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                      >
                        <option value="3">3 digits (001)</option>
                        <option value="4">4 digits (0001)</option>
                        <option value="5">5 digits (00001)</option>
                        <option value="6">6 digits (000001)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800">Concurrency & Auto-Increment Guarantees:</p>
          <p>
            When staff members submit enquiries, applications, or confirmed admissions simultaneously, the
            backend atomic sequence generator locks the series row, allocates the strictly sequential number, and
            guarantees zero collisions or duplicate IDs across all campuses.
          </p>
        </div>
      </div>
    </div>
  );
};
