import React, { useState } from 'react';
import {
  Banknote,
  FileText,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  CreditCard,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function numberToWordsIndian(num) {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    let str = '';
    if (n > 9999999) { str += inWords(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
    if (n > 99999) { str += inWords(Math.floor(n / 100000)) + ' Lakh '; n %= 100000; }
    if (n > 999) { str += inWords(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
    if (n > 99) { str += inWords(Math.floor(n / 100)) + ' Hundred '; n %= 100; }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n] + ' ';
      else str += b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    }
    return str.trim();
  };
  return `Rupees ${inWords(Math.round(num))} Only`;
}

export const PortalPayslips = () => {
  const { user } = useAuth();
  const [selectedSlip, setSelectedSlip] = useState(null);

  const payslips = [
    {
      id: 1,
      month: 'November 2026',
      month_code: '11-2026',
      days_in_month: 30,
      present_days: 30,
      lop_days: 0,
      gross: 58000,
      basic: 34800,
      da: 11600,
      hra: 8700,
      special: 2900,
      pf: 1800,
      esi: 435,
      pt: 200,
      lop: 0,
      total_deductions: 2435,
      net: 55565,
      status: 'Paid',
      disbursed_on: '2026-11-30',
    },
    {
      id: 2,
      month: 'October 2026',
      month_code: '10-2026',
      days_in_month: 31,
      present_days: 31,
      lop_days: 0,
      gross: 58000,
      basic: 34800,
      da: 11600,
      hra: 8700,
      special: 2900,
      pf: 1800,
      esi: 435,
      pt: 200,
      lop: 0,
      total_deductions: 2435,
      net: 55565,
      status: 'Paid',
      disbursed_on: '2026-10-31',
    },
    {
      id: 3,
      month: 'September 2026',
      month_code: '09-2026',
      days_in_month: 30,
      present_days: 30,
      lop_days: 0,
      gross: 58000,
      basic: 34800,
      da: 11600,
      hra: 8700,
      special: 2900,
      pf: 1800,
      esi: 435,
      pt: 200,
      lop: 0,
      total_deductions: 2435,
      net: 55565,
      status: 'Paid',
      disbursed_on: '2026-09-30',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Monthly Salary Payslips</h1>
          <p className="text-xs text-muted">
            Official monthly compensation slips with complete earnings and statutory deductions breakdown
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold uppercase text-muted">Monthly Gross Salary</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹ 58,000</p>
          <span className="text-[11px] text-muted">Basic + HRA + DA + Allowances</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold uppercase text-muted">Monthly Net Credit</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹ 55,565</p>
          <span className="text-[11px] text-emerald-800 font-medium">Credited to SBI A/C ending ••7492</span>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold uppercase text-muted">Statutory Contributions</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹ 2,435</p>
          <span className="text-[11px] text-muted">EPF (₹1,800) • ESI (₹435) • PT (₹200)</span>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Salary Month</th>
                <th className="py-2.5 px-3 text-right">Gross Salary (₹)</th>
                <th className="py-2.5 px-3 text-center">Paid Days / Month</th>
                <th className="py-2.5 px-3 text-right">Deductions (₹)</th>
                <th className="py-2.5 px-3 text-right font-bold text-heading">Net Pay (₹)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payslips.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>{p.month}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    ₹ {p.gross.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {p.present_days} / {p.days_in_month} Days
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-muted">
                    ₹ {p.total_deductions.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                    ₹ {p.net.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{p.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedSlip(p)}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Slip</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable Salary Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-heading">
                  Official Salary Slip — {selectedSlip.month}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-xs flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Payslip</span>
                </button>
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 bg-white text-slate-900 font-sans">
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-black uppercase text-slate-900">
                    GREEN PARK INTERNATIONAL SENIOR SECONDARY SCHOOL
                  </h1>
                  <p className="text-xs font-semibold text-emerald-800">
                    CBSE Affiliation: 1930452 • Institutional Code: 55321 • Salem Campus
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Faculty Salary Slip for {selectedSlip.month}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg border border-slate-300">
                    SLIP / {selectedSlip.month_code}
                  </span>
                </div>
              </div>

              {/* Employee Particulars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Name:</span>
                  <span className="font-bold text-slate-900">{user?.name || 'Dr. Ramesh Sundaram'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emp ID:</span>
                  <span className="font-mono font-bold text-slate-900">{user?.emp_no || 'GPS-T-001'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Designation:</span>
                  <span className="font-semibold text-slate-900">PGT Senior Mathematics Teacher</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department:</span>
                  <span className="font-semibold text-slate-900">Mathematics</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank A/C:</span>
                  <span className="font-mono font-semibold">SBI ••••••••7492</span>
                </div>
                <div>
                  <span className="text-slate-500 block">UAN / PF:</span>
                  <span className="font-mono font-semibold">100984729103</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Month Days:</span>
                  <span className="font-bold text-slate-900">{selectedSlip.days_in_month} Days</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Paid Days:</span>
                  <span className="font-bold text-emerald-700">{selectedSlip.present_days} Days</span>
                </div>
              </div>

              {/* Earnings vs Deductions */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Pay</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.basic.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dearness Allowance (DA)</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.da.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.hra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Special Allowance</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.special.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 border-t border-slate-300 font-bold flex justify-between">
                    <span>Total Gross Salary:</span>
                    <span className="font-mono font-bold text-slate-900">₹ {selectedSlip.gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-2 font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300 flex justify-between">
                    <span>Deductions</span>
                    <span>Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Provident Fund (PF)</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.pf.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Employee State Insurance (ESI)</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.esi.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Professional Tax (PT)</span>
                      <span className="font-mono font-semibold">₹ {selectedSlip.pt.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Loss of Pay (LOP) Deduction</span>
                      <span className="font-mono font-semibold">₹ 0</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2.5 border-t border-slate-300 font-bold flex justify-between">
                    <span>Total Deductions:</span>
                    <span className="font-mono font-bold text-rose-700">₹ {selectedSlip.total_deductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Highlight */}
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Net Credited Salary:
                  </span>
                  <p className="text-xs font-semibold text-slate-700 italic mt-0.5">
                    {numberToWordsIndian(selectedSlip.net)}
                  </p>
                </div>
                <div className="font-mono text-2xl font-black text-emerald-800">
                  ₹ {selectedSlip.net.toLocaleString('en-IN')}.00
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
                <div className="space-y-8">
                  <div className="h-6"></div>
                  <p className="border-t border-slate-400 pt-1 font-semibold">Employee Signature</p>
                </div>
                <div className="space-y-8">
                  <div className="h-6"></div>
                  <p className="border-t border-slate-400 pt-1 font-semibold">Accounts Officer & Principal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
