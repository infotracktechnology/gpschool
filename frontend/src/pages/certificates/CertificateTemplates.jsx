import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Plus,
  Search,
  Copy,
  Edit,
  Trash2,
  Star,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client';
import { CERTIFICATE_TYPES, CERTIFICATE_TYPE_MAP, BORDER_STYLES, COLOR_THEMES } from '../../utils/certificateRenderer';

export const CertificateTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [typeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('certificate_type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/certificates/templates?${params.toString()}`);
      if (res.success) setTemplates(res.templates || []);
    } catch (err) {
      console.error('Error loading certificate templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (tpl) => {
    try {
      const res = await api.post(`/certificates/templates/${tpl.id}/duplicate`, {});
      if (res.success) {
        setStatusMsg(`Duplicated "${tpl.name}" as "${res.template.name}"`);
        fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to duplicate template');
    }
  };

  const handleSetDefault = async (tpl) => {
    try {
      const res = await api.put(`/certificates/templates/${tpl.id}`, {
        ...tpl,
        is_default: 1,
      });
      if (res.success) {
        setStatusMsg(`"${tpl.name}" marked as default for ${CERTIFICATE_TYPE_MAP[tpl.certificate_type]?.label || tpl.certificate_type}`);
        fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to set default template');
    }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`Delete certificate template "${tpl.name}" (${tpl.code})? Previously issued certificates keep their immutable snapshot.`)) {
      return;
    }
    try {
      const res = await api.delete(`/certificates/templates/${tpl.id}`);
      if (res.success) {
        setStatusMsg(res.message);
        fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(t.name || '').toLowerCase().includes(q) ||
      String(t.code || '').toLowerCase().includes(q) ||
      String(t.title_heading || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/certificates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-indigo-600" />
              Certificate Template Designer Library
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Customize placeholders, CBSE letterheads, ceremonial borders, color themes, and signatory layouts.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/certificates/templates/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>

      {statusMsg && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {statusMsg}
          </span>
          <button onClick={() => setStatusMsg('')} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              typeFilter === ''
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {CERTIFICATE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                typeFilter === t.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.shortLabel}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by template code, name, or heading..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          Loading templates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">No certificate templates matched your filter.</p>
          <button
            onClick={() => navigate('/certificates/templates/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Design First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const typeMeta = CERTIFICATE_TYPE_MAP[tpl.certificate_type] || {};
            const borderLabel = BORDER_STYLES.find((b) => b.value === tpl.border_style)?.label || tpl.border_style;
            const themeObj = COLOR_THEMES.find((c) => c.value === tpl.color_theme) || COLOR_THEMES[0];
            return (
              <div
                key={tpl.id}
                className="flex flex-col justify-between bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {tpl.code}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700">
                          {typeMeta.shortLabel || tpl.certificate_type}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-50 border border-slate-200 text-slate-600">
                          {tpl.recipient_scope}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{tpl.name}</h3>
                    </div>
                    {Number(tpl.is_default) === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {tpl.title_heading}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">
                      {tpl.body_template}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeObj.primary }} />
                      {themeObj.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {borderLabel}
                    </span>
                    <span className="ml-auto font-medium text-slate-600">
                      Used: {tpl.usage_count || 0}x
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`${typeMeta.routePath || '/certificates/bonafide'}/new?templateId=${tpl.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Use
                  </button>
                  <button
                    onClick={() => navigate(`/certificates/templates/${tpl.id}/edit`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    title="Edit Template"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="Duplicate Template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {Number(tpl.is_default) !== 1 && (
                    <button
                      onClick={() => handleSetDefault(tpl)}
                      className="p-1.5 rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50"
                      title="Set as Default"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
