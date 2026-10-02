'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  ShieldCheck, 
  TrendingUp,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Trash2
} from 'lucide-react';

type ReportType = 'collection' | 'due' | 'investment' | 'expense' | 'ledger' | 'summary';

export default function ReportsPage() {
  const { collections, members, investments, expenses, transactions, stats, deleteTransaction } = useStore();
  const { user, hasPermission } = useAuth();

  // Selection states
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-07-31');

  // Preview generated trigger
  const [previewGenerated, setPreviewGenerated] = useState(true);

  // Format Currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setPreviewGenerated(true);
  };

  // Export report datasets as CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `fdc_report_${reportType}_${new Date().toISOString().split('T')[0]}`;

    if (reportType === 'collection') {
      headers = ['Receipt No', 'Member Name', 'Month', 'Date', 'Amount', 'Fine', 'Type'];
      rows = collections.map(c => [c.receiptNo, c.memberName, c.month, c.date, c.amount, c.lateFine, c.paymentType]);
    } else if (reportType === 'due') {
      headers = ['Member ID', 'Member Name', 'Phone', 'Monthly Fee', 'Join Date'];
      rows = members.filter(m => m.status === 'active').map(m => [m.id, m.name, m.phone, m.monthlyFee, m.joinDate]);
    } else if (reportType === 'investment') {
      headers = ['Type', 'Provider', 'Principal', 'Interest Rate (%)', 'Maturity', 'Interest Earned', 'Status'];
      rows = investments.map(i => [i.type, i.provider, i.principalAmount, i.interestRate, i.maturityDate, i.interestReceived, i.status]);
    } else if (reportType === 'expense') {
      headers = ['Category', 'Description', 'Payer', 'Date', 'Amount'];
      rows = expenses.map(e => [e.category, e.description, e.paidBy, e.date, e.amount]);
    } else {
      headers = ['Tx ID', 'Date', 'Account', 'Category', 'Description', 'Amount', 'Balance'];
      rows = transactions.map(t => [t.id, t.date, t.account, t.category, t.description, t.amount, t.balanceAfter]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rendering matching preview content
  const renderPreviewTable = () => {
    if (!previewGenerated) {
      return (
        <div className="p-8 text-center text-[var(--muted-foreground)]/70 border border-dashed border-[var(--border)] rounded-xl">
          Configure filters and click "Generate Report Preview" above
        </div>
      );
    }

    switch (reportType) {
      case 'collection':
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-[var(--card-foreground)] text-xs">Collected Invoices Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2">Receipt No</th>
                    <th className="pb-2">Member</th>
                    <th className="pb-2">Month</th>
                    <th className="pb-2">Date Paid</th>
                    <th className="pb-2 text-right">Fine</th>
                    <th className="pb-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {collections.map(c => (
                    <tr key={c.id}>
                      <td className="py-2 text-[var(--foreground)]/80">{c.receiptNo}</td>
                      <td className="py-2 text-[var(--card-foreground)] font-bold">{c.memberName}</td>
                      <td className="py-2 text-indigo-400 font-semibold">{c.month}</td>
                      <td className="py-2 text-[var(--muted-foreground)]">{c.date}</td>
                      <td className="py-2 text-right text-rose-400">{c.lateFine > 0 ? `${c.lateFine} TK` : '-'}</td>
                      <td className="py-2 text-right font-bold text-[var(--card-foreground)]">{(c.amount + c.lateFine).toLocaleString()} TK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'due':
        // Outstanding dues list emulation
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-[var(--card-foreground)] text-xs">Outstanding Dues Directory</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2">Member ID</th>
                    <th className="pb-2">Member Name</th>
                    <th className="pb-2">Phone Number</th>
                    <th className="pb-2">Dues Count</th>
                    <th className="pb-2 text-right">Estimated Due Fees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {members.filter(m => m.status === 'active').slice(0, 3).map(m => (
                    <tr key={m.id}>
                      <td className="py-2 text-[var(--muted-foreground)]/70 font-medium">{m.id}</td>
                      <td className="py-2 text-[var(--card-foreground)] font-bold">{m.name}</td>
                      <td className="py-2 text-[var(--muted-foreground)]">{m.phone}</td>
                      <td className="py-2 text-amber-500 font-bold">1 Month</td>
                      <td className="py-2 text-right font-bold text-[var(--card-foreground)]">{m.monthlyFee.toLocaleString()} TK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'investment':
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-[var(--card-foreground)] text-xs">Investment Portfolio Ledger</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2">Provider</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Principal Value</th>
                    <th className="pb-2 text-center">Rate</th>
                    <th className="pb-2 text-right">Interest Collected</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {investments.map(i => (
                    <tr key={i.id}>
                      <td className="py-2 text-[var(--card-foreground)] font-bold">{i.provider}</td>
                      <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-[var(--accent)] text-[10px] text-zinc-350">{i.type}</span></td>
                      <td className="py-2 text-[var(--card-foreground)] font-bold">{i.principalAmount.toLocaleString()} TK</td>
                      <td className="py-2 text-center text-[var(--muted-foreground)]">{i.interestRate} %</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">{i.interestReceived.toLocaleString()} TK</td>
                      <td className="py-2 text-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400">{i.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'expense':
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-[var(--card-foreground)] text-xs">Office Administrative Expenses Log</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Payer</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Expense Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="py-2 text-[var(--card-foreground)]"><span className="px-1.5 py-0.5 rounded bg-[var(--accent)] text-[10px] text-[var(--foreground)]/80 font-extrabold">{e.category}</span></td>
                      <td className="py-2 text-[var(--foreground)]/80">{e.description}</td>
                      <td className="py-2 text-[var(--muted-foreground)] capitalize">{e.paidBy}</td>
                      <td className="py-2 text-[var(--muted-foreground)]/70 text-[10px]">{e.date}</td>
                      <td className="py-2 text-right text-rose-400 font-bold">{e.amount.toLocaleString()} TK</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'ledger':
        return (
          <div className="space-y-4">
            <h4 className="font-bold text-[var(--card-foreground)] text-xs">Accounting General Ledger Transactions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2">Tx ID</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Account</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Debit</th>
                    <th className="pb-2 text-right">Credit</th>
                    {user?.role === 'super_admin' && <th className="pb-2 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {transactions.slice(0, 8).map(t => {
                    const isCredit = t.type === 'credit';
                    return (
                      <tr key={t.id}>
                        <td className="py-2 text-zinc-550 text-[10px]">{t.id}</td>
                        <td className="py-2 text-[var(--muted-foreground)]/70 text-[10px]">{t.date}</td>
                        <td className="py-2 capitalize text-[var(--foreground)]/80">{t.account}</td>
                        <td className="py-2 text-[var(--foreground)]/80 truncate max-w-[200px]">{t.description}</td>
                        <td className="py-2 text-right text-rose-400 font-semibold">{!isCredit ? `${t.amount.toLocaleString()} TK` : '-'}</td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">{isCredit ? `${t.amount.toLocaleString()} TK` : '-'}</td>
                        {user?.role === 'super_admin' && (
                          <td className="py-2 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to void transaction ${t.id}?`)) {
                                  deleteTransaction(t.id);
                                }
                              }}
                              className="p-1.5 bg-[var(--accent)] hover:bg-zinc-700 text-rose-450 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                              title="Void ledger transaction"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      default: // Summary
        return (
          <div className="space-y-6">
            
            <div className="flex items-center space-x-2 border-b border-[var(--border)] pb-3">
              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <h4 className="font-bold text-[var(--card-foreground)] text-xs">Foundation Q2 Financial Statement Summary</h4>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Auto generated retained earnings analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Revenues vs Expenses */}
              <div className="space-y-3 bg-[var(--background)]/40 p-4 border border-[var(--border)] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Statement of Accounts</p>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Member Collections Revenue</span>
                  <span className="font-bold text-[var(--card-foreground)]">{formatCurrency(stats.totalCollection)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Interest Dividends Earned</span>
                  <span className="font-bold text-[var(--card-foreground)]">{formatCurrency(stats.totalInterestEarned)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)] text-rose-400 font-semibold">
                  <span>Operating Administrative Costs</span>
                  <span>- {formatCurrency(stats.totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-[var(--border)] font-black text-emerald-400">
                  <span>Retained Profits (Net Income)</span>
                  <span>{formatCurrency(stats.totalCollection + stats.totalInterestEarned - stats.totalExpenses)}</span>
                </div>
              </div>

              {/* Right Column: Asset balance allocations */}
              <div className="space-y-3 bg-[var(--background)]/40 p-4 border border-[var(--border)] rounded-2xl">
                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Asset Balance Distributions</p>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Cash in Hand Buffer</span>
                  <span className="font-bold text-[var(--card-foreground)]">{formatCurrency(stats.availableCash)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Bank Accounts Balance</span>
                  <span className="font-bold text-[var(--card-foreground)]">{formatCurrency(stats.bankBalance)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--muted-foreground)]">Active Capital Portfolios</span>
                  <span className="font-bold text-[var(--card-foreground)]">{formatCurrency(stats.totalInvestment)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-[var(--border)] font-black text-indigo-400">
                  <span>Total Capital Assets</span>
                  <span>{formatCurrency(stats.availableCash + stats.bankBalance + stats.totalInvestment)}</span>
                </div>
              </div>

            </div>

          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ---------------- FILTER CONTROLS FORM ---------------- */}
        <div className="glass-panel p-5 rounded-2xl no-print">
          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end text-xs">
            
            {/* Report category selector */}
            <div className="md:col-span-2">
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Select Report Module</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)]/80 focus:outline-none cursor-pointer"
              >
                <option value="summary">Financial Summary (Retained Earnings)</option>
                <option value="collection">Collections Report (Invoices Listing)</option>
                <option value="due">Due Collections Report (Active Dues)</option>
                <option value="investment">Investment Ledger Report (FDR/DPS)</option>
                <option value="expense">Expense Log Report (Admin Costs)</option>
                <option value="ledger">General Ledger Journal (Double-entry)</option>
              </select>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Reporting Period</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)]/80 focus:outline-none"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Date Horizon From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)]/80 focus:outline-none"
              />
            </div>

            {/* Submit generate */}
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-center shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              Generate Preview
            </button>

          </form>
        </div>

        {/* ---------------- PREVIEW CONTAINER & EXPORTS ---------------- */}
        {previewGenerated && (
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            
            {/* Header controls inside preview panel */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 no-print">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Preview Panel</span>
                <h3 className="text-sm font-black text-[var(--foreground)] capitalize">
                  {reportType.replace('_', ' ')} Statement Report
                </h3>
              </div>

              {/* Download links */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--accent)] text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report (PDF)</span>
                </button>
              </div>
            </div>

            {/* Renders preview table content */}
            <div>
              {renderPreviewTable()}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
