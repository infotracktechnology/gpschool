import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Award, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchBoards = async () => {
    try {
      const data = await api.get('/settings/boards');
      setBoards(data.boards || []);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleOpenAdd = () => {
    setEditingBoard(null);
    setFormData({ code: '', name: '', description: '', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBoard(b);
    setFormData({
      code: b.code,
      name: b.name,
      description: b.description || '',
      status: b.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingBoard) {
        await api.put(`/settings/boards/${editingBoard.id}`, formData);
        setMessage({ type: 'success', text: 'Education Board updated successfully!' });
      } else {
        await api.post('/settings/boards', formData);
        setMessage({ type: 'success', text: 'New Education Board added successfully!' });
      }
      setIsModalOpen(false);
      fetchBoards();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return;
    try {
      await api.delete(`/settings/boards/${id}`);
      setMessage({ type: 'success', text: 'Board deleted successfully!' });
      fetchBoards();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete board' });
    }
  };

  const filteredBoards = boards.filter(
    (b) =>
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <Award className="w-6 h-6 text-brand-600" />
            Education Boards
          </h1>
          <p className="text-xs text-muted mt-1">
            Configure national and regional curriculum education boards (CBSE, ICSE, State, etc.)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Education Board
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
        {/* Search header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search boards by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <span className="text-xs text-muted">{filteredBoards.length} Boards</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border text-muted font-semibold">
                <th className="py-3 px-4">Board Code</th>
                <th className="py-3 px-4">Full Board Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">
                    Loading boards...
                  </td>
                </tr>
              ) : filteredBoards.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-muted">
                    No education boards found.
                  </td>
                </tr>
              ) : (
                filteredBoards.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-heading">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {b.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-heading">{b.name}</td>
                    <td className="py-3 px-4 text-muted max-w-xs truncate">
                      {b.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={b.status}>{b.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Board"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Board"
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
        title={editingBoard ? 'Edit Education Board' : 'Add New Education Board'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Board Code (e.g. CBSE, ICSE, MATRIC) *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="CBSE"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Full Board Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Central Board of Secondary Education"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">Description</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Board curriculum details or jurisdiction..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
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
              {submitting ? 'Saving...' : editingBoard ? 'Update Board' : 'Create Board'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
