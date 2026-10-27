'use client';

import React, { useState, useMemo } from 'react';
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
  Trash2,
  Filter,
  Layers,
  PieChart,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { exportElementToPDF, exportTableToPDF } from '../../lib/pdf-export';
import { exportToExcel } from '../../lib/excel-export';

type ReportType = 'summary' | 'expense' | 'collection' | 'investment' | 'loan' | 'ledger' | 'due';

export default function ReportsPage() {
  const { 
    collections, 
    members, 
    investments, 
    expenses, 
    transactions, 
    loans = [], 
    stats, 
    deleteTransaction 
  } = useStore();
  const { user } = useAuth();

  // ── Filters State ────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState<ReportType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickPeriod, setQuickPeriod] = useState<string>('all');

  // Export Loading States
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // ── Format Currency Helper ───────────────────────────────────────────────
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-BD', { 
      style: 'currency', 
      currency: 'BDT', 
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  // ── Preset Date Horizon Handlers ─────────────────────────────────────────
  const handlePeriodChange = (period: string) => {
    setQuickPeriod(period);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (period === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setDateFrom(`${year}-${month}-01`);
      setDateTo(todayStr);
    } else if (period === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(prevMonth.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (period === 'this_year') {
      const year = now.getFullYear();
      setDateFrom(`${year}-01-01`);
      setDateTo(todayStr);
    }
  };

  // Reset category filter when switching report type
  const handleReportTypeChange = (newType: ReportType) => {
    setReportType(newType);
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPaymentType('all');
    setSelectedAccount('all');
  };

  // ── Dynamic Category List Extraction ─────────────────────────────────────
  const availableCategories = useMemo(() => {
    if (reportType === 'expense') {
      const set = new Set<string>();
      set.add('Office Rent');
      set.add('Staff Salary');
      set.add('Utilities');
      set.add('Maintenance');
      set.add('Entertainment');
      set.add('Transport');
      set.add('Misc');
      expenses.forEach(e => { if (e.category) set.add(e.category); });
      return Array.from(set);
    }

    if (reportType === 'investment') {
      const set = new Set<string>();
      set.add('FDR');
      set.add('DPS');
      set.add('Savings');
      set.add('Business');
      set.add('Loan');
      set.add('Share Market');
      set.add('Mutual Fund');
      investments.forEach(i => { if (i.type) set.add(i.type); });
      return Array.from(set);
    }

    if (reportType === 'loan') {
      const set = new Set<string>();
      set.add('personal');
      set.add('business');
      set.add('emergency');
      set.add('welfare');
      loans.forEach(l => { if (l.loanType) set.add(l.loanType); });
      return Array.from(set);
    }

    if (reportType === 'ledger') {
      const set = new Set<string>();
      transactions.forEach(t => { if (t.category) set.add(t.category); });
      return Array.from(set);
    }

    return [];
  }, [reportType, expenses, investments, loans, transactions]);

  // ── Filtered Datasets ────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // 1. EXPENSES
    if (reportType === 'expense') {
      return expenses.filter(item => {
        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        // Date range
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        // Search query
        if (query) {
          const matchCategory = item.category?.toLowerCase().includes(query);
          const matchDesc = item.description?.toLowerCase().includes(query);
          const matchPayer = item.paidBy?.toLowerCase().includes(query);
          if (!matchCategory && !matchDesc && !matchPayer) return false;
        }
        return true;
      });
    }

    // 2. COLLECTIONS
    if (reportType === 'collection') {
      return collections.filter(item => {
        // Payment type filter
        if (selectedPaymentType !== 'all' && item.paymentType?.toLowerCase() !== selectedPaymentType.toLowerCase()) return false;
        // Date range
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        // Search query
        if (query) {
          const matchMember = item.memberName?.toLowerCase().includes(query);
          const matchReceipt = item.receiptNo?.toLowerCase().includes(query);
          const matchMonth = item.month?.toLowerCase().includes(query);
          if (!matchMember && !matchReceipt && !matchMonth) return false;
        }
        return true;
      });
    }

    // 3. INVESTMENTS
    if (reportType === 'investment') {
      return investments.filter(item => {
        // Category / Type filter
        if (selectedCategory !== 'all' && item.type !== selectedCategory) return false;
        // Status filter
        if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
        // Date range (startDate)
        if (dateFrom && item.startDate < dateFrom) return false;
        if (dateTo && item.startDate > dateTo) return false;
        // Search query
        if (query) {
          const matchProvider = item.provider?.toLowerCase().includes(query);
          const matchType = item.type?.toLowerCase().includes(query);
          if (!matchProvider && !matchType) return false;
        }
        return true;
      });
    }

    // 4. LOANS
    if (reportType === 'loan') {
      return loans.filter(item => {
        // Category (loanType) filter
        if (selectedCategory !== 'all' && item.loanType !== selectedCategory) return false;
        // Status filter
        if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
        // Date range (disbursedDate)
        if (dateFrom && item.disbursedDate < dateFrom) return false;
        if (dateTo && item.disbursedDate > dateTo) return false;
        // Search query
        if (query) {
          const matchName = item.memberName?.toLowerCase().includes(query);
          const matchNo = item.loanNo?.toLowerCase().includes(query);
          const matchPurpose = item.purpose?.toLowerCase().includes(query);
          if (!matchName && !matchNo && !matchPurpose) return false;
        }
        return true;
      });
    }

    // 5. LEDGER TRANSACTIONS
    if (reportType === 'ledger') {
      return transactions.filter(item => {
        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
        // Account filter
        if (selectedAccount !== 'all' && item.account !== selectedAccount) return false;
        // Date range
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        // Search query
        if (query) {
          const matchDesc = item.description?.toLowerCase().includes(query);
          const matchCategory = item.category?.toLowerCase().includes(query);
          const matchId = item.id?.toLowerCase().includes(query);
          if (!matchDesc && !matchCategory && !matchId) return false;
        }
        return true;
      });
    }

    // 6. MEMBER DUES
    if (reportType === 'due') {
      return members.filter(m => m.status === 'active').filter(item => {
        if (query) {
          const matchName = item.name?.toLowerCase().includes(query);
          const matchId = item.id?.toLowerCase().includes(query);
          const matchPhone = item.phone?.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchPhone) return false;
        }
        return true;
      });
    }

    return [];
  }, [reportType, expenses, collections, investments, loans, transactions, members, selectedCategory, selectedStatus, selectedPaymentType, selectedAccount, dateFrom, dateTo, searchQuery]);

  // ── Category Aggregation Breakdown ───────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalAmount: number }>();

    if (reportType === 'expense') {
      filteredData.forEach((e: any) => {
        const cat = e.category || 'Uncategorized';
        const curr = map.get(cat) || { count: 0, totalAmount: 0 };
        map.set(cat, {
          count: curr.count + 1,
          totalAmount: curr.totalAmount + (Number(e.amount) || 0)
        });
      });
    } else if (reportType === 'investment') {
      filteredData.forEach((i: any) => {
        const cat = i.type || 'Other';
        const curr = map.get(cat) || { count: 0, totalAmount: 0 };
        map.set(cat, {
          count: curr.count + 1,
          totalAmount: curr.totalAmount + (Number(i.principalAmount) || 0)
        });
      });
    } else if (reportType === 'loan') {
      filteredData.forEach((l: any) => {
        const cat = l.loanType || 'General';
        const curr = map.get(cat) || { count: 0, totalAmount: 0 };
        map.set(cat, {
          count: curr.count + 1,
          totalAmount: curr.totalAmount + (Number(l.principalAmount) || 0)
        });
      });
    } else if (reportType === 'collection') {
      filteredData.forEach((c: any) => {
        const cat = (c.paymentType || 'Cash').toUpperCase();
        const curr = map.get(cat) || { count: 0, totalAmount: 0 };
        map.set(cat, {
          count: curr.count + 1,
          totalAmount: curr.totalAmount + (Number(c.amount) || 0) + (Number(c.lateFine) || 0)
        });
      });
    } else if (reportType === 'ledger') {
      filteredData.forEach((t: any) => {
        const cat = t.category || 'General';
        const curr = map.get(cat) || { count: 0, totalAmount: 0 };
        map.set(cat, {
          count: curr.count + 1,
          totalAmount: curr.totalAmount + (Number(t.amount) || 0)
        });
      });
    }

    return Array.from(map.entries()).map(([name, val]) => ({
      category: name,
      count: val.count,
      totalAmount: val.totalAmount
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [reportType, filteredData]);

  // Total summary of filtered records
  const totalSummaryAmount = useMemo(() => {
    if (reportType === 'expense') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    if (reportType === 'collection') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.amount) || 0) + (Number(item.lateFine) || 0), 0);
    }
    if (reportType === 'investment') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.principalAmount) || 0), 0);
    }
    if (reportType === 'loan') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.principalAmount) || 0), 0);
    }
    if (reportType === 'ledger') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    if (reportType === 'due') {
      return (filteredData as any[]).reduce((sum, item) => sum + (Number(item.monthlyFee) || 0), 0);
    }
    return 0;
  }, [reportType, filteredData]);

  // ── EXPORT TO EXCEL (.xlsx) ──────────────────────────────────────────────
  const handleExportExcel = () => {
    setExportingExcel(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `FDC_${reportType.toUpperCase()}_REPORT_${selectedCategory !== 'all' ? selectedCategory + '_' : ''}${today}`;

      let excelRows: Record<string, any>[] = [];

      if (reportType === 'expense') {
        excelRows = (filteredData as any[]).map((e, idx) => ({
          'SL': idx + 1,
          'Date': e.date,
          'Category': e.category,
          'Description': e.description,
          'Paid By': e.paidBy,
          'Amount (BDT)': Number(e.amount) || 0,
        }));
        // Total row at bottom
        excelRows.push({
          'SL': '',
          'Date': 'TOTAL',
          'Category': '',
          'Description': `Total ${filteredData.length} Expenses`,
          'Paid By': '',
          'Amount (BDT)': totalSummaryAmount,
        });
      } else if (reportType === 'collection') {
        excelRows = (filteredData as any[]).map((c, idx) => ({
          'SL': idx + 1,
          'Receipt No': c.receiptNo,
          'Member Name': c.memberName,
          'Month': c.month,
          'Date': c.date,
          'Method': (c.paymentType || 'Cash').toUpperCase(),
          'Base Amount (BDT)': Number(c.amount) || 0,
          'Late Fine (BDT)': Number(c.lateFine) || 0,
          'Total Paid (BDT)': (Number(c.amount) || 0) + (Number(c.lateFine) || 0),
        }));
        excelRows.push({
          'SL': '',
          'Receipt No': 'TOTAL',
          'Member Name': '',
          'Month': '',
          'Date': '',
          'Method': '',
          'Base Amount (BDT)': '',
          'Late Fine (BDT)': '',
          'Total Paid (BDT)': totalSummaryAmount,
        });
      } else if (reportType === 'investment') {
        excelRows = (filteredData as any[]).map((i, idx) => ({
          'SL': idx + 1,
          'Provider / Bank': i.provider,
          'Category / Type': i.type,
          'Principal (BDT)': Number(i.principalAmount) || 0,
          'Interest Rate (%)': Number(i.interestRate) || 0,
          'Start Date': i.startDate,
          'Maturity Date': i.maturityDate,
          'Interest Received (BDT)': Number(i.interestReceived) || 0,
          'Status': (i.status || '').toUpperCase(),
        }));
      } else if (reportType === 'loan') {
        excelRows = (filteredData as any[]).map((l, idx) => ({
          'SL': idx + 1,
          'Loan No': l.loanNo,
          'Borrower': l.memberName,
          'Loan Type': (l.loanType || '').toUpperCase(),
          'Disbursed Date': l.disbursedDate,
          'Principal (BDT)': Number(l.principalAmount) || 0,
          'Interest Rate (%)': Number(l.interestRate) || 0,
          'Total Payable (BDT)': Number(l.totalPayable) || 0,
          'Total Repaid (BDT)': Number(l.totalRepaid) || 0,
          'Remaining Balance (BDT)': (Number(l.totalPayable) || 0) - (Number(l.totalRepaid) || 0),
          'Status': (l.status || '').toUpperCase(),
        }));
      } else if (reportType === 'ledger') {
        excelRows = (filteredData as any[]).map((t, idx) => ({
          'SL': idx + 1,
          'Tx ID': t.id,
          'Date': t.date,
          'Account': (t.account || '').toUpperCase(),
          'Category': t.category,
          'Description': t.description,
          'Debit (BDT)': t.type === 'debit' ? Number(t.amount) : 0,
          'Credit (BDT)': t.type === 'credit' ? Number(t.amount) : 0,
          'Balance After (BDT)': Number(t.balanceAfter) || 0,
        }));
      } else if (reportType === 'due') {
        excelRows = (filteredData as any[]).map((m, idx) => ({
          'SL': idx + 1,
          'Member ID': m.id,
          'Member Name': m.name,
          'Phone': m.phone,
          'Monthly Fee (BDT)': Number(m.monthlyFee) || 0,
          'Join Date': m.joinDate,
          'Status': (m.status || '').toUpperCase(),
        }));
      } else {
        // Summary
        excelRows = categoryBreakdown.map((c, idx) => ({
          'SL': idx + 1,
          'Category': c.category,
          'Total Records': c.count,
          'Total Amount (BDT)': c.totalAmount,
        }));
      }

      exportToExcel(excelRows, filename, reportType.toUpperCase());
    } catch (err) {
      console.error('Excel Export Error:', err);
    } finally {
      setExportingExcel(false);
    }
  };

  // ── EXPORT TO PDF ────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `FDC_${reportType.toUpperCase()}_REPORT_${today}`;
      await exportElementToPDF('reports-preview-area', filename);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── EXPORT TO CSV ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const today = new Date().toISOString().split('T')[0];
    const filename = `FDC_${reportType.toUpperCase()}_${today}.csv`;
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'expense') {
      headers = ['SL', 'Date', 'Category', 'Description', 'Paid By', 'Amount'];
      rows = (filteredData as any[]).map((e, idx) => [idx + 1, e.date, e.category, `"${(e.description || '').replace(/"/g, '""')}"`, e.paidBy, e.amount]);
    } else if (reportType === 'collection') {
      headers = ['SL', 'Receipt No', 'Member Name', 'Month', 'Date', 'Method', 'Amount', 'Fine', 'Total'];
      rows = (filteredData as any[]).map((c, idx) => [idx + 1, c.receiptNo, c.memberName, c.month, c.date, c.paymentType, c.amount, c.lateFine, c.amount + c.lateFine]);
    } else if (reportType === 'investment') {
      headers = ['SL', 'Provider', 'Category', 'Principal', 'Interest Rate', 'Maturity', 'Status'];
      rows = (filteredData as any[]).map((i, idx) => [idx + 1, i.provider, i.type, i.principalAmount, i.interestRate, i.maturityDate, i.status]);
    } else if (reportType === 'loan') {
      headers = ['SL', 'Loan No', 'Member', 'Type', 'Principal', 'Interest Rate', 'Total Payable', 'Total Repaid', 'Status'];
      rows = (filteredData as any[]).map((l, idx) => [idx + 1, l.loanNo, l.memberName, l.loanType, l.principalAmount, l.interestRate, l.totalPayable, l.totalRepaid, l.status]);
    } else {
      headers = ['SL', 'Tx ID', 'Date', 'Account', 'Category', 'Description', 'Amount', 'Balance'];
      rows = (filteredData as any[]).map((t, idx) => [idx + 1, t.id, t.date, t.account, t.category, `"${(t.description || '').replace(/"/g, '""')}"`, t.amount, t.balanceAfter]);
    }

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── HEADER BANNER ── */}
        <div className="glass-panel p-5 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-[var(--foreground)] tracking-tight">Category-wise Reports & Analytics</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  ক্যাটাগরি-ভিত্তিক ফিল্টার, বিস্তারিত অডিট রিপোর্ট তৈরি এবং সরাসরি Excel (.xlsx) ও PDF ডাউনলোড করুন।
                </p>
              </div>
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center space-x-1.5 bg-[var(--background)] p-1 rounded-xl border border-[var(--border)] self-start md:self-auto no-print">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodChange(p.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  quickPeriod === p.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MODULE SELECTOR TABS ── */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none no-print">
          {[
            { id: 'expense', label: 'Expenses (খরচ)', icon: DollarSign, color: 'text-rose-400' },
            { id: 'collection', label: 'Collections (চাঁদা আদায়)', icon: CreditCard, color: 'text-emerald-400' },
            { id: 'investment', label: 'Investments (বিনিয়োগ)', icon: TrendingUp, color: 'text-indigo-400' },
            { id: 'loan', label: 'Loans (ঋণ)', icon: Layers, color: 'text-amber-400' },
            { id: 'ledger', label: 'Ledger (খতিয়ান)', icon: FileText, color: 'text-cyan-400' },
            { id: 'due', label: 'Active Dues (বকেয়া)', icon: AlertTriangle, color: 'text-orange-400' },
            { id: 'summary', label: 'Summary (আর্থিক সারাংশ)', icon: PieChart, color: 'text-purple-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleReportTypeChange(tab.id as ReportType)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'glass-panel text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--accent)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── FILTER CONTROLS BAR ── */}
        <div className="glass-panel p-4 rounded-2xl border border-[var(--border)] no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end text-xs">
            
            {/* Category Selector (Dynamic) */}
            {availableCategories.length > 0 && (
              <div>
                <label className="block text-[var(--muted-foreground)] font-bold mb-1.5 flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Category (ক্যাটাগরি)</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">🌟 All Categories (সকল ক্যাটাগরি)</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Collection Payment Method Filter */}
            {reportType === 'collection' && (
              <div>
                <label className="block text-[var(--muted-foreground)] font-bold mb-1.5 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment Method</span>
                </label>
                <select
                  value={selectedPaymentType}
                  onChange={(e) => setSelectedPaymentType(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash (নগদ)</option>
                  <option value="bkash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ)</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            )}

            {/* Status Filter for Investment & Loans */}
            {(reportType === 'investment' || reportType === 'loan') && (
              <div>
                <label className="block text-[var(--muted-foreground)] font-bold mb-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Status Filter</span>
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  {reportType === 'investment' ? (
                    <>
                      <option value="running">Running / Active</option>
                      <option value="matured">Matured</option>
                      <option value="closed">Closed</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active / Running</option>
                      <option value="pending">Pending Approval</option>
                      <option value="repaid">Fully Repaid</option>
                      <option value="defaulted">Defaulted</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Ledger Account Filter */}
            {reportType === 'ledger' && (
              <div>
                <label className="block text-[var(--muted-foreground)] font-bold mb-1.5 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Account Filter</span>
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  <option value="cash">Cash Account</option>
                  <option value="bank">Bank Account</option>
                  <option value="investment">Investment Account</option>
                </select>
              </div>
            )}

            {/* Date From */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-bold mb-1.5">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)] focus:outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-bold mb-1.5">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)] focus:outline-none"
              />
            </div>

            {/* Search Query */}
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-[var(--muted-foreground)] font-bold mb-1.5 flex items-center space-x-1">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span>Search Keyword</span>
              </label>
              <input
                type="text"
                placeholder="Search description, name, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

          </div>
        </div>

        {/* ── METRICS SUMMARY STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Filtered Records</span>
            <p className="text-xl font-black text-[var(--foreground)] mt-1">{filteredData.length}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              {reportType === 'expense' ? 'Total Expenses' :
               reportType === 'collection' ? 'Total Collections' :
               reportType === 'investment' ? 'Total Capital' :
               reportType === 'loan' ? 'Total Loan Capital' : 'Total Amount'}
            </span>
            <p className="text-xl font-black text-indigo-400 mt-1">{formatCurrency(totalSummaryAmount)}</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Active Category</span>
            <p className="text-sm font-black text-emerald-400 mt-1 truncate">
              {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Average / Record</span>
            <p className="text-xl font-black text-amber-400 mt-1">
              {filteredData.length > 0 ? formatCurrency(Math.round(totalSummaryAmount / filteredData.length)) : '0 TK'}
            </p>
          </div>
        </div>

        {/* ── PREVIEW PANEL & EXPORTS ── */}
        <div className="glass-panel p-5 rounded-2xl border border-[var(--border)] space-y-5">
          
          {/* Header Bar with Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4 no-print">
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Interactive Report</span>
              <h3 className="text-base font-black text-[var(--foreground)] capitalize flex items-center space-x-2">
                <span>{reportType} Statement</span>
                {selectedCategory !== 'all' && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    {selectedCategory}
                  </span>
                )}
              </h3>
            </div>

            {/* EXPORT ACTION BUTTONS */}
            <div className="flex items-center flex-wrap gap-2">
              {/* EXCEL EXPORT BUTTON */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exportingExcel || filteredData.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                title="Export this report directly to Microsoft Excel (.xlsx)"
              >
                {exportingExcel ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Excel (.xlsx)</span>
              </button>

              {/* PDF EXPORT BUTTON */}
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exportingPdf || filteredData.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                title="Export this report to PDF Document (.pdf)"
              >
                {exportingPdf ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>PDF (.pdf)</span>
              </button>

              {/* CSV EXPORT BUTTON */}
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredData.length === 0}
                className="flex items-center space-x-1 px-3 py-2 bg-[var(--secondary)] hover:bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                title="Export as raw CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              {/* PRINT BUTTON */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Print Report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* ── REPORT CONTENT (CAPTURED BY PDF EXPORT) ── */}
          <div id="reports-preview-area" className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-6">
            
            {/* Printable Report Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  FDC
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--foreground)]">Friends Development Committee (FDC)</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Official Report: <span className="font-bold text-indigo-400 capitalize">{reportType} Statement</span>
                    {selectedCategory !== 'all' && ` • Category: ${selectedCategory}`}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-[var(--muted-foreground)]">
                <p>Generated: <span className="font-bold text-[var(--foreground)]">{new Date().toLocaleDateString('en-BD')}</span></p>
                <p>Total Records: <strong className="text-[var(--foreground)]">{filteredData.length}</strong></p>
                <p>Total Value: <strong className="text-emerald-400">{formatCurrency(totalSummaryAmount)}</strong></p>
              </div>
            </div>

            {/* CATEGORY BREAKDOWN TABLE (IF APPLICABLE) */}
            {categoryBreakdown.length > 0 && selectedCategory === 'all' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider flex items-center space-x-1.5">
                    <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Category Summary Breakdown (ক্যাটাগরি বিশ্লেষণ)</span>
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--accent)] text-[var(--muted-foreground)] border-b border-[var(--border)] font-bold">
                        <th className="py-2.5 px-3">Category Name</th>
                        <th className="py-2.5 px-3 text-center">Record Count</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {categoryBreakdown.map((c) => {
                        const percent = totalSummaryAmount > 0 
                          ? ((c.totalAmount / totalSummaryAmount) * 100).toFixed(1) 
                          : '0';
                        return (
                          <tr key={c.category} className="hover:bg-[var(--accent)]/50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[var(--foreground)] flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              <span>{c.category}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">{c.count}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-[var(--foreground)]">{formatCurrency(c.totalAmount)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-400">{percent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DETAILED DATA TABLE */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Detailed Transaction Records ({filteredData.length} records)</span>
              </h4>

              {filteredData.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl">
                  নির্বাচিত ক্যাটাগরি বা তারিখ অনুযায়ী কোনো রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--accent)] text-[var(--muted-foreground)] border-b border-[var(--border)] font-bold">
                        <th className="py-2.5 px-3 text-center w-12">SL</th>
                        
                        {/* Table Columns based on reportType */}
                        {reportType === 'expense' && (
                          <>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Paid By</th>
                            <th className="py-2.5 px-3 text-right">Amount (TK)</th>
                          </>
                        )}

                        {reportType === 'collection' && (
                          <>
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Member Name</th>
                            <th className="py-2.5 px-3">Month</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3 text-right">Fine</th>
                            <th className="py-2.5 px-3 text-right">Total (TK)</th>
                          </>
                        )}

                        {reportType === 'investment' && (
                          <>
                            <th className="py-2.5 px-3">Provider</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Principal</th>
                            <th className="py-2.5 px-3 text-center">Rate</th>
                            <th className="py-2.5 px-3">Maturity Date</th>
                            <th className="py-2.5 px-3 text-right">Returns</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </>
                        )}

                        {reportType === 'loan' && (
                          <>
                            <th className="py-2.5 px-3">Loan No</th>
                            <th className="py-2.5 px-3">Borrower</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3 text-right">Principal</th>
                            <th className="py-2.5 px-3 text-right">Total Payable</th>
                            <th className="py-2.5 px-3 text-right">Repaid</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </>
                        )}

                        {reportType === 'ledger' && (
                          <>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Account</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">Debit</th>
                            <th className="py-2.5 px-3 text-right">Credit</th>
                          </>
                        )}

                        {reportType === 'due' && (
                          <>
                            <th className="py-2.5 px-3">Member ID</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3">Join Date</th>
                            <th className="py-2.5 px-3 text-right">Monthly Fee</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {(filteredData as any[]).map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-[var(--accent)]/40 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[var(--muted-foreground)] font-bold">
                            {idx + 1}
                          </td>

                          {/* EXPENSE ROW */}
                          {reportType === 'expense' && (
                            <>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.date}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                                  {row.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[var(--foreground)]">{row.description}</td>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)] capitalize">{row.paidBy}</td>
                              <td className="py-2.5 px-3 text-right font-black text-rose-400">
                                {formatCurrency(row.amount)}
                              </td>
                            </>
                          )}

                          {/* COLLECTION ROW */}
                          {reportType === 'collection' && (
                            <>
                              <td className="py-2.5 px-3 font-mono text-zinc-400">{row.receiptNo}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">{row.memberName}</td>
                              <td className="py-2.5 px-3 text-indigo-400 font-semibold">{row.month}</td>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.date}</td>
                              <td className="py-2.5 px-3 text-xs uppercase font-bold text-zinc-300">{row.paymentType || 'Cash'}</td>
                              <td className="py-2.5 px-3 text-right text-rose-400">
                                {row.lateFine > 0 ? `${row.lateFine} TK` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                                {formatCurrency((row.amount || 0) + (row.lateFine || 0))}
                              </td>
                            </>
                          )}

                          {/* INVESTMENT ROW */}
                          {reportType === 'investment' && (
                            <>
                              <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">{row.provider}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-[10px]">
                                  {row.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[var(--foreground)]">
                                {formatCurrency(row.principalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-center text-[var(--muted-foreground)]">{row.interestRate}%</td>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.maturityDate}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                {formatCurrency(row.interestReceived)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[var(--accent)] text-indigo-400">
                                  {row.status}
                                </span>
                              </td>
                            </>
                          )}

                          {/* LOAN ROW */}
                          {reportType === 'loan' && (
                            <>
                              <td className="py-2.5 px-3 font-mono text-zinc-400">{row.loanNo}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">{row.memberName}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[10px] uppercase">
                                  {row.loanType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-[var(--foreground)]">
                                {formatCurrency(row.principalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                                {formatCurrency(row.totalPayable)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                {formatCurrency(row.totalRepaid)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[var(--accent)] text-zinc-300">
                                  {row.status}
                                </span>
                              </td>
                            </>
                          )}

                          {/* LEDGER ROW */}
                          {reportType === 'ledger' && (
                            <>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.date}</td>
                              <td className="py-2.5 px-3 font-bold capitalize text-[var(--foreground)]">{row.account}</td>
                              <td className="py-2.5 px-3 text-indigo-400 font-semibold">{row.category}</td>
                              <td className="py-2.5 px-3 text-[var(--foreground)] max-w-xs truncate">{row.description}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                                {row.type === 'debit' ? formatCurrency(row.amount) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                {row.type === 'credit' ? formatCurrency(row.amount) : '-'}
                              </td>
                            </>
                          )}

                          {/* DUE ROW */}
                          {reportType === 'due' && (
                            <>
                              <td className="py-2.5 px-3 font-mono text-zinc-400">{row.id}</td>
                              <td className="py-2.5 px-3 font-bold text-[var(--foreground)]">{row.name}</td>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.phone}</td>
                              <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.joinDate}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                                {formatCurrency(row.monthlyFee)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>

                    {/* Table Footer Totals */}
                    <tfoot>
                      <tr className="bg-[var(--accent)] border-t-2 border-[var(--border)] font-black text-xs">
                        <td colSpan={reportType === 'collection' ? 6 : reportType === 'expense' ? 4 : 3} className="py-3 px-3 text-right uppercase tracking-wider text-[var(--foreground)]">
                          Total Amount:
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-black text-sm">
                          {formatCurrency(totalSummaryAmount)}
                        </td>
                        {reportType === 'investment' && <td colSpan={3} />}
                        {reportType === 'loan' && <td colSpan={3} />}
                        {reportType === 'ledger' && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Official Signatures Line for Print & PDF */}
            <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] mt-8">
              <div>
                <div className="border-t border-dashed border-[var(--muted-foreground)]/50 pt-2 w-36 mx-auto" />
                <p className="font-bold text-[var(--foreground)]">Prepared By</p>
                <p className="text-[10px]">Accountant / Officer</p>
              </div>

              <div>
                <div className="border-t border-dashed border-[var(--muted-foreground)]/50 pt-2 w-36 mx-auto" />
                <p className="font-bold text-[var(--foreground)]">Audited / Checked By</p>
                <p className="text-[10px]">Internal Audit Committee</p>
              </div>

              <div>
                <div className="border-t border-dashed border-[var(--muted-foreground)]/50 pt-2 w-36 mx-auto" />
                <p className="font-bold text-[var(--foreground)]">Authorized Signature</p>
                <p className="text-[10px]">President / General Secretary</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
