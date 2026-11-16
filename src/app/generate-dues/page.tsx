'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import ConfirmModal from '../../components/confirm-modal';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { DueDemand } from '../../types';
import { 
  CalendarClock, 
  PlusCircle, 
  Trash2, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  X, 
  Loader2, 
  FileSpreadsheet, 
  Download, 
  Layers, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import Link from 'next/link';
import ExcelImportModal, { downloadDuesTemplate } from '../../components/excel-import-modal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function GenerateDuesPage() {
  const { members, collections, dueDemands, addDueDemand, deleteDueDemand, importPreviousDues } = useStore();
  const { user } = useAuth();

  const canManageDues = user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';

  const [importModalOpen, setImportModalOpen] = useState(false);

  // ───── Single Month Generate Modal state ─────
  const [modalOpen, setModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [demandTitle, setDemandTitle] = useState<string>('Monthly Subscription Fee');
  const [amountType, setAmountType] = useState<'member_fee' | 'fixed'>('member_fee');
  const [fixedAmount, setFixedAmount] = useState<number>(1000);
  const [cutoffDay, setCutoffDay] = useState<number>(10);
  const [lateFine, setLateFine] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // ───── Bulk Generate Modal state ─────
  const currentYear = new Date().getFullYear();
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    // Default to all 12 months of current year
    return Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
  });
  const [rangeStart, setRangeStart] = useState<string>(`${currentYear}-01`);
  const [rangeEnd, setRangeEnd] = useState<string>(`${currentYear}-12`);
  const [bulkAmountType, setBulkAmountType] = useState<'member_fee' | 'fixed'>('member_fee');
  const [bulkFixedAmount, setBulkFixedAmount] = useState<number>(1000);
  const [bulkCutoffDay, setBulkCutoffDay] = useState<number>(10);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string>('');

  // ───── Delete Single Modal state ─────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<DueDemand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ───── Delete All Dues state ─────
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // ───── Feedback banner state ─────
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(val);
  };

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Toggle single month in bulk selection
  const toggleMonth = (mStr: string) => {
    setSelectedMonths(prev => 
      prev.includes(mStr) ? prev.filter(m => m !== mStr) : [...prev, mStr].sort()
    );
  };

  // Select all 12 months of selected year
  const selectFullYear = (year: number) => {
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    setSelectedMonths(prev => {
      const otherYears = prev.filter(m => !m.startsWith(`${year}-`));
      return [...otherYears, ...months].sort();
    });
  };

  // Clear months of selected year
  const clearYear = (year: number) => {
    setSelectedMonths(prev => prev.filter(m => !m.startsWith(`${year}-`)));
  };

  // Apply Range from rangeStart to rangeEnd
  const handleApplyRange = () => {
    if (!rangeStart || !rangeEnd) return;
    if (rangeStart > rangeEnd) {
      alert('Start Month must be before or equal to End Month');
      return;
    }
    const [sy, sm] = rangeStart.split('-').map(Number);
    const [ey, em] = rangeEnd.split('-').map(Number);
    const months: string[] = [];
    let curY = sy;
    let curM = sm;
    while (curY < ey || (curY === ey && curM <= em)) {
      months.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    setSelectedMonths(months);
  };

  // ───── Single Generate ─────
  const handleGenerateDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMonth) {
      alert('Please select a billing month');
      return;
    }

    const existing = dueDemands.find(d => d.month === targetMonth);
    if (existing) {
      alert(`A due demand for ${targetMonth} already exists! Please edit or delete the existing demand.`);
      return;
    }

    setLoading(true);
    try {
      const dueDate = `${targetMonth}-${String(cutoffDay).padStart(2, '0')}`;
      await addDueDemand({
        month: targetMonth,
        title: demandTitle || `Monthly Subscription Fee - ${targetMonth}`,
        dueDate,
        amountType,
        fixedAmount: amountType === 'fixed' ? Number(fixedAmount) : undefined,
        lateFine: 0,
        applicableTo: 'all',
        createdBy: user?.name || 'Administrator'
      });

      setModalOpen(false);
      showFeedback(`Successfully generated due demand for ${targetMonth}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate due demand.');
    } finally {
      setLoading(false);
    }
  };

  // ───── Bulk Generate ─────
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonths.length === 0) {
      alert('Please select at least one month from the calendar');
      return;
    }

    setBulkLoading(true);
    let generated = 0;
    let skipped = 0;
    try {
      const sortedMonths = [...selectedMonths].sort();
      for (let i = 0; i < sortedMonths.length; i++) {
        const month = sortedMonths[i];
        setBulkProgress(`Generating ${month}... (${i + 1}/${sortedMonths.length})`);
        const existing = dueDemands.find(d => d.month === month);
        if (existing) { 
          skipped++; 
          continue; 
        }
        const dueDate = `${month}-${String(bulkCutoffDay).padStart(2, '0')}`;
        await addDueDemand({
          month,
          title: `Monthly Subscription Fee - ${month}`,
          dueDate,
          amountType: bulkAmountType,
          fixedAmount: bulkAmountType === 'fixed' ? Number(bulkFixedAmount) : undefined,
          lateFine: 0,
          applicableTo: 'all',
          createdBy: user?.name || 'Administrator'
        });
        generated++;
      }
      setBulkModalOpen(false);
      setBulkProgress('');
      showFeedback(`Success: ${generated} month(s) generated${skipped > 0 ? `, ${skipped} already existed (skipped)` : ''}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate some months.');
    } finally {
      setBulkLoading(false);
      setBulkProgress('');
    }
  };

  // ───── Single Delete ─────
  const handlePromptDelete = (demand: DueDemand) => {
    setDemandToDelete(demand);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!demandToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDueDemand(demandToDelete.id);
      setDeleteConfirmOpen(false);
      setDemandToDelete(null);
      showFeedback(`Deleted due demand for ${demandToDelete.month}`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete demand.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ───── Delete All ─────
  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      for (const demand of dueDemands) {
        await deleteDueDemand(demand.id);
      }
      setDeleteAllConfirmOpen(false);
      showFeedback(`All ${dueDemands.length} due demands deleted successfully.`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete all due demands.');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  // Quick generate next month
  const handleQuickNextMonth = () => {
    const months = dueDemands.map(d => d.month).sort();
    let nextMonthStr = '';
    if (months.length > 0) {
      const last = months[months.length - 1];
      const [y, m] = last.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const d = new Date();
      nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    setTargetMonth(nextMonthStr);
    setDemandTitle(`Monthly Subscription Fee - ${nextMonthStr}`);
    setModalOpen(true);
  };

  // Calculate statistics per demand
  const demandStatsList = useMemo(() => {
    return dueDemands.map(demand => {
      let paidCount = 0;
      let paidAmount = 0;
      let dueCount = 0;
      let dueAmount = 0;

      activeMembers.forEach(m => {
        const paidRecord = collections.find(
          c => c.memberId === m.id && c.month === demand.month && c.status === 'paid'
        );
        const baseFee = demand.amountType === 'fixed' 
          ? (demand.fixedAmount || 1000) 
          : (m.monthlyFee || 1000);

        if (paidRecord) {
          paidCount++;
          paidAmount += (paidRecord.amount + (paidRecord.lateFine || 0));
        } else {
          dueCount++;
          dueAmount += baseFee;
        }
      });

      const totalDemandValue = paidAmount + dueAmount;
      const recoveryRate = totalDemandValue > 0 ? Math.round((paidAmount / totalDemandValue) * 100) : 0;

      return {
        demand,
        paidCount,
        paidAmount,
        dueCount,
        dueAmount,
        totalDemandValue,
        recoveryRate
      };
    }).sort((a, b) => b.demand.month.localeCompare(a.demand.month));
  }, [dueDemands, activeMembers, collections]);

  // Overall totals
  const overallDemanded = demandStatsList.reduce((sum, d) => sum + d.totalDemandValue, 0);
  const overallCollected = demandStatsList.reduce((sum, d) => sum + d.paidAmount, 0);
  const overallPending = demandStatsList.reduce((sum, d) => sum + d.dueAmount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Monthly Due Demand Generator</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Billing Manager
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Schedule subscription dues for members. Generate for 1 year or custom months directly from calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dues"
              className="flex items-center space-x-1.5 px-3 py-2 bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] text-[var(--card-foreground)] text-xs font-semibold rounded-xl transition-all"
            >
              <CalendarClock className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              <span>View Due List</span>
            </Link>

            {canManageDues && (
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                title="Import dues from Excel file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Dues</span>
              </button>
            )}

            {canManageDues && (
              <button
                type="button"
                onClick={downloadDuesTemplate}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template (.xlsx)</span>
              </button>
            )}

            {canManageDues && dueDemands.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteAllConfirmOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Delete all due demands"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Dues</span>
              </button>
            )}

            {canManageDues && (
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bulk Calendar Generate</span>
              </button>
            )}

            {canManageDues && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Single Month</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Demands</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CalendarClock className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{dueDemands.length} Months</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Scheduled billing periods</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Demanded</span>
              <div className="p-2 bg-[var(--accent)] text-[var(--foreground)]/80 rounded-lg"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(overallDemanded)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Sum of fees for active members</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Collected</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-emerald-400 mt-3">{formatCurrency(overallCollected)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">
              {overallDemanded > 0 ? `${Math.round((overallCollected / overallDemanded) * 100)}% recovery rate` : '0%'}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Outstanding Dues</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-amber-400 mt-3">{formatCurrency(overallPending)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Unpaid member dues</p>
          </div>
        </div>

        {/* Demands Table View */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[var(--border)] gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Scheduled Monthly Demands</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Every row represents an official monthly due for active members</p>
            </div>

            {canManageDues && (
              <button
                type="button"
                onClick={handleQuickNextMonth}
                className="px-3 py-1.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] text-indigo-400 text-xs font-semibold transition-all inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>+ Quick Next Month</span>
              </button>
            )}
          </div>

          {demandStatsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-3 font-semibold w-12 text-center">SL</th>
                    <th className="pb-3 font-semibold">Month</th>
                    <th className="pb-3 font-semibold">Demand Title</th>
                    <th className="pb-3 font-semibold">Fee Structure</th>
                    <th className="pb-3 font-semibold">Cutoff Date</th>
                    <th className="pb-3 font-semibold text-center">Paid / Due Members</th>
                    <th className="pb-3 font-semibold text-right">Collected / Total</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {demandStatsList.map((item, idx) => (
                    <tr key={item.demand.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="py-3 text-center font-mono text-[11px] text-[var(--muted-foreground)] font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 text-[var(--card-foreground)] font-bold font-mono text-xs">{item.demand.month}</td>
                      <td className="py-3 text-[var(--foreground)]/80 font-medium">{item.demand.title}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--foreground)]/80 text-[10px] font-semibold">
                          {item.demand.amountType === 'fixed' ? `Fixed ${item.demand.fixedAmount} TK` : 'Member Fee'}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)] text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-[var(--muted-foreground)]/70" />
                          <span>{item.demand.dueDate}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center space-x-1 text-[11px]">
                          <span className="font-bold text-emerald-400">{item.paidCount} Paid</span>
                          <span className="text-zinc-600">/</span>
                          <span className="font-bold text-amber-400">{item.dueCount} Due</span>
                        </div>
                        <div className="w-24 bg-[var(--accent)] h-1.5 rounded-full overflow-hidden mx-auto mt-1">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.recoveryRate}%` }}></div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="font-bold text-xs text-[var(--card-foreground)]">{formatCurrency(item.paidAmount)}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]/70">of {formatCurrency(item.totalDemandValue)}</div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            href={`/dues`}
                            className="px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)]/80 text-[11px] font-semibold transition-all inline-flex items-center space-x-1"
                          >
                            <span>Roster</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          {canManageDues && (
                            <button
                              type="button"
                              onClick={() => handlePromptDelete(item.demand)}
                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                              title="Delete this due demand"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-[var(--muted-foreground)]/70 text-xs">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 text-zinc-600 opacity-60" />
              <p className="font-semibold text-[var(--foreground)]/80">No Monthly Due Demands Created Yet</p>
              <p className="mt-1">Click &quot;Bulk Calendar Generate&quot; to pick 1 year or custom months from the calendar.</p>
            </div>
          )}
        </div>

        {/* ──────────────── MODAL: BULK CALENDAR GENERATE ──────────────── */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-xl p-6 relative shadow-2xl max-h-[92vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 rounded-xl bg-violet-600/15 text-violet-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Bulk Generate Dues (Calendar Picker)</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">Select 1 year or custom months from the visual calendar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setBulkModalOpen(false); setBulkProgress(''); }}
                  className="p-1.5 rounded-lg bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBulkGenerate} className="space-y-5 mt-5 text-xs">

                {/* 1. Year Navigator & Quick Actions */}
                <div className="bg-[var(--background)] p-3.5 rounded-2xl border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedYear(y => y - 1)}
                        className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-all"
                        title="Previous Year"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-base font-black text-white px-2">
                        {selectedYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedYear(y => y + 1)}
                        className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-all"
                        title="Next Year"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => selectFullYear(selectedYear)}
                        className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 font-bold border border-violet-500/30 text-[11px] transition-all cursor-pointer"
                      >
                        + Select Full Year ({selectedYear})
                      </button>
                      <button
                        type="button"
                        onClick={() => clearYear(selectedYear)}
                        className="px-2 py-1 rounded-lg bg-[var(--accent)] hover:bg-zinc-700 text-[var(--muted-foreground)] text-[11px] transition-all cursor-pointer"
                      >
                        Clear {selectedYear}
                      </button>
                    </div>
                  </div>

                  {/* 2. 12-Month Interactive Calendar Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {MONTH_NAMES.map((name, idx) => {
                      const mStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                      const isSelected = selectedMonths.includes(mStr);
                      const alreadyExists = dueDemands.some(d => d.month === mStr);

                      return (
                        <button
                          key={mStr}
                          type="button"
                          onClick={() => toggleMonth(mStr)}
                          className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600/25 border-violet-500 text-white shadow-md shadow-violet-600/10'
                              : 'bg-[var(--secondary)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-violet-500/40 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{name.slice(0, 3)}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] mt-1 opacity-70">{mStr}</span>
                          {alreadyExists && (
                            <span className="text-[9px] text-amber-400 font-semibold mt-1">
                              • Exists
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Optional: Date Range Picker (From -> To) */}
                <div className="bg-[var(--background)] p-3 rounded-2xl border border-[var(--border)] space-y-2">
                  <span className="text-[11px] font-semibold text-[var(--muted-foreground)] block">
                    Or select by Month Range (From - To):
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="month"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--card-foreground)] font-mono focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-[var(--muted-foreground)] text-xs">to</span>
                    <input
                      type="month"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--card-foreground)] font-mono focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyRange}
                      className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                </div>

                {/* 4. Live Selection Summary */}
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-violet-300 text-xs">
                      Selected: {selectedMonths.length} Months
                    </span>
                    {selectedMonths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([])}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {selectedMonths.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {[...selectedMonths].sort().map(m => {
                        const exists = dueDemands.some(d => d.month === m);
                        return (
                          <span
                            key={m}
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold ${
                              exists 
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                : 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                            }`}
                          >
                            <span>{m}</span>
                            {exists && <span title="Already exists (will be skipped)">⚠️</span>}
                            <button
                              type="button"
                              onClick={() => toggleMonth(m)}
                              className="hover:text-rose-400 ml-1"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      No months selected yet. Click the calendar buttons above or click &quot;Select Full Year&quot;.
                    </p>
                  )}
                </div>

                {/* 5. Fee Structure */}
                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1.5">
                    Fee Structure
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBulkAmountType('member_fee')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkAmountType === 'member_fee'
                          ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Member Profile Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Use each member&apos;s registered monthly fee (Default)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAmountType('fixed')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        bulkAmountType === 'fixed'
                          ? 'bg-violet-600/15 border-violet-500 text-violet-300'
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Fixed Amount</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Uniform fee for all members</div>
                    </button>
                  </div>
                </div>

                {bulkAmountType === 'fixed' && (
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">
                      Fixed Amount per Month (BDT) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={50}
                      value={bulkFixedAmount}
                      onChange={(e) => setBulkFixedAmount(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500"
                    />
                  </div>
                )}

                {/* 6. Due Day of Month (No Auto Late Fine) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">
                      Due Day of Month
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={bulkCutoffDay}
                      onChange={(e) => setBulkCutoffDay(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">Default: 10th of each month</span>
                  </div>
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">
                      Late Fine
                    </label>
                    <div className="w-full bg-[var(--background)]/60 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--muted-foreground)] font-medium">
                      0 TK (No Auto Fine)
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1 block">Fine is only added manually at collection</span>
                  </div>
                </div>

                {/* Progress */}
                {bulkProgress && (
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-300 text-[11px] flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{bulkProgress}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => { setBulkModalOpen(false); setBulkProgress(''); }}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)]/80 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkLoading || selectedMonths.length === 0}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {bulkLoading
                        ? 'Generating...'
                        : `Generate ${selectedMonths.filter(m => !dueDemands.some(d => d.month === m)).length} Month(s)`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── MODAL: SINGLE MONTH GENERATE ──────────────── */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Generate Single Month Due</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">Create due demand for a specific month</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateDemand} className="space-y-4 mt-5 text-xs">
                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Billing Month (YYYY-MM) *</label>
                  <input
                    type="month"
                    required
                    value={targetMonth}
                    onChange={(e) => {
                      setTargetMonth(e.target.value);
                      setDemandTitle(`Monthly Subscription Fee - ${e.target.value}`);
                    }}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Demand Title *</label>
                  <input
                    type="text"
                    required
                    value={demandTitle}
                    onChange={(e) => setDemandTitle(e.target.value)}
                    placeholder="e.g. Monthly Member Subscription"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1.5">Fee Structure</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAmountType('member_fee')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountType === 'member_fee' 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300' 
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Member Profile Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Each member&apos;s registered monthly fee</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAmountType('fixed')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountType === 'fixed' 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300' 
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Fixed Flat Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Same amount for all members</div>
                    </button>
                  </div>
                </div>

                {amountType === 'fixed' && (
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Fixed Amount (BDT) *</label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={50}
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Due Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={cutoffDay}
                      onChange={(e) => setCutoffDay(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">Default is 10th of the month</span>
                  </div>

                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Late Fine</label>
                    <div className="w-full bg-[var(--background)]/60 border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--muted-foreground)] font-medium">
                      0 TK (No Auto Fine)
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1 block">Collector adds fine manually if applicable</span>
                  </div>
                </div>

                <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
                  Active Eligible Members: <strong className="text-[var(--card-foreground)]">{activeMembers.length} Profiles</strong>.
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)]/80 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Generate Demand</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* ──────────────── CONFIRM MODAL: DELETE SINGLE ──────────────── */}
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          title={`Delete Due Demand (${demandToDelete?.month})`}
          message={`Are you sure you want to delete the monthly due demand for "${demandToDelete?.month}"? This will cancel the demand for all members.`}
          confirmText="Delete Demand"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDemandToDelete(null);
          }}
        />

        {/* ──────────────── CONFIRM MODAL: DELETE ALL ──────────────── */}
        <ConfirmModal
          isOpen={deleteAllConfirmOpen}
          title="Delete All Due Demands?"
          message={`Are you sure you want to delete all ${dueDemands.length} due demands? This action cannot be undone.`}
          confirmText={`Delete All ${dueDemands.length} Demands`}
          variant="danger"
          loading={deleteAllLoading}
          onConfirm={handleDeleteAll}
          onCancel={() => setDeleteAllConfirmOpen(false)}
        />

        {/* ──────────────── EXCEL IMPORT MODAL ──────────────── */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="dues"
          title="Import Previous Dues (Excel / CSV)"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            const count = await importPreviousDues(rows);
            showFeedback(`Successfully imported ${count} previous dues records into the system!`);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
