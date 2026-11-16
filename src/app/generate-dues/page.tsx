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
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import ExcelImportModal, { downloadDuesTemplate } from '../../components/excel-import-modal';

export default function GenerateDuesPage() {
  const { members, collections, dueDemands, addDueDemand, deleteDueDemand, importPreviousDues } = useStore();
  const { user } = useAuth();

  const canManageDues = user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';

  const [importModalOpen, setImportModalOpen] = useState(false);

  // â”€â”€â”€â”€â”€ Single Generate Modal state â”€â”€â”€â”€â”€
  const [modalOpen, setModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [demandTitle, setDemandTitle] = useState<string>('Monthly Subscription Fee');
  const [amountType, setAmountType] = useState<'member_fee' | 'fixed'>('member_fee');
  const [fixedAmount, setFixedAmount] = useState<number>(1000);
  const [cutoffDay, setCutoffDay] = useState<number>(10);
  const [lateFine, setLateFine] = useState<number>(50);
  const [loading, setLoading] = useState(false);

  // â”€â”€â”€â”€â”€ Bulk Generate Modal state â”€â”€â”€â”€â”€
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkStartMonth, setBulkStartMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bulkMonthCount, setBulkMonthCount] = useState<number>(12);
  const [bulkCustomCount, setBulkCustomCount] = useState<number>(3);
  const [bulkCountMode, setBulkCountMode] = useState<'1' | '3' | '6' | '12' | 'custom'>('12');
  const [bulkAmountType, setBulkAmountType] = useState<'member_fee' | 'fixed'>('member_fee');
  const [bulkFixedAmount, setBulkFixedAmount] = useState<number>(1000);
  const [bulkCutoffDay, setBulkCutoffDay] = useState<number>(10);
  const [bulkLateFine, setBulkLateFine] = useState<number>(50);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string>('');

  // â”€â”€â”€â”€â”€ Delete Confirmation state â”€â”€â”€â”€â”€
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<DueDemand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // â”€â”€â”€â”€â”€ Delete All Dues state â”€â”€â”€â”€â”€
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // â”€â”€â”€â”€â”€ Feedback banner state â”€â”€â”€â”€â”€
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

  // Compute effective bulk count
  const effectiveBulkCount = bulkCountMode === 'custom' ? bulkCustomCount : Number(bulkCountMode);

  // Preview months for bulk generate
  const bulkPreviewMonths = useMemo(() => {
    const months: string[] = [];
    const [sy, sm] = bulkStartMonth.split('-').map(Number);
    for (let i = 0; i < effectiveBulkCount; i++) {
      const d = new Date(sy, sm - 1 + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, [bulkStartMonth, effectiveBulkCount]);

  // â”€â”€â”€â”€â”€ Single Generate â”€â”€â”€â”€â”€
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
        lateFine: Number(lateFine),
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

  // â”€â”€â”€â”€â”€ Bulk Generate â”€â”€â”€â”€â”€
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkLoading(true);
    let generated = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < bulkPreviewMonths.length; i++) {
        const month = bulkPreviewMonths[i];
        setBulkProgress(`Generating ${month}... (${i + 1}/${bulkPreviewMonths.length})`);
        const existing = dueDemands.find(d => d.month === month);
        if (existing) { skipped++; continue; }
        const dueDate = `${month}-${String(bulkCutoffDay).padStart(2, '0')}`;
        await addDueDemand({
          month,
          title: `Monthly Subscription Fee - ${month}`,
          dueDate,
          amountType: bulkAmountType,
          fixedAmount: bulkAmountType === 'fixed' ? Number(bulkFixedAmount) : undefined,
          lateFine: Number(bulkLateFine),
          applicableTo: 'all',
          createdBy: user?.name || 'Administrator'
        });
        generated++;
      }
      setBulkModalOpen(false);
      setBulkProgress('');
      showFeedback(`âœ… ${generated} à¦®à¦¾à¦¸à§‡à¦° due generate à¦¹à¦¯à¦¼à§‡à¦›à§‡${skipped > 0 ? `, ${skipped} à¦®à¦¾à¦¸ à¦†à¦—à§‡ à¦¥à§‡à¦•à§‡à¦‡ à¦›à¦¿à¦² (skip à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡)` : ''}à¥¤`);
    } catch (err) {
      console.error(err);
      alert('à¦•à¦¿à¦›à§ à¦®à¦¾à¦¸ generate à¦•à¦°à¦¤à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤');
    } finally {
      setBulkLoading(false);
      setBulkProgress('');
    }
  };

  // â”€â”€â”€â”€â”€ Single Delete â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€ Delete All â”€â”€â”€â”€â”€
  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      for (const demand of dueDemands) {
        await deleteDueDemand(demand.id);
      }
      setDeleteAllConfirmOpen(false);
      showFeedback(`à¦¸à¦•à¦² ${dueDemands.length} à¦Ÿà¦¿ due demand à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤`);
    } catch (err) {
      console.error(err);
      alert('à¦•à¦¿à¦›à§ due demand à¦®à§à¦›à¦¤à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤');
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
              Manually schedule monthly subscription demands. Active demands apply to all active member profiles.
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
                title="à¦¸à¦¦à¦¸à§à¦¯à¦¦à§‡à¦° à¦ªà§‚à¦°à§à¦¬à§‡à¦° à¦¬à¦•à§‡à¦¯à¦¼à¦¾ à¦à¦•à§à¦¸à§‡à¦² à¦«à¦¾à¦‡à¦²à§‡à¦° à¦®à¦¾à¦§à§à¦¯à¦®à§‡ à¦‡à¦®à§à¦ªà§‹à¦°à§à¦Ÿ à¦•à¦°à§à¦¨"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Previous Dues</span>
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
                title="à¦¸à¦•à¦² due demand à¦®à§à¦›à§‡ à¦«à§‡à¦²à§à¦¨"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Dues</span>
              </button>
            )}

            {canManageDues && (
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bulk Generate</span>
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
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Demands Created</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CalendarClock className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{dueDemands.length} Months</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Scheduled billing periods</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Demanded Value</span>
              <div className="p-2 bg-[var(--accent)] text-[var(--foreground)]/80 rounded-lg"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(overallDemanded)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Sum of fees for active members</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Collected So Far</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-emerald-400 mt-3">{formatCurrency(overallCollected)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">
              {overallDemanded > 0 ? `${Math.round((overallCollected / overallDemanded) * 100)}% overall recovery rate` : '0%'}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Outstanding Dues</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-amber-400 mt-3">{formatCurrency(overallPending)}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Unpaid member accounts</p>
          </div>
        </div>

        {/* Demands Table View */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[var(--border)] gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Scheduled Monthly Demands</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Every row represents an official monthly due applicable to active members</p>
            </div>

            {canManageDues && (
              <button
                type="button"
                onClick={handleQuickNextMonth}
                className="px-3 py-1.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] text-indigo-400 text-xs font-semibold transition-all inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>+ Quick Generate Next Month</span>
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
                    <th className="pb-3 font-semibold">Late Fine</th>
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
                      <td className="py-3 text-[var(--muted-foreground)] text-[11px]">{item.demand.lateFine} TK</td>
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
              <p className="mt-1">Click &quot;Bulk Generate&quot; to generate multiple months at once, or &quot;+ Single Month&quot; for one month.</p>
            </div>
          )}
        </div>

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MODAL: BULK GENERATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-violet-600/15 text-violet-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Bulk Generate Due Demands</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">à¦à¦•à¦¸à¦¾à¦¥à§‡ à¦à¦•à¦¾à¦§à¦¿à¦• à¦®à¦¾à¦¸à§‡à¦° due generate à¦•à¦°à§à¦¨</p>
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

              <form onSubmit={handleBulkGenerate} className="space-y-4 mt-5 text-xs">

                {/* Start Month */}
                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1">à¦¶à§à¦°à§à¦° à¦®à¦¾à¦¸ (Start Month) *</label>
                  <input
                    type="month"
                    required
                    value={bulkStartMonth}
                    onChange={(e) => setBulkStartMonth(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>

                {/* Month Count Selector */}
                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-2">à¦•à¦¤à§‹ à¦®à¦¾à¦¸ Generate à¦•à¦°à¦¬à§‡à¦¨?</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['1', '3', '6', '12', 'custom'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setBulkCountMode(opt)}
                        className={`py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          bulkCountMode === opt
                            ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                            : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-violet-500/50'
                        }`}
                      >
                        {opt === 'custom' ? 'Custom' : `${opt}M`}
                      </button>
                    ))}
                  </div>

                  {bulkCountMode === 'custom' && (
                    <div className="mt-2">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={bulkCustomCount}
                        onChange={(e) => setBulkCustomCount(Number(e.target.value))}
                        placeholder="à¦•à¦¤à§‹ à¦®à¦¾à¦¸? (1-60)"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                  <p className="text-violet-300 font-semibold mb-1.5">ðŸ“… Preview â€” à¦¯à§‡ à¦®à¦¾à¦¸à¦—à§à¦²à§‹ à¦¤à§ˆà¦°à¦¿ à¦¹à¦¬à§‡:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {bulkPreviewMonths.map(m => {
                      const alreadyExists = dueDemands.some(d => d.month === m);
                      return (
                        <span
                          key={m}
                          className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold ${
                            alreadyExists
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                          }`}
                          title={alreadyExists ? 'Already exists â€” will be skipped' : 'Will be generated'}
                        >
                          {m}{alreadyExists ? ' âš ï¸' : ''}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-2">
                    âš ï¸ à¦šà¦¿à¦¹à§à¦¨à¦¿à¦¤ à¦®à¦¾à¦¸à¦—à§à¦²à§‹ à¦†à¦—à§‡ à¦¥à§‡à¦•à§‡à¦‡ à¦†à¦›à§‡ â€” à¦¸à§‡à¦—à§à¦²à§‹ skip à¦•à¦°à¦¾ à¦¹à¦¬à§‡à¥¤
                  </p>
                </div>

                {/* Fee Type */}
                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1.5">Fee Calculation Structure</label>
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
                      <div className="text-[10px] mt-0.5 opacity-80">à¦ªà§à¦°à¦¤à§à¦¯à§‡à¦• à¦¸à¦¦à¦¸à§à¦¯à§‡à¦° à¦¨à¦¿à¦œà¦¸à§à¦¬ à¦®à¦¾à¦¸à¦¿à¦• à¦«à¦¿</div>
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
                      <div className="font-bold text-xs">Fixed Flat Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">à¦¸à¦¬à¦¾à¦° à¦œà¦¨à§à¦¯ à¦à¦•à¦‡ à¦ªà¦°à¦¿à¦®à¦¾à¦£</div>
                    </button>
                  </div>
                </div>

                {bulkAmountType === 'fixed' && (
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Fixed Amount (BDT) *</label>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Due Cutoff Day</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={bulkCutoffDay}
                      onChange={(e) => setBulkCutoffDay(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">à¦ªà§à¦°à¦¤à¦¿ à¦®à¦¾à¦¸à§‡à¦° à¦•à¦¤à¦¤à¦® à¦¦à¦¿à¦¨?</span>
                  </div>
                  <div>
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Late Fine (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      required
                      value={bulkLateFine}
                      onChange={(e) => setBulkLateFine(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">à¦¬à¦¿à¦²à¦®à§à¦¬ à¦œà¦°à¦¿à¦®à¦¾à¦¨à¦¾</span>
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
                    disabled={bulkLoading || bulkPreviewMonths.length === 0}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {bulkLoading
                        ? 'Generating...'
                        : `Generate ${bulkPreviewMonths.filter(m => !dueDemands.some(d => d.month === m)).length} Months`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MODAL: SINGLE GENERATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Generate Monthly Due Demand</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">This demand will be applicable to all active members</p>
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
                    placeholder="e.g. Monthly Member Subscription - Sep 2026"
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[var(--foreground)]/80 font-semibold mb-1.5">Fee Calculation Structure</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAmountType('member_fee')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountType === 'member_fee' 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300' 
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Member Profile Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Use each member&apos;s individually registered monthly fee</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAmountType('fixed')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountType === 'fixed' 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300' 
                          : 'bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div className="font-bold text-xs">Fixed Flat Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Charge one uniform fee for all members</div>
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
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Due Cutoff Day of Month</label>
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
                    <label className="block text-[var(--foreground)]/80 font-semibold mb-1">Late Fine (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      required
                      value={lateFine}
                      onChange={(e) => setLateFine(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 mt-1 block">Auto-applies after cutoff day</span>
                  </div>
                </div>

                <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
                  Total Eligible Active Members: <strong className="text-[var(--card-foreground)]">{activeMembers.length} Profiles</strong>.
                  Dues will be visible immediately on each member&apos;s personal dashboard.
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
                    <span>Generate Demand For All Members</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CONFIRM MODAL: DELETE SINGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CONFIRM MODAL: DELETE ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ConfirmModal
          isOpen={deleteAllConfirmOpen}
          title="à¦¸à¦•à¦² Due Demand à¦®à§à¦›à§‡ à¦«à§‡à¦²à§à¦¨?"
          message={`à¦†à¦ªà¦¨à¦¿ à¦•à¦¿ à¦¨à¦¿à¦¶à§à¦šà¦¿à¦¤? à¦à¦Ÿà¦¿ à¦¸à¦®à¦¸à§à¦¤ ${dueDemands.length} à¦®à¦¾à¦¸à§‡à¦° due demand à¦¸à§à¦¥à¦¾à¦¯à¦¼à§€à¦­à¦¾à¦¬à§‡ à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¬à§‡à¥¤ à¦à¦‡ à¦•à¦¾à¦œà¦Ÿà¦¿ à¦ªà§‚à¦°à§à¦¬à¦¾à¦¬à¦¸à§à¦¥à¦¾à¦¯à¦¼ à¦«à§‡à¦°à¦¾à¦¨à§‹ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤`}
          confirmText={`Delete All ${dueDemands.length} Demands`}
          variant="danger"
          loading={deleteAllLoading}
          onConfirm={handleDeleteAll}
          onCancel={() => setDeleteAllConfirmOpen(false)}
        />

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ EXCEL IMPORT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="dues"
          title="à¦¸à¦¦à¦¸à§à¦¯à¦¦à§‡à¦° à¦ªà§‚à¦°à§à¦¬à§‡à¦° à¦¬à¦•à§‡à¦¯à¦¼à¦¾ à¦¤à¦¾à¦²à¦¿à¦•à¦¾ à¦‡à¦®à§à¦ªà§‹à¦°à§à¦Ÿ (Excel / CSV)"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            const count = await importPreviousDues(rows);
            showFeedback(`à¦¸à¦«à¦²à¦­à¦¾à¦¬à§‡ ${count}à¦Ÿà¦¿ à¦ªà§‚à¦°à§à¦¬à§‡à¦° à¦¬à¦•à§‡à¦¯à¦¼à¦¾ à¦°à§‡à¦•à¦°à§à¦¡ à¦¸à¦¿à¦¸à§à¦Ÿà§‡à¦®à§‡ à¦¯à§à¦•à§à¦¤ à¦•à¦°à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡!`);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
