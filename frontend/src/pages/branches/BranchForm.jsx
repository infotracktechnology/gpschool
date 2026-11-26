import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Building2, ArrowLeft, Save, AlertCircle, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const BranchForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchBranches } = useAuth();
  const isEdit = Boolean(id);

  const [boards, setBoards] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    board_id: '',
    logo: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const boardsRes = await api.get('/settings/boards?status=active');
        const activeBoards = boardsRes.boards || [];
        setBoards(activeBoards);

        if (isEdit) {
          const branchRes = await api.get('/settings/branches');
          const branch = branchRes.branches?.find((b) => String(b.id) === String(id));
          if (!branch) {
            setError('Branch not found');
            return;
          }
          setFormData({
            code: branch.code,
            name: branch.name,
            board_id: branch.board_id,
            logo: branch.logo || '',
            phone: branch.phone || '',
            email: branch.email || '',
            address: branch.address || '',
            city: branch.city || '',
            state: branch.state || '',
            status: branch.status,
          });
        } else if (activeBoards.length > 0) {
          setFormData((prev) => ({ ...prev, board_id: activeBoards[0].id }));
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize form');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEdit]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type)) {
      setError('Please select a valid PNG, JPG, SVG, WEBP, or GIF image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo image must be smaller than 5 MB');
      return;
    }

    try {
      setError('');
      setUploadingLogo(true);
      const uploadPayload = new FormData();
      uploadPayload.append('logo', file);
      const res = await api.upload('/settings/branches/upload-logo', uploadPayload);
      if (res.url) {
        setFormData((prev) => ({ ...prev, logo: res.url }));
      }
    } catch (err) {
      setError(err.message || 'Failed to upload branch logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEdit) {
        await api.put(`/settings/branches/${id}`, formData);
      } else {
        await api.post('/settings/branches', formData);
      }
      await fetchBranches();
      navigate('/settings/branches');
    } catch (err) {
      setError(err.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        Loading branch details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/settings/branches"
            className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-heading hover:bg-slate-50 transition-colors"
            title="Back to Branches"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <Link to="/settings/branches" className="hover:text-brand-600">
                Branches
              </Link>
              <span>/</span>
              <span className="text-heading font-medium">{isEdit ? 'Edit Branch' : 'New Branch'}</span>
            </div>
            <h1 className="text-xl font-bold text-heading mt-0.5">
              {isEdit ? `Edit Branch: ${formData.name || ''}` : 'Create Campus Branch'}
            </h1>
          </div>
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
            <Building2 className="w-4 h-4 text-brand-600" />
            Branch Campus Information
          </h2>
          <p className="text-xs text-muted">Enter branch identity and education board association</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Branch Code (e.g. BR-MAIN, BR-SOUTH) *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="BR-MAIN"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Affiliated Education Board *
            </label>
            <select
              required
              value={formData.board_id}
              onChange={(e) => setFormData({ ...formData, board_id: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">Select Board</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-heading mb-1.5">
            Campus Branch Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Main Campus - Anna Nagar"
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
          />
        </div>

        {/* Branch Logo Section */}
        <div className="pt-4 border-t border-border/80">
          <h3 className="text-xs font-bold text-heading uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
            Branch Logo
          </h3>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Live Logo Preview */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-slate-50 flex items-center justify-center overflow-hidden relative group shadow-inner">
                {formData.logo ? (
                  <>
                    <img
                      src={formData.logo}
                      alt="Branch Logo Preview"
                      className="w-full h-full object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo: '' })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 transition-colors"
                      title="Remove Logo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] block font-medium">No Logo</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-muted">Preview</span>
            </div>

            {/* Logo Inputs: URL or File Upload */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1.5">
                  Logo Image URL
                </label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png or /assets/logo.png"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-heading mb-1.5">
                  Or Upload Logo Image (Saved to Server)
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer transition-colors ${
                      uploadingLogo ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-brand-600" />
                    )}
                    <span>{uploadingLogo ? 'Uploading...' : 'Choose Image File...'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleFileUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, logo: '/assets/logo.png' }))}
                    className="px-3 py-2 rounded-xl border border-brand-200 bg-brand-50/70 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition-colors"
                  >
                    Use Default School Logo
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  PNG, JPG, SVG, WEBP or GIF up to 5 MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/80">
          <h3 className="text-xs font-bold text-heading uppercase tracking-wider text-slate-500 mb-4">
            Contact & Address Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="044-24567890"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="branch@school.edu"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-heading mb-1.5">Street Address</label>
            <textarea
              rows="2"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Campus address..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Chennai"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Tamil Nadu"
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          <Link
            to="/settings/branches"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || uploadingLogo}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEdit ? 'Update Branch' : 'Create Branch'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
