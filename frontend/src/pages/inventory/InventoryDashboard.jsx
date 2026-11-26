import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, FileText, PackageCheck, ArrowUpDown, Users, Boxes,
  TrendingDown, RefreshCw,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, fmtMoney, fmtDate, cardCls } from './_shared';

const KpiCard = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className={`${cardCls} p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
};

export const InventoryDashboard = () => {
  const navigate = useNavigate();
  const { branches, selectedBranch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const branchId = selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : null;

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getDashboard(branchId);
      if (res.success) setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId]);

  const kpis = data?.kpis || {};

  const categoryOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      label: { show: false },
      data: (data?.stock_by_category || []).map((c) => ({
        name: c.category_name || 'Uncategorized',
        value: Number(c.total_qty) || 0,
      })),
    }],
  };

  const branchBarOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: (data?.stock_by_branch || []).map((b) => b.branch_name || `Branch ${b.branch_id}`),
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: (data?.stock_by_branch || []).map((b) => ({
        value: Number(b.total_value) || 0,
        itemStyle: { color: '#4f46e5' },
      })),
      barMaxWidth: 48,
    }],
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Inventory"
        title="Inventory Overview"
        subtitle="Stock positions, purchase pipeline and movement activity across branches."
        actions={
          <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Package} label="Total Items" value={kpis.total_items ?? 0} tone="brand" />
        <KpiCard icon={TrendingDown} label="Low Stock" value={kpis.low_stock_count ?? 0} tone="amber" sub="At/below reorder level" />
        <KpiCard icon={FileText} label="Pending POs" value={kpis.pending_pos ?? 0} tone="indigo" />
        <KpiCard icon={PackageCheck} label="Pending GRNs" value={kpis.pending_grns ?? 0} tone="brand" />
        <KpiCard icon={Boxes} label="Allocations" value={kpis.active_allocations ?? 0} tone="emerald" />
        <KpiCard icon={AlertTriangle} label="Damaged" value={kpis.damaged_count ?? 0} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardCls} p-5 lg:col-span-2`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Stock Value by Branch</h3>
          {data?.stock_by_branch?.length ? (
            <ReactECharts option={branchBarOption} style={{ height: 260 }} />
          ) : <EmptyState icon={Package} message="No stock data yet" />}
        </div>
        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Stock by Category (Qty)</h3>
          {data?.stock_by_category?.length ? (
            <ReactECharts option={categoryOption} style={{ height: 260 }} />
          ) : <EmptyState icon={Package} message="No stock data yet" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Low Stock Alerts</h3>
            <button onClick={() => navigate('/inventory/items?low_stock=true')} className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </button>
          </div>
          {(data?.low_stock || []).length === 0 ? (
            <EmptyState icon={Package} message="No low stock items" />
          ) : (
            <div className="space-y-2">
              {data.low_stock.slice(0, 8).map((it) => (
                <div key={it.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-500">{it.item_code} • {it.category_name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-700">{Number(it.quantity)}</p>
                    <p className="text-[10px] text-slate-400">reorder @ {it.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Pending Purchase Orders</h3>
            <button onClick={() => navigate('/inventory/purchase-orders')} className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </button>
          </div>
          {(data?.pending_pos || []).length === 0 ? (
            <EmptyState icon={FileText} message="No pending POs" />
          ) : (
            <div className="space-y-2">
              {data.pending_pos.slice(0, 8).map((po) => (
                <div key={po.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{po.po_number}</p>
                    <p className="text-[11px] text-slate-500 truncate">{po.supplier_name} • {po.branch_name || ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={po.status} />
                    <span className="text-xs font-bold text-slate-700">{fmtMoney(po.total_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls} p-5`}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Stock Movements</h3>
        {(data?.recent_movements || []).length === 0 ? (
          <EmptyState icon={ArrowUpDown} message="No movements yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_movements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-2 text-slate-500 text-xs">{fmtDate(m.created_at)}</td>
                    <td className="py-2 font-medium text-slate-800">{m.item_name}</td>
                    <td className="py-2 text-slate-500 text-xs">{m.branch_name || '—'}</td>
                    <td className="py-2"><StatusBadge status={m.movement_type} /></td>
                    <td className={`py-2 text-right font-bold ${m.movement_type === 'in' || m.movement_type === 'transfer_in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.movement_type === 'in' || m.movement_type === 'transfer_in' ? '+' : '-'}{Number(m.quantity)}
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
