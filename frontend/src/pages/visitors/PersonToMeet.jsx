import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Building2,
  Phone,
  Clock,
  MapPin,
  CheckCircle,
  Edit,
  ArrowRight,
  Filter,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const PersonToMeet = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();

  const [hosts, setHosts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHosts();
  }, [selectedDept, selectedBranch?.id]);

  const fetchHosts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitors/hosts?department=${selectedDept}`);
      if (res.success && res.hosts) {
        setHosts(res.hosts);
        if (res.departments && res.departments.length > 0) {
          setDepartments(res.departments);
        }
      }
    } catch (err) {
      console.error('Error fetching hosts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (host) => {
    try {
      const nextAvailable = !(host.is_available === 1 || host.is_available === true);
      await api.put(`/visitors/hosts/${host.staff_id}/extension`, {
        cabin_room: host.cabin_room || 'Staff Room',
        intercom: host.intercom || '101',
        visiting_hours: host.visiting_hours || '2:30 PM - 3:30 PM',
        is_available: nextAvailable,
      });
      fetchHosts();
    } catch (err) {
      alert(err.message || 'Failed to toggle availability');
    }
  };

  const filteredHosts = hosts.filter((h) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      h.full_name?.toLowerCase().includes(term) ||
      h.department?.toLowerCase().includes(term) ||
      h.designation?.toLowerCase().includes(term) ||
      h.emp_no?.toLowerCase().includes(term) ||
      h.intercom?.includes(term) ||
      h.cabin_room?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Staff & Department Directory
            </span>
            <span className="text-xs text-slate-500 font-medium">Reception & Intercom Lookup</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Person to Meet Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick reference directory of teachers, campus administrators, cabin locations, and intercom extensions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/visitors/entry')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <UserCheck className="w-4 h-4" />
          Register Walk-In Visitor
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              selectedDept === 'all'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Staff ({hosts.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                selectedDept === dept
                  ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search host, dept, intercom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Grid of Host Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHosts.map((h) => (
          <div
            key={h.staff_id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
          >
            <div>
              {/* Top Row: Avatar & On-Duty */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {h.avatar_url ? (
                    <img
                      src={h.avatar_url}
                      alt={h.full_name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-sm border border-indigo-200">
                      {h.full_name?.charAt(0) || 'S'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {h.full_name}
                    </h3>
                    <p className="text-xs text-brand-700 font-medium">{h.designation}</p>
                    <span className="text-[10px] font-mono text-slate-400">{h.emp_no}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Available
                </span>
              </div>

              {/* Extension & Location Details */}
              <div className="mt-4 p-3 bg-slate-50/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Department
                  </span>
                  <span className="font-semibold text-slate-800">{h.department || 'General'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Cabin / Room
                  </span>
                  <span className="font-semibold text-slate-800">{h.cabin_room}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Gate Intercom
                  </span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Ext: {h.intercom}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Visiting Hours
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">{h.visiting_hours}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigate(`/visitors/hosts/${h.staff_id}/edit`)}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  title="Edit cabin or intercom"
                >
                  <Edit className="w-3 h-3" />
                  Configure
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(h)}
                  className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Toggle Available / Busy"
                >
                  {h.is_available ? 'Set Busy' : 'Set Available'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/visitors/entry?hostId=${h.staff_id}`)}
                className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/70 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                Log Visitor <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
