import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill,
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client';

export const MedicineAdministration = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/medicines');
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Error fetching medicine logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (log) => {
    if (!window.confirm(`Delete medicine dispensing log (${log.medicine_name} for ${log.patient_name})?`)) return;
    try {
      await api.delete(`/health/medicines/${log.id}`);
      fetchLogs();
    } catch (err) {
      alert(err.message || 'Failed to delete medicine log.');
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.patient_name?.toLowerCase().includes(term) ||
      l.medicine_name?.toLowerCase().includes(term) ||
      l.class_or_dept?.toLowerCase().includes(term) ||
      l.reason?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Infirmary Pharmacy &amp; Logbook
            </span>
            <span className="text-xs text-slate-500 font-medium">Controlled Dispensing</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Medicine Administration &amp; Dispensing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track medications administered to students or staff with stock integration, full edit/delete support, and allergy checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/health/inventory')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            Manage Stock Inventory
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/medicines/new')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Dispense Medicine
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, medicine, class, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Total Logs: {filteredLogs.length}
        </span>
      </div>

      {/* Dispensing Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Patient &amp; Class/Dept</th>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Dosage &amp; Qty</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Dispensed By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading dispensing logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No medicine dispensing logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{l.patient_name}</p>
                      <span className="text-[11px] text-slate-500">
                        {l.patient_type === 'student'
                          ? l.class_or_dept || 'Student'
                          : `Staff (${l.class_or_dept || 'General'})`}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-rose-700">{l.medicine_name}</td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-800">{l.dosage_qty}</span>
                      {l.quantity_units > 0 && (
                        <span className="block text-[10px] text-slate-400">Units: {l.quantity_units}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600">{l.reason || '—'}</td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {new Date(l.dispensed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(l.dispensed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700">{l.dispensed_by}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/health/medicines/${l.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg"
                          title="Edit Dispensing Log"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(l)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                          title="Delete Log"
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
