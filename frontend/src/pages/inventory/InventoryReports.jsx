import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart3, Search, FileSpreadsheet, FileText } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, cardCls, inputCls, btnPrimary, fmtMoney, fmtDate } from './_shared';
import * as XLSX from 'xlsx';

const Stat = ({ label, value, accent = 'text-slate-900' }) => (
  <div className={`${cardCls} p-4`}>
    <p className="text-[11px] text-slate-400 uppercase font-semibold">{label}</p>
    <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
  </div>
);

const exportExcel = (rows, sheetName, filename) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ─── STOCK REPORT ───
export const InventoryStockReport = () => {
  const { selectedBranch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getReport('stock', { branch_id: selectedBranch?.id !== 'all' ? selectedBranch?.id : undefined });
        if (res.success) setData(res);
      } finally { setLoading(false); }
    })();
  }, []);

  const items = data?.items || [];
  const summary = data?.summary || {};
  const exportRows = items.map((i) => ({
    'Item Code': i.item_code, 'Item Name': i.item_name, 'Category': i.category_name,
    'Branch': i.branch_name, 'Quantity': i.quantity, 'Reserved': i.reserved_qty,
    'Available': i.available_qty, 'Reorder Level': i.reorder_level,
    'Unit Cost': i.unit_cost, 'Stock Value': i.stock_value,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Reports"
        title="Stock Report"
        subtitle="Current stock levels by branch with valuation."
        actions={<button onClick={() => exportExcel(exportRows, 'Stock', 'inventory_stock')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Export</button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Items" value={summary.total_items || 0} />
        <Stat label="Total Qty" value={summary.total_quantity || 0} />
        <Stat label="Reserved" value={summary.total_reserved || 0} />
        <Stat label="Stock Value" value={fmtMoney(summary.total_value)} accent="text-brand-700" />
      </div>
      <div className={`${cardCls} p-4`}>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : items.length === 0 ? (
          <EmptyState icon={BarChart3} message="No stock data" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Item</th><th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold text-right">Qty</th><th className="pb-2 font-semibold text-right">Reserved</th>
                  <th className="pb-2 font-semibold text-right">Available</th><th className="pb-2 font-semibold text-right">Value</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2"><p className="font-medium text-slate-800">{i.item_name}</p><p className="text-[11px] text-slate-400 font-mono">{i.item_code}</p></td>
                    <td className="py-2 text-xs text-slate-500">{i.branch_name || '—'}</td>
                    <td className="py-2 text-right font-bold">{Number(i.quantity)}</td>
                    <td className="py-2 text-right text-slate-500">{Number(i.reserved_qty)}</td>
                    <td className="py-2 text-right text-slate-500">{Number(i.available_qty)}</td>
                    <td className="py-2 text-right font-semibold">{fmtMoney(i.stock_value)}</td>
                    <td className="py-2">{Number(i.quantity) <= Number(i.reorder_level) && Number(i.reorder_level) > 0 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">Low Stock</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">OK</span>}</td>
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

// ─── MOVEMENT REPORT ───
export const InventoryMovementReport = () => {
  const { selectedBranch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getReport('movement', {
        from_date: from || undefined, to_date: to || undefined,
        movement_type: type || undefined,
        branch_id: selectedBranch?.id !== 'all' ? selectedBranch?.id : undefined,
      });
      if (res.success) setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const movements = data?.movements || [];
  const summary = data?.summary || {};
  const exportRows = movements.map((m) => ({
    'Date': fmtDate(m.created_at), 'Item': m.item_name, 'Item Code': m.item_code,
    'Type': m.movement_type, 'From Branch': m.from_branch_name, 'To Branch': m.to_branch_name,
    'Quantity': m.quantity, 'Reason': m.reason, 'By': m.created_by_name,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Reports"
        title="Movement Report"
        subtitle="Stock movement history with filters."
        actions={<button onClick={() => exportExcel(exportRows, 'Movements', 'inventory_movements')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Export</button>}
      />
      <div className={`${cardCls} p-4`}>
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" className={`${inputCls} md:w-44`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={`${inputCls} md:w-44`} value={to} onChange={(e) => setTo(e.target.value)} />
          <select className={`${inputCls} md:w-48`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="stock_in">Stock In</option><option value="stock_out">Stock Out</option>
            <option value="adjustment">Adjustment</option><option value="transfer_out">Transfer Out</option>
            <option value="transfer_in">Transfer In</option><option value="grn">GRN</option>
            <option value="damage">Damage</option>
          </select>
          <button onClick={load} className={btnPrimary}><Search className="w-4 h-4" /> Apply</button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Stat label="Total Movements" value={summary.total_movements || 0} />
          <Stat label="Total Qty In" value={summary.total_in || 0} accent="text-emerald-700" />
          <Stat label="Total Qty Out" value={summary.total_out || 0} accent="text-rose-700" />
        </div>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : movements.length === 0 ? (
          <EmptyState icon={BarChart3} message="No movements" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Type</th><th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Reason</th><th className="pb-2 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-2 text-xs text-slate-500">{fmtDate(m.created_at)}</td>
                    <td className="py-2"><p className="font-medium text-slate-800">{m.item_name}</p><p className="text-[11px] text-slate-400">{m.item_code}</p></td>
                    <td className="py-2"><StatusBadge status={m.movement_type} /></td>
                    <td className="py-2 text-right font-bold">{Number(m.quantity)}</td>
                    <td className="py-2 text-xs text-slate-500">{m.reason || '—'}</td>
                    <td className="py-2 text-xs text-slate-500">{m.created_by_name || '—'}</td>
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

// ─── SUPPLIER REPORT ───
export const InventorySupplierReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getReport('supplier');
        if (res.success) setData(res);
      } finally { setLoading(false); }
    })();
  }, []);
  const suppliers = data?.suppliers || [];
  const exportRows = suppliers.map((s) => ({
    'Code': s.supplier_code, 'Name': s.name, 'Contact': s.contact_person,
    'Phone': s.phone, 'Email': s.email, 'Total Ordered': s.total_ordered,
    'Total Received': s.total_received, 'PO Count': s.po_count, 'GRN Count': s.grn_count,
  }));
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader badge="Reports" title="Supplier Report" subtitle="Supplier-wise ordering and receipt summary."
        actions={<button onClick={() => exportExcel(exportRows, 'Suppliers', 'inventory_suppliers')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Export</button>} />
      <div className={`${cardCls} p-4`}>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : suppliers.length === 0 ? (
          <EmptyState icon={FileText} message="No supplier data" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Supplier</th><th className="pb-2 font-semibold">Contact</th>
                  <th className="pb-2 font-semibold text-right">POs</th><th className="pb-2 font-semibold text-right">GRNs</th>
                  <th className="pb-2 font-semibold text-right">Ordered</th><th className="pb-2 font-semibold text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.supplier_id} className="border-b border-slate-50">
                    <td className="py-2"><p className="font-medium text-slate-800">{s.name}</p><p className="text-[11px] text-slate-400 font-mono">{s.supplier_code}</p></td>
                    <td className="py-2 text-xs text-slate-500">{s.contact_person || '—'}<br />{s.phone || ''}</td>
                    <td className="py-2 text-right font-bold">{s.po_count}</td>
                    <td className="py-2 text-right font-bold">{s.grn_count}</td>
                    <td className="py-2 text-right font-semibold">{fmtMoney(s.total_ordered)}</td>
                    <td className="py-2 text-right font-semibold">{fmtMoney(s.total_received)}</td>
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

// ─── ALLOCATION REPORT ───
export const InventoryAllocationReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getReport('allocation');
        if (res.success) setData(res);
      } finally { setLoading(false); }
    })();
  }, []);
  const allocations = data?.allocations || [];
  const exportRows = allocations.map((a) => ({
    'No': a.allocation_no, 'Item': a.item_name, 'Type': a.allocation_type,
    'To': a.allocation_name, 'Branch': a.branch_name, 'Qty': a.quantity,
    'Date': fmtDate(a.allocation_date), 'Status': a.status,
  }));
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader badge="Reports" title="Allocation Report" subtitle="Stock allocated to departments, classes and events."
        actions={<button onClick={() => exportExcel(exportRows, 'Allocations', 'inventory_allocations')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Export</button>} />
      <div className={`${cardCls} p-4`}>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : allocations.length === 0 ? (
          <EmptyState icon={BarChart3} message="No allocations" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">No</th><th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Type</th><th className="pb-2 font-semibold">Allocated To</th>
                  <th className="pb-2 font-semibold">Branch</th><th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Date</th><th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-xs font-semibold text-brand-700">{a.allocation_no}</td>
                    <td className="py-2 font-medium text-slate-800">{a.item_name}</td>
                    <td className="py-2 text-xs capitalize text-slate-500">{a.allocation_type}</td>
                    <td className="py-2 text-xs text-slate-600">{a.allocation_name || '—'}</td>
                    <td className="py-2 text-xs text-slate-500">{a.branch_name || '—'}</td>
                    <td className="py-2 text-right font-bold">{Number(a.quantity)}</td>
                    <td className="py-2 text-xs text-slate-500">{fmtDate(a.allocation_date)}</td>
                    <td className="py-2"><StatusBadge status={a.status} /></td>
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

// ─── DAMAGE REPORT ───
export const InventoryDamageReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getReport('damage', { from_date: from || undefined, to_date: to || undefined });
      if (res.success) setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const items = data?.items || [];
  const summary = data?.summary || {};
  const exportRows = items.map((d) => ({
    'No': d.damage_number, 'Item': d.item_name, 'Branch': d.branch_name,
    'Date': fmtDate(d.damage_date), 'Qty': d.quantity, 'Reason': d.reason,
    'Type': d.damage_type, 'Status': d.status, 'Est. Loss': d.estimated_loss,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader badge="Reports" title="Damage Report" subtitle="Damaged stock summary and losses."
        actions={<button onClick={() => exportExcel(exportRows, 'Damages', 'inventory_damages')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Export</button>} />
      <div className={`${cardCls} p-4`}>
        <div className="flex gap-3 mb-4">
          <input type="date" className={`${inputCls} md:w-44`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={`${inputCls} md:w-44`} value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={load} className={btnPrimary}><Search className="w-4 h-4" /> Apply</button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Stat label="Total Cases" value={summary.total_cases || 0} />
          <Stat label="Total Qty" value={summary.total_quantity || 0} accent="text-rose-700" />
          <Stat label="Total Loss" value={fmtMoney(summary.total_loss)} accent="text-rose-700" />
        </div>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : items.length === 0 ? (
          <EmptyState icon={BarChart3} message="No damage records" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">No</th><th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Branch</th><th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold text-right">Qty</th><th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold">Status</th><th className="pb-2 font-semibold text-right">Loss</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-xs font-semibold text-rose-700">{d.damage_number}</td>
                    <td className="py-2 font-medium text-slate-800">{d.item_name}</td>
                    <td className="py-2 text-xs text-slate-500">{d.branch_name || '—'}</td>
                    <td className="py-2 text-xs text-slate-500">{fmtDate(d.damage_date)}</td>
                    <td className="py-2 text-right font-bold">{Number(d.quantity)}</td>
                    <td className="py-2 text-xs text-slate-500">{d.reason || '—'}</td>
                    <td className="py-2"><StatusBadge status={d.status} /></td>
                    <td className="py-2 text-right font-semibold text-rose-700">{fmtMoney(d.estimated_loss)}</td>
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
