import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Users as UsersIcon,
  Search,
  CheckCircle,
  AlertCircle,
  Shield,
  Building2,
  Phone,
  Mail,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const UserList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [message, setMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      fetchUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.branch_name && u.branch_name.toLowerCase().includes(search.toLowerCase()));
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <UsersIcon className="w-6 h-6 text-brand-600" />
            User Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage administrative staff, campus administrators, principals, and teachers with
            role-based permissions
          </p>
        </div>
        <Link
          to="/users/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create User / Admin
        </Link>
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
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <span className="text-xs text-muted font-medium">{filteredUsers.length} Users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border text-muted font-semibold">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-muted">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-muted">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-heading">{u.name}</p>
                          <p className="text-[11px] text-muted flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          u.role === 'super_admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'admin'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : u.role === 'principal'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.branch_name ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted" />
                          {u.branch_name}
                        </span>
                      ) : (
                        <span className="text-muted italic">All Branches (Global Access)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted" /> {u.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status}>{u.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/users/${u.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors inline-block"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        {currentUser?.id !== u.id && u.role !== 'super_admin' && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
