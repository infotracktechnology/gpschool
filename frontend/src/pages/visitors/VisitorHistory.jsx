import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  History,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  Clock,
  User,
  Users,
  Car,
  AlertTriangle,
  CheckCircle,
  Building2,
  FileSpreadsheet,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const VisitorHistory = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [history, setHistory] = useState([]);
  const [kpis, setKpis] = useState({
    total_visits: 0,
    in_campus: 0,
    checked_out: 0,
    overstayed: 0,
    avg_duration_minutes: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate, statusFilter, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let url = `/visitors/history?status=${statusFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await api.get(url);
      if (res.success) {
        setHistory(res.history || []);
        if (res.kpis) {
          setKpis(res.kpis);
        }
      }
    } catch (err) {
      console.error('Error fetching visitor history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setStartDate(weekAgo.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      setStartDate(monthAgo.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'Pass Number',
      'Visitor Name',
      'Phone',
      'Visitor Category',
      'Person To Meet',
      'Department',
      'Linked Student',
      'Vehicle No',
      'Check In Time',
      'Check Out Time',
      'Duration (Mins)',
      'Status',
      'Exit Remarks',
    ];

    const rows = history.map((h) => [
      `"${h.pass_number}"`,
      `"${h.visitor_name}"`,
      `"${h.visitor_phone}"`,
      `"${h.visitor_type || 'Guest'}"`,
      `"${h.person_to_meet_name || ''}"`,
      `"${h.department || ''}"`,
      `"${h.student_name || ''}"`,
      `"${h.vehicle_number || 'None'}"`,
      `"${new Date(h.check_in_time).toLocaleString()}"`,
      `"${h.check_out_time ? new Date(h.check_out_time).toLocaleString() : 'Active'}"`,
      h.duration_minutes || 0,
      `"${h.status}"`,
      `"${h.exit_remarks || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Visitor_Register_${startDate || 'All'}_to_${endDate || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    if (history.length === 0) return;
    const sheetData = history.map((h) => ({
      'Pass Number': h.pass_number,
      'Visitor Name': h.visitor_name,
      Phone: h.visitor_phone,
      Category: h.visitor_type || 'Guest',
      'Badge #': h.badge_number || '—',
      'ID Proof': h.id_proof_type ? `${h.id_proof_type}: ${h.id_proof_number || ''}` : '—',
      'Person To Meet': h.person_to_meet_name || '',
      Department: h.department || '',
      Purpose: h.purpose || '',
      'Linked Student': h.student_name ? `${h.student_name} (${h.student_class_section || ''})` : '',
      Vehicle: h.vehicle_number || 'Walking',
      'Check In Time': new Date(h.check_in_time).toLocaleString(),
      'Check Out Time': h.check_out_time ? new Date(h.check_out_time).toLocaleString() : 'Active',
      'Duration (Mins)': h.duration_minutes || 0,
      Status: h.status,
      'Exit Remarks': h.exit_remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitor History');
    XLSX.writeFile(wb, `Visitor_Register_${startDate || 'All'}_to_${endDate || 'All'}.xlsx`);
  };

  const handleDeletePass = async (row) => {
    if (!window.confirm(`Delete visitor pass ${row.pass_number} for ${row.visitor_name}?`)) return;
    try {
      await api.delete(`/visitors/passes/${row.id}`);
      fetchHistory();
    } catch (err) {
      alert(err.message || 'Failed to delete visitor pass');
    }
  };

  const handlePrintDocket = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner (hidden during print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              Audit & Compliance
            </span>
            <span className="text-xs text-slate-500 font-medium">CBSE Safety & Gate Register</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Visitor History & Gate Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive audit register of all incoming and outgoing campus visitors with analytics and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrintDocket}
            className="px-3.5 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Official Docket
          </button>
        </div>
      </div>

      {/* KPI Metric Cards (hidden during print) */}
      <div className="print:hidden grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Visitors</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{kpis.total_visits}</p>
          <span className="text-[10px] text-slate-400">All logged visits</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Campus Now</p>
          <p className="text-2xl font-extrabold text-brand-600 mt-1">{kpis.in_campus}</p>
          <span className="text-[10px] text-brand-600/70">Currently active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checked Out</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{kpis.checked_out}</p>
          <span className="text-[10px] text-slate-400">Gate cleared</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overstayed</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{kpis.overstayed}</p>
          <span className="text-[10px] text-rose-500">Exceeded duration</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 md:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Visit Time</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">
            {kpis.avg_duration_minutes || 0} <span className="text-xs font-bold text-slate-500">mins</span>
          </p>
          <span className="text-[10px] text-slate-400">Per visitor average</span>
        </div>
      </div>

      {/* Filter Toolbar (hidden during print) */}
      <div className="print:hidden flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Preset Date Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => handlePresetChange(btn.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                datePreset === btn.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date Pickers & Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-slate-50/50"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-slate-50/50"
            />
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search visitor, host, pass..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Official Print Header (Only visible during print) */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
          Green Park International Senior Secondary School
        </h2>
        <p className="text-xs text-slate-600 uppercase font-semibold">
          Affiliated to CBSE, New Delhi • Official Campus Visitor Register Docket
        </p>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Report Period: {startDate || 'Beginning'} to {endDate || 'Present'} • Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider print:bg-slate-200 print:text-black">
              <tr>
                <th className="py-3 px-4">Pass #</th>
                <th className="py-3 px-4">Visitor Information</th>
                <th className="py-3 px-4">Person to Meet / Dept</th>
                <th className="py-3 px-4">Purpose / Ward</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No visitor records found for the selected time range.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {row.pass_number}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{row.visitor_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{row.visitor_phone}</p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{row.person_to_meet_name}</p>
                      <p className="text-[11px] text-slate-500">{row.department || 'General'}</p>
                    </td>

                    <td className="py-3 px-4 max-w-[180px]">
                      <p className="font-medium text-slate-700 truncate" title={row.purpose}>
                        {row.purpose}
                      </p>
                      {row.student_name && (
                        <p className="text-[10px] text-brand-700 font-bold">
                          Ward: {row.student_name}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {row.vehicle_number || 'Walking'}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {row.check_out_time ? (
                        new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-brand-600 font-bold">In Campus</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {row.duration_minutes || 0} mins
                    </td>

                    <td className="py-3 px-4">
                      {row.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Checked Out
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right print:hidden">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/passes/${row.id}`)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="View / Print Pass"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/visitors/entry/${row.id}/edit`)}
                          className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700"
                          title="Edit Pass"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePass(row)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                          title="Delete Pass"
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
