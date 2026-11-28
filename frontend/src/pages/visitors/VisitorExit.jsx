import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Phone,
  QrCode,
  RefreshCw,
  Building2,
  Car,
  Filter,
  Check,
  Edit,
  Trash2,
  Printer,
  Plus
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const VisitorExit = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchActiveVisitors();
    const interval = setInterval(fetchActiveVisitors, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchActiveVisitors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/visitors/active');
      if (res.success) {
        setActiveVisitors(res.visitors || []);
      }
    } catch (err) {
      console.error('Error fetching active visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckoutByScan = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    try {
      const res = await api.post(`/visitors/exit/${encodeURIComponent(scanCode.trim())}`, {
        exit_remarks: 'Scanned at gate',
      });
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Visitor ${res.pass?.visitor_name || scanCode} successfully checked out!`,
        });
        setScanCode('');
        fetchActiveVisitors();
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Visitor pass not found or already checked out.',
      });
    }
  };

  const handleDeletePass = async (visitor) => {
    if (!window.confirm(`Delete gate pass ${visitor.pass_number} for ${visitor.visitor_name}?`)) return;
    try {
      await api.delete(`/visitors/passes/${visitor.id}`);
      setNotification({ type: 'success', message: `Pass ${visitor.pass_number} deleted.` });
      fetchActiveVisitors();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete visitor pass.' });
    }
  };

  // Filtered List
  const filteredVisitors = activeVisitors.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.visitor_name?.toLowerCase().includes(term) ||
      v.pass_number?.toLowerCase().includes(term) ||
      v.visitor_phone?.includes(term) ||
      v.person_to_meet_name?.toLowerCase().includes(term) ||
      v.vehicle_number?.toLowerCase().includes(term)
    );
  });

  const overstayedCount = activeVisitors.filter((v) => v.is_overstayed).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
              Campus Gate Clearance
            </span>
            <span className="flex items-center gap-1 text-xs text-brand-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              Live Exit Roster
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Visitor Exit & Check-Out</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log visitor exits, scan QR gate passes, and track visitors exceeding authorized visiting hours.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Currently Inside</p>
            <p className="text-lg font-extrabold text-slate-900">{activeVisitors.length}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border text-center ${
            overstayedCount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <p className="text-[11px] font-bold uppercase tracking-wider">
              {overstayedCount > 0 ? '⚠️ Overstayed' : 'Normal'}
            </p>
            <p className="text-lg font-extrabold">{overstayedCount}</p>
          </div>
          <button
            type="button"
            onClick={fetchActiveVisitors}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh active visitors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick QR Scanner & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fast Scanner Input */}
        <form
          onSubmit={handleQuickCheckoutByScan}
          className="md:col-span-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2"
        >
          <div className="p-2 bg-brand-50 rounded-xl text-brand-600 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Scan QR or Enter Pass / Phone No..."
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="w-full text-xs font-mono font-medium border-0 focus:ring-0 p-0 text-slate-800 placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            Check Out
          </button>
        </form>

        {/* Table Search Filter */}
        <div className="md:col-span-2 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            placeholder="Search active roster by Visitor Name, Host, Pass No, or Vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border-0 focus:ring-0 p-0 text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active In-Campus Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Currently In Campus ({filteredVisitors.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Auto-refreshes every 30 seconds
          </span>
        </div>

        {filteredVisitors.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-700">No Visitors Currently In Campus</p>
            <p className="text-xs text-slate-400 mt-1">All checked-in visitors have been cleared through the gate.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Visitor Details</th>
                  <th className="py-3 px-4">Pass Number</th>
                  <th className="py-3 px-4">Person to Meet / Dept</th>
                  <th className="py-3 px-4">Purpose / Student</th>
                  <th className="py-3 px-4">Check-In & Elapsed</th>
                  <th className="py-3 px-4">Security Status</th>
                  <th className="py-3 px-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      v.is_overstayed ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    {/* Visitor Photo & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {v.photo_url ? (
                          <img
                            src={v.photo_url}
                            alt={v.visitor_name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200 shrink-0">
                            {v.visitor_name?.charAt(0) || 'V'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{v.visitor_name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {v.visitor_phone}
                          </p>
                          {v.vehicle_number && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                              <Car className="w-2.5 h-2.5" />
                              {v.vehicle_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Pass Number */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded text-[11px]">
                        {v.pass_number}
                      </span>
                    </td>

                    {/* Person to Meet */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{v.person_to_meet_name || 'Staff Desk'}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {v.department || 'General'}
                      </p>
                    </td>

                    {/* Purpose / Ward */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-700 max-w-[200px] truncate" title={v.purpose}>
                        {v.purpose}
                      </p>
                      {v.student_name && (
                        <p className="text-[11px] text-brand-700 font-semibold mt-0.5">
                          Ward: {v.student_name} ({v.student_class_section || ''})
                        </p>
                      )}
                    </td>

                    {/* Check In & Time Elapsed */}
                    <td className="py-3 px-4">
                      <p className="text-slate-800 font-semibold">
                        {new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {v.elapsed_minutes || 0} mins elapsed
                      </p>
                    </td>

                    {/* Security Status */}
                    <td className="py-3 px-4">
                      {v.is_overstayed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ⚠️ Overstayed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          In Campus
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/passes/${v.id}`)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="View / Print Pass"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/entry/${v.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg transition-colors"
                          title="Edit Pass"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePass(v)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                          title="Delete Pass"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/exit/${v.id}`)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Check Out
                        </button>
                      </div>
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
