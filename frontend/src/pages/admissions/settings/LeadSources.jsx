import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Share2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { api } from '../../../api/client';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export const LeadSources = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admissions/settings/lead-sources');
      const list = res.leadSources || res.sources || res.data || [];
      setSources(list);
    } catch (err) {
      console.error('Failed to fetch lead sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleOpenAdd = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      description: '',
      status: 'active',
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingSource(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      status: item.status || 'active',
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingSource) {
        await api.put(`/admissions/settings/lead-sources/${editingSource.id}`, formData);
        setMessage({ type: 'success', text: 'Lead source updated successfully.' });
      } else {
        await api.post('/admissions/settings/lead-sources', formData);
        setMessage({ type: 'success', text: 'Lead source created successfully.' });
      }
      setIsModalOpen(false);
      fetchSources();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete lead source "${name}"?`)) return;
    try {
      await api.delete(`/admissions/settings/lead-sources/${id}`);
      setMessage({ type: 'success', text: `Lead source "${name}" removed.` });
      fetchSources();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete lead source.' });
    }
  };

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Share2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Lead Sources Master</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Manage inquiry attribution channels (Walk-in, Website, Social Media, Referrals, Ads).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead Source</span>
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

      {/* Filter / Search Bar */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-card flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead sources by name or description..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div className="text-xs text-muted font-medium">
          Total Sources: <span className="font-bold text-heading">{sources.length}</span>
        </div>
      </div>

      {/* Lead Sources Table */}
      <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
              <th className="py-3.5 px-6">Channel / Source Name</th>
              <th className="py-3.5 px-6">Description</th>
              <th className="py-3.5 px-6 text-center">Status</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="4" className="py-12 text-center text-muted">
                  Loading lead sources...
                </td>
              </tr>
            ) : filteredSources.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-12 text-center text-muted">
                  No lead sources found. Click "Add Lead Source" to define one.
                </td>
              </tr>
            ) : (
              filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-heading flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span>{source.name}</span>
                  </td>
                  <td className="py-4 px-6 text-muted max-w-md truncate">
                    {source.description || '—'}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Badge variant={source.status === 'active' ? 'active' : 'inactive'}>
                      {source.status || 'active'}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(source)}
                      className="p-1.5 text-muted hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                      title="Edit source"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id, source.name)}
                      className="p-1.5 text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSource ? 'Edit Lead Source' : 'New Lead Source'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Source Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Walk-in, Website Inquiry, Instagram Ad"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional notes regarding campaign or lead capture protocol..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSource ? 'Update Source' : 'Create Source'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
