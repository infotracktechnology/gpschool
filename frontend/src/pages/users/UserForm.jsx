import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft, Save, AlertCircle, Shield, Key } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    branch_id: '',
    phone: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const branchesRes = await api.get('/settings/branches?status=active');
        setBranches(branchesRes.branches || []);

        if (isEdit) {
          const userRes = await api.get('/users');
          const targetUser = userRes.users?.find((u) => String(u.id) === String(id));
          if (!targetUser) {
            setError('User not found');
            return;
          }
          setFormData({
            name: targetUser.name,
            email: targetUser.email,
            password: '', // Blank unless resetting
            role: targetUser.role,
            branch_id: targetUser.branch_id || '',
            phone: targetUser.phone || '',
            status: targetUser.status,
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize form');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEdit) {
        await api.put(`/users/${id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      navigate('/users');
    } catch (err) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        Loading user details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to="/users"
          className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-heading hover:bg-slate-50 transition-colors"
          title="Back to Users"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/users" className="hover:text-brand-600">
              Users
            </Link>
            <span>/</span>
            <span className="text-heading font-medium">{isEdit ? 'Edit User' : 'New User'}</span>
          </div>
          <h1 className="text-xl font-bold text-heading mt-0.5">
            {isEdit ? `Edit User: ${formData.name || ''}` : 'Create New User / Admin'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-heading mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            Account Details & Access Role
          </h2>
          <p className="text-xs text-muted">
            Configure identity, role privileges, and assigned campus branch
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">Email Address *</label>
            <input
              type="email"
              required
              disabled={isEdit}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@school.com"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-heading mb-1.5">
            {isEdit ? 'Reset Password (leave empty to keep existing password)' : 'Password *'}
          </label>
          <input
            type="password"
            required={!isEdit}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={isEdit ? '••••••••' : 'Enter secure password'}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium capitalize"
            >
              {currentUser?.role === 'super_admin' && (
                <option value="super_admin">Super Admin (All Campuses)</option>
              )}
              <option value="admin">Admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Assigned Campus Branch
            </label>
            <select
              disabled={formData.role === 'super_admin'}
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50 font-medium"
            >
              <option value="">
                {formData.role === 'super_admin' ? 'Global (All Campuses)' : 'Select Campus'}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="9876543210"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          <Link
            to="/users"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
