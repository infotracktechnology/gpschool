import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Star, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';

export const AcademicYears = () => {
  const { refreshUser } = useAuth();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    is_current: false,
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchYears = async () => {
    try {
      const data = await api.get('/settings/academic-years');
      setYears(data.academicYears || []);
    } catch (err) {
      console.error('Failed to load academic years:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const handleOpenAdd = () => {
    setEditingYear(null);
    setFormData({
      code: '',
      name: '',
      is_current: false,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (y) => {
    setEditingYear(y);
    setFormData({
      code: y.code,
      name: y.name,
      is_current: Boolean(y.is_current),
      status: y.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingYear) {
        await api.put(`/settings/academic-years/${editingYear.id}`, formData);
        setMessage({ type: 'success', text: 'Academic Year updated successfully!' });
      } else {
        await api.post('/settings/academic-years', formData);
        setMessage({ type: 'success', text: 'New Academic Year added successfully!' });
      }
      setIsModalOpen(false);
      fetchYears();
      refreshUser();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrent = async (year) => {
    try {
      const res = await api.patch(`/settings/academic-years/${year.id}/set-current`);
      setMessage({ type: 'success', text: res.message });
      fetchYears();
      refreshUser();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to set active year' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this academic year?')) return;
    try {
      await api.delete(`/settings/academic-years/${id}`);
      setMessage({ type: 'success', text: 'Academic Year deleted successfully!' });
      fetchYears();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete academic year' });
    }
  };

  const filteredYears = years.filter(
    (y) =>
      y.code.toLowerCase().includes(search.toLowerCase()) ||
      y.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-brand-600" />
            Academic Years
          </h1>
          <p className="text-xs text-muted mt-1">
            Define global institutional academic years. Set the single active current year used
            across all branches.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Academic Year
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search academic years..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <span className="text-xs text-muted">{filteredYears.length} Years</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border text-muted font-semibold">
                <th className="py-3 px-4">Academic Year Code</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-4">Active Current Year</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">
                    Loading academic years...
                  </td>
                </tr>
              ) : filteredYears.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">
                    No academic years found.
                  </td>
                </tr>
              ) : (
                filteredYears.map((y) => (
                  <tr key={y.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-heading">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {y.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-heading">{y.name}</td>
                    <td className="py-3 px-4">
                      {y.is_current ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
                          Current Active
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCurrent(y)}
                          className="text-xs text-muted hover:text-brand-600 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Set as Current
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={y.status}>{y.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(y)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Year"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(y.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Year"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Academic Year Code (e.g. 2025-2026) *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="2025-2026"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Display Label *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Academic Year 2025-2026"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_current"
              checked={formData.is_current}
              onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-border"
            />
            <label htmlFor="is_current" className="text-xs font-medium text-heading">
              Set as the Global Active Academic Year
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingYear ? 'Update Year' : 'Create Year'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
