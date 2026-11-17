import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Award,
  Calendar,
  CalendarRange,
  Users,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';

export const Dashboard = () => {
  const { user, selectedAcademicYear } = useAuth();
  const [stats, setStats] = useState({
    boardsCount: 0,
    branchesCount: 0,
    academicYearsCount: 0,
    mappingsCount: 0,
    usersCount: 0,
  });
  const [allMappings, setAllMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [boardsRes, branchesRes, yearsRes, mappingsRes, usersRes] = await Promise.all([
          api.get('/settings/boards'),
          api.get('/settings/branches'),
          api.get('/settings/academic-years'),
          api.get('/settings/branch-academic-years'),
          api.get('/users').catch(() => ({ users: [] })),
        ]);

        setStats({
          boardsCount: boardsRes.boards?.length || 0,
          branchesCount: branchesRes.branches?.length || 0,
          academicYearsCount: yearsRes.academicYears?.length || 0,
          mappingsCount: mappingsRes.mappings?.length || 0,
          usersCount: usersRes.users?.length || 0,
        });

        setAllMappings(mappingsRes.mappings || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Filter mappings according to the currently selected academic year
  const filteredMappings = selectedAcademicYear
    ? allMappings.filter((m) => m.academic_year_id === selectedAcademicYear.id)
    : allMappings;

  const displayMappings = filteredMappings.length > 0 ? filteredMappings : allMappings.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-sidebar rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-brand-950/10">
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-brand-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
              School ERP Active
            </span>
            {selectedAcademicYear && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500/20 text-xs font-mono font-medium text-white border border-brand-400/30">
                <Calendar className="w-3 h-3 text-brand-300" />
                Session View: {selectedAcademicYear.code}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Administrator'}
          </h1>
          <p className="text-brand-100/90 text-sm mt-2 leading-relaxed">
            Manage your school institution settings, campuses, affiliated education boards, and
            academic year session schedules seamlessly from this centralized console.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Campuses / Branches</p>
            <h3 className="text-2xl font-bold text-heading mt-0.5">{stats.branchesCount}</h3>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Education Boards</p>
            <h3 className="text-2xl font-bold text-heading mt-0.5">{stats.boardsCount}</h3>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Academic Years</p>
            <h3 className="text-2xl font-bold text-heading mt-0.5">{stats.academicYearsCount}</h3>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-border shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Session Mappings</p>
            <h3 className="text-2xl font-bold text-heading mt-0.5">{stats.mappingsCount}</h3>
          </div>
        </div>
      </div>

      {/* Quick Setup Actions */}
      <div>
        <h2 className="text-base font-bold text-heading mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            to="/settings/branches/create"
            className="group bg-surface p-6 rounded-2xl border border-border hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-heading text-base group-hover:text-brand-600 transition-colors">
                Add Campus Branch
              </h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Add new campuses, assign designated education boards (CBSE, ICSE, Matric, etc.), and contact details.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <span>Create Branch</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/settings/branch-year-mappings/create"
            className="group bg-surface p-6 rounded-2xl border border-border hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <CalendarRange className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-heading text-base group-hover:text-brand-600 transition-colors">
                Map Academic Session Dates
              </h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Associate branches to academic years with specific Start and End dates for academic calendar readiness.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <span>Map Session Dates</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/users/create"
            className="group bg-surface p-6 rounded-2xl border border-border hover:border-brand-500 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-heading text-base group-hover:text-brand-600 transition-colors">
                Create Staff & Admin
              </h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Create Super Admins, Branch Admins, Principals, and Teachers with role-based access.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <span>Create User</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Academic Year Sessions Table */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-heading">Campus Session Schedules</h2>
              {selectedAcademicYear && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  {selectedAcademicYear.code}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Configured branch start and end dates for academic calendar planning
            </p>
          </div>
          <Link
            to="/settings/branch-year-mappings"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View All Mappings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {displayMappings.length === 0 ? (
          <div className="py-8 text-center text-muted border border-dashed border-border rounded-xl">
            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">No branch academic sessions mapped yet.</p>
            <Link
              to="/settings/branch-year-mappings/create"
              className="inline-flex items-center gap-1 text-xs text-brand-600 font-semibold mt-2 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Map your first branch session
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted font-medium">
                  <th className="pb-3 font-semibold">Campus Branch</th>
                  <th className="pb-3 font-semibold">Board</th>
                  <th className="pb-3 font-semibold">Academic Year</th>
                  <th className="pb-3 font-semibold">Start Date</th>
                  <th className="pb-3 font-semibold">End Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-medium text-heading">
                      {m.branch_name}{' '}
                      <span className="text-[10px] text-muted font-normal font-mono">
                        ({m.branch_code})
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                        {m.board_code}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-heading font-mono">
                      {m.academic_year_code}
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(m.start_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-600">
                      {new Date(m.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <Badge variant={m.status}>{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
