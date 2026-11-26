import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Search,
  Edit,
  AlertTriangle,
  Phone,
  Eye,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client';

export const HealthProfiles = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('student');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, [activeTab]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/health/profiles?type=${activeTab}`);
      if (res.success) {
        setProfiles(res.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching health profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearProfile = async (p, name) => {
    const id = activeTab === 'student' ? p.student_id : p.staff_id;
    if (!window.confirm(`Clear custom medical dossier fields for ${name}?`)) return;
    try {
      await api.delete(`/health/profiles/${activeTab}/${id}`);
      fetchProfiles();
    } catch (err) {
      alert(err.message || 'Failed to clear custom medical profile');
    }
  };

  const filtered = profiles.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = activeTab === 'student' ? p.student_name : p.staff_name;
    const refNo = activeTab === 'student' ? p.admission_no : p.emp_no;
    const classOrDept = activeTab === 'student' ? p.class_name : p.department;
    return (
      name?.toLowerCase().includes(term) ||
      refNo?.toLowerCase().includes(term) ||
      classOrDept?.toLowerCase().includes(term) ||
      p.blood_group?.toLowerCase().includes(term) ||
      p.known_allergies?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Medical Dossier &amp; History
            </span>
            <span className="text-xs text-slate-500 font-medium">CBSE Health Master</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Health Profiles &amp; Medical History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized health dossiers, blood groups, known allergies, chronic conditions, and full clinical timeline.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'student'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Students Dossier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'staff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Faculty &amp; Staff
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'student' ? 'students by name, admission no, or class' : 'staff by name or emp ID'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Showing {filtered.length} profiles
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading health profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const entityId = activeTab === 'student' ? p.student_id : p.staff_id;
            const name = activeTab === 'student' ? p.student_name : p.staff_name;
            const subInfo =
              activeTab === 'student'
                ? `${p.class_name || ''} - ${p.section_name || ''}`
                : `${p.designation || 'Staff'} (${p.department || 'General'})`;
            const refNo = activeTab === 'student' ? p.admission_no : p.emp_no;
            const hasAllergy = p.known_allergies && p.known_allergies !== 'None';
            const hasCondition = p.chronic_conditions && p.chronic_conditions !== 'None';

            return (
              <div
                key={entityId}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{name}</h3>
                      <p className="text-xs text-slate-500">{subInfo}</p>
                      <span className="text-[10px] font-mono text-slate-400">{refNo}</span>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                      {p.blood_group || 'O+'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {hasAllergy ? (
                      <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] uppercase tracking-wider text-amber-700">
                            Allergies:
                          </strong>
                          {p.known_allergies}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 pl-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        No known allergies
                      </div>
                    )}

                    {hasCondition && (
                      <div className="flex items-start gap-1.5 p-2 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-900">
                        <Heart className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] uppercase tracking-wider text-rose-700">
                            Chronic Condition:
                          </strong>
                          {p.chronic_conditions}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-slate-50/80 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Height</span>
                      <p className="font-extrabold text-slate-800">{p.height_cm ? `${p.height_cm} cm` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Weight</span>
                      <p className="font-extrabold text-slate-800">{p.weight_kg ? `${p.weight_kg} kg` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">BMI</span>
                      <p className="font-extrabold text-slate-800">{p.bmi || '—'}</p>
                    </div>
                  </div>

                  {p.emergency_contact_phone && (
                    <div className="mt-3 text-xs text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        Emergency:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {p.emergency_contact_phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Page Action Links */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/health/profiles/${activeTab}/${entityId}`)}
                    className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Full Dossier
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/health/profiles/${activeTab}/${entityId}/edit`)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    {p.profile_id && (
                      <button
                        type="button"
                        onClick={() => handleClearProfile(p, name)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                        title="Clear Custom Medical Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
