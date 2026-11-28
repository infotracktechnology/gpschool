import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Plus,
  Search,
  Bed,
  CheckCircle,
  Home,
  RefreshCw,
  ShieldAlert,
  Edit,
  Trash2,
  Printer,
  Bell,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const InfirmaryDesk = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [visits, setVisits] = useState([]);
  const [activeBays, setActiveBays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    in_bay: 0,
    back_to_class: 0,
    sent_home: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState('all');

  useEffect(() => {
    fetchVisits();
  }, [dispositionFilter, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/health/visits?disposition=${dispositionFilter}`);
      if (res.success) {
        setVisits(res.visits || []);
        setActiveBays(res.activeBays || []);
        if (res.todaySummary) setSummary(res.todaySummary);
      }
    } catch (err) {
      console.error('Error fetching infirmary visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (visit) => {
    if (!window.confirm(`Delete infirmary visit ${visit.visit_number} for ${visit.patient_name}?`)) return;
    try {
      await api.delete(`/health/visits/${visit.id}`);
      fetchVisits();
    } catch (err) {
      alert(err.message || 'Failed to delete visit record.');
    }
  };

  const filteredVisits = visits.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.visit_number?.toLowerCase().includes(term) ||
      v.patient_name?.toLowerCase().includes(term) ||
      v.chief_complaint?.toLowerCase().includes(term) ||
      v.class_section?.toLowerCase().includes(term) ||
      v.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Campus Nursing Station
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Infirmary Live
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Infirmary Desk &amp; Daily Triage</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log student/staff illness and injury visits, monitor active resting beds, print incident slips, and notify parents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVisits}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/infirmary/new')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Log Patient Visit
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Visits</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total}</p>
          <span className="text-[10px] text-slate-400">Logged in bay</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resting in Bay</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summary.in_bay}</p>
          <span className="text-[10px] text-amber-600">Currently resting</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Back to Class</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.back_to_class}</p>
          <span className="text-[10px] text-slate-400">Recovered &amp; returned</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sent Home</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.sent_home}</p>
          <span className="text-[10px] text-rose-500">Parents notified &amp; left</span>
        </div>
      </div>

      {/* Live Bed Bay Occupancy Strip */}
      {activeBays.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-amber-600" />
              Active Infirmary Bed Monitor ({activeBays.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBays.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-amber-200 rounded-xl p-3 text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                      {b.bed_number || 'Bay'}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{b.patient_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {b.class_section || b.department} • {b.chief_complaint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/health/infirmary/${b.id}/edit`)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg shrink-0"
                >
                  Update
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Visits' },
            { id: 'resting_in_bay', label: 'Resting in Bay' },
            { id: 'sent_back_to_class', label: 'Back to Class' },
            { id: 'sent_home', label: 'Sent Home' },
            { id: 'referred_hospital', label: 'Hospital Referral' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDispositionFilter(tab.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                dispositionFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, complaint, class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Visit #</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Chief Complaint &amp; Vitals</th>
                <th className="py-3 px-4">Treatment / First Aid</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Disposition Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No infirmary visit records found.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {v.visit_number}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{v.patient_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {v.patient_type === 'student'
                          ? v.class_section || 'Class N/A'
                          : `Staff (${v.department || 'General'})`}
                      </p>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-slate-800">{v.chief_complaint}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        {v.temperature_f && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {v.temperature_f}°F
                          </span>
                        )}
                        {v.pulse_bpm && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {v.pulse_bpm} bpm
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-medium text-slate-700">{v.treatment_given}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">By: {v.attended_by}</p>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {v.visit_time}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(v.visit_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {v.disposition === 'resting_in_bay' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Bed className="w-3 h-3 text-amber-600" />
                          Resting in Bay {v.bed_number ? `(${v.bed_number})` : ''}
                        </span>
                      )}
                      {v.disposition === 'sent_back_to_class' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Back to Class
                        </span>
                      )}
                      {v.disposition === 'sent_home' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <Home className="w-3 h-3 text-rose-600" />
                          Sent Home
                        </span>
                      )}
                      {v.disposition === 'referred_hospital' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          <ShieldAlert className="w-3 h-3 text-purple-600" />
                          Hospital Referral
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/health/infirmary/${v.id}/print`)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          title="Print Incident Report (A4)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {v.student_id && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/health/notifications/new?studentId=${v.student_id}&visitId=${v.id}`)
                            }
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg"
                            title="Notify Parent"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/health/infirmary/${v.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg"
                          title="Edit / Update Disposition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                          title="Delete Visit"
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
    </div>
  );
};
