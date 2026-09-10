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
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  Clock, 
  X, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Tag
} from 'lucide-react';
import Link from 'next/link';

export default function GenerateDuesPage() {
  const { members, collections, dueDemands, addDueDemand, deleteDueDemand } = useStore();
  const { user } = useAuth();

  const canManageDues = user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';

  // Generate Due Modal state
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

  // Delete Confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<DueDemand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback banner state
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(val);
  };

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Handle generation of new due demand
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

  // Prompt deletion
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
              <h2 className="text-xl font-bold text-zinc-100">Monthly Due Demand Generator</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Billing Manager
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Manually schedule monthly subscription demands. Active demands apply to all active member profiles.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/dues"
              className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
            >
              <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
              <span>View Due List</span>
            </Link>

            {canManageDues && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Generate Due Demand</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Demands Created</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CalendarClock className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{dueDemands.length} Months</p>
            <p className="text-[10px] text-zinc-500 mt-1">Scheduled billing periods</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Demanded Value</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(overallDemanded)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Sum of fees for active members</p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Collected So Far</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-emerald-400 mt-3">{formatCurrency(overallCollected)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {overallDemanded > 0 ? `${Math.round((overallCollected / overallDemanded) * 100)}% overall recovery rate` : '0%'}
            </p>
          </div>

          <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Outstanding Dues</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-amber-400 mt-3">{formatCurrency(overallPending)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Unpaid member accounts</p>
          </div>
        </div>

        {/* Demands Table View */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-zinc-800 gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Scheduled Monthly Demands</h3>
              <p className="text-[11px] text-zinc-400">Every row represents an official monthly due applicable to active members</p>
            </div>

            {canManageDues && (
              <button
                type="button"
                onClick={handleQuickNextMonth}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-indigo-400 text-xs font-semibold transition-all inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>+ Quick Generate Next Month</span>
              </button>
            )}
          </div>

          {demandStatsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
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
                <tbody className="divide-y divide-zinc-850">
                  {demandStatsList.map((item) => (
                    <tr key={item.demand.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 text-zinc-200 font-bold font-mono text-xs">{item.demand.month}</td>
                      <td className="py-3 text-zinc-300 font-medium">{item.demand.title}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-semibold">
                          {item.demand.amountType === 'fixed' ? `Fixed ${item.demand.fixedAmount} TK` : 'Member Fee'}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400 text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{item.demand.dueDate}</span>
                        </div>
                      </td>
                      <td className="py-3 text-zinc-400 text-[11px]">{item.demand.lateFine} TK</td>
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center space-x-1 text-[11px]">
                          <span className="font-bold text-emerald-400">{item.paidCount} Paid</span>
                          <span className="text-zinc-600">/</span>
                          <span className="font-bold text-amber-400">{item.dueCount} Due</span>
                        </div>
                        <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-auto mt-1">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.recoveryRate}%` }}></div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="font-bold text-xs text-zinc-200">{formatCurrency(item.paidAmount)}</div>
                        <div className="text-[10px] text-zinc-500">of {formatCurrency(item.totalDemandValue)}</div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            href={`/dues`}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-all inline-flex items-center space-x-1"
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
            <div className="py-12 text-center text-zinc-500 text-xs">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 text-zinc-600 opacity-60" />
              <p className="font-semibold text-zinc-300">No Monthly Due Demands Created Yet</p>
              <p className="mt-1">Click &quot;+ Generate Due Demand&quot; to issue monthly subscription dues for all members.</p>
            </div>
          )}
        </div>

        {/* ---------------- MODAL: GENERATE DUE DEMAND ---------------- */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
              
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/15 text-indigo-400">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Generate Monthly Due Demand</h3>
                    <p className="text-[11px] text-zinc-400">This demand will be applicable to all active members</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGenerateDemand} className="space-y-4 mt-5 text-xs">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Billing Month (YYYY-MM) *</label>
                  <input
                    type="month"
                    required
                    value={targetMonth}
                    onChange={(e) => {
                      setTargetMonth(e.target.value);
                      setDemandTitle(`Monthly Subscription Fee - ${e.target.value}`);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Demand Title *</label>
                  <input
                    type="text"
                    required
                    value={demandTitle}
                    onChange={(e) => setDemandTitle(e.target.value)}
                    placeholder="e.g. Monthly Member Subscription - Sep 2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1.5">Fee Calculation Structure</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAmountType('member_fee')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        amountType === 'member_fee' 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
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
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-xs">Fixed Flat Fee</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Charge one uniform fee for all members</div>
                    </button>
                  </div>
                </div>

                {amountType === 'fixed' && (
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Fixed Amount (BDT) *</label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={50}
                      value={fixedAmount}
                      onChange={(e) => setFixedAmount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Due Cutoff Day of Month</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={cutoffDay}
                      onChange={(e) => setCutoffDay(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">Default is 10th of the month</span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">Late Fine (BDT)</label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      required
                      value={lateFine}
                      onChange={(e) => setLateFine(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">Auto-applies after cutoff day</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 text-[11px] text-zinc-400">
                  Total Eligible Active Members: <strong className="text-zinc-200">{activeMembers.length} Profiles</strong>.
                  Dues will be visible immediately on each member&apos;s personal dashboard.
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-all"
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

        {/* ---------------- CONFIRM MODAL: DELETE DEMAND ---------------- */}
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

      </div>
    </DashboardLayout>
  );
}
