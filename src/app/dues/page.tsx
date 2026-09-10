'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import CalendarPicker from '../../components/calendar-picker';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Member, Collection } from '../../types';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Users, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Building2,
  X,
  Loader2,
  FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DuesPage() {
  const { members, collections, addCollection } = useStore();
  const { user, hasPermission } = useAuth();

  // Current Date default
  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Selected date and target month from calendar
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [targetMonth, setTargetMonth] = useState<string>(currentMonthStr);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid'>('all');

  // Manual Collection Modal state
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank'>('cash');
  const [customDate, setCustomDate] = useState<string>(selectedDate);
  const [customLateFine, setCustomLateFine] = useState<number>(0);
  const [collectLoading, setCollectLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Calendar Date change
  const handleDateChange = (newDate: string, newMonth: string) => {
    setSelectedDate(newDate);
    setTargetMonth(newMonth);
  };

  // Determine if late fine applies for selected date
  const isSelectedDateAfterCutoff = useMemo(() => {
    const day = Number(selectedDate.split('-')[2] || 1);
    return day > 10;
  }, [selectedDate]);

  // Active members only
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Compute Dues status for all active members for targetMonth
  const duesList = useMemo(() => {
    return activeMembers.map((member) => {
      // Find if there is a paid collection for this member in targetMonth
      const paidRecord = collections.find(
        c => c.memberId === member.id && c.month === targetMonth && c.status === 'paid'
      );

      const isPaid = !!paidRecord;
      const baseFee = member.monthlyFee || 1000;
      
      // Calculate late fine: if not paid and selected date is after the 10th of target month
      const lateFine = !isPaid && isSelectedDateAfterCutoff ? 50 : 0;
      const totalPayable = isPaid ? (paidRecord.amount + (paidRecord.lateFine || 0)) : (baseFee + lateFine);

      return {
        member,
        isPaid,
        paidRecord,
        baseFee,
        lateFine,
        totalPayable,
        targetMonth
      };
    });
  }, [activeMembers, collections, targetMonth, isSelectedDateAfterCutoff]);

  // Filtered list
  const filteredDues = useMemo(() => {
    return duesList.filter(item => {
      const matchesSearch = 
        item.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === 'due') return !item.isPaid;
      if (statusFilter === 'paid') return item.isPaid;
      return true;
    });
  }, [duesList, searchQuery, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = duesList.length;
    const paidCount = duesList.filter(d => d.isPaid).length;
    const dueCount = duesList.filter(d => !d.isPaid).length;
    const totalDueAmount = duesList
      .filter(d => !d.isPaid)
      .reduce((sum, d) => sum + d.totalPayable, 0);
    const totalCollected = duesList
      .filter(d => d.isPaid)
      .reduce((sum, d) => sum + (d.paidRecord?.amount || 0), 0);

    return { total, paidCount, dueCount, totalDueAmount, totalCollected };
  }, [duesList]);

  // Open manual collection modal for a member
  const handleOpenCollectModal = (member: Member) => {
    setSelectedMember(member);
    setCustomDate(selectedDate);
    const day = Number(selectedDate.split('-')[2] || 1);
    setCustomLateFine(day > 10 ? 50 : 0);
    setPaymentType('cash');
    setCollectModalOpen(true);
    setSuccessMessage(null);
  };

  // Confirm manual collection
  const handleConfirmCollection = async () => {
    if (!selectedMember) return;
    setCollectLoading(true);
    try {
      await addCollection({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        amount: selectedMember.monthlyFee || 1000,
        month: targetMonth,
        date: customDate,
        paymentType: paymentType,
        lateFine: customLateFine,
        status: 'paid',
        collectedBy: user?.name || 'Treasurer',
      });

      setSuccessMessage(`Payment of ${(selectedMember.monthlyFee + customLateFine).toLocaleString()} TK successfully collected for ${selectedMember.name}!`);
      setTimeout(() => {
        setCollectModalOpen(false);
        setSelectedMember(null);
        setSuccessMessage(null);
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setCollectLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredDues.map(d => ({
      'Member ID': d.member.id,
      'Member Name': d.member.name,
      'Phone': d.member.phone,
      'Target Month': targetMonth,
      'Monthly Fee (TK)': d.baseFee,
      'Late Fine (TK)': d.lateFine,
      'Total Payable (TK)': d.totalPayable,
      'Status': d.isPaid ? 'PAID' : 'DUE',
      'Receipt No': d.paidRecord?.receiptNo || 'N/A',
      'Payment Date': d.paidRecord?.date || 'Pending',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Dues_${targetMonth}`);
    XLSX.writeFile(wb, `FDC_Dues_Report_${targetMonth}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                NO AUTO-PAYMENT
              </span>
              <span className="text-xs text-zinc-400">Manual Collection Workflow</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              Due Management & Directory
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select date via calendar to inspect dues for <span className="text-emerald-400 font-bold">{targetMonth}</span>. No payments are auto-generated.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Target Month</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg">
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <p className="text-lg font-black text-white mt-2">{targetMonth}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Date: {selectedDate}</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Active Profiles</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg">
                <Users className="w-4 h-4 text-zinc-300" />
              </div>
            </div>
            <p className="text-lg font-black text-white mt-2">{metrics.total}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Eligible subscription members</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">Outstanding Dues</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-black text-amber-400 mt-2">{metrics.totalDueAmount.toLocaleString()} TK</p>
            <p className="text-[10px] text-amber-500/80 mt-0.5">{metrics.dueCount} members pending</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">Collected for Month</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-black text-emerald-400 mt-2">{metrics.totalCollected.toLocaleString()} TK</p>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">{metrics.paidCount} members paid</p>
          </div>
        </div>

        {/* Main Section: Calendar on Left, Directory on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Calendar & Controls (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Interactive Calendar */}
            <CalendarPicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              dueCutoffDay={10}
            />

            {/* Notice Box: No Auto Payments */}
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">Manual Collection Protection</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                The system strictly disables automated payment creation. Dues reflect pending accounts only. To mark a member paid, click <strong>"Collect Due"</strong> to save the transaction manually.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-zinc-200">Search & Filter</span>
              
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search name, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({duesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('due')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'due'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  Dues ({metrics.dueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  Paid ({metrics.paidCount})
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Dues Directory Table (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
              <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Member Due Roster — {targetMonth}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Showing {filteredDues.length} active profiles for selected period
                  </p>
                </div>
                {isSelectedDateAfterCutoff && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Past 10th: 50 TK Late Fine</span>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-900/50 text-zinc-400">
                      <th className="p-3.5 font-semibold">Member</th>
                      <th className="p-3.5 font-semibold">Monthly Fee</th>
                      <th className="p-3.5 font-semibold">Late Fine</th>
                      <th className="p-3.5 font-semibold text-right">Total Payable</th>
                      <th className="p-3.5 font-semibold text-center">Status</th>
                      <th className="p-3.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {filteredDues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          No member records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredDues.map((item) => (
                        <tr key={item.member.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {item.member.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs">{item.member.name}</p>
                                <p className="text-[10px] text-zinc-500">{item.member.id} • {item.member.phone}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 font-medium text-zinc-300">
                            {item.baseFee.toLocaleString()} TK
                          </td>

                          <td className="p-3.5">
                            {item.lateFine > 0 ? (
                              <span className="text-rose-400 font-bold">+{item.lateFine} TK</span>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-black text-white">
                            {item.totalPayable.toLocaleString()} TK
                          </td>

                          <td className="p-3.5 text-center">
                            {item.isPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PAID</span>
                              </span>
                            ) : item.lateFine > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>OVERDUE</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>DUE</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            {item.isPaid ? (
                              <div className="text-[11px] text-zinc-500">
                                <span className="font-mono text-[10px]">{item.paidRecord?.receiptNo}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenCollectModal(item.member)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-1"
                              >
                                <span>Collect Due</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Manual Due Collection Modal */}
        {collectModalOpen && selectedMember && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-3xl p-6 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                disabled={collectLoading}
                className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center space-x-3 pb-4 border-b border-zinc-800 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Manual Due Collection
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Record payment for {selectedMember.name}
                  </p>
                </div>
              </div>

              {successMessage ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-pulse">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">{successMessage}</p>
                  <p className="text-xs text-zinc-400">Receipt logged and accounting balances updated.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Member & Month Summary */}
                  <div className="p-3 bg-zinc-850/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Target Subscription</p>
                      <p className="text-sm font-extrabold text-white">{targetMonth}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Member ID</p>
                      <p className="text-xs font-mono text-zinc-300">{selectedMember.id}</p>
                    </div>
                  </div>

                  {/* Payment Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      Payment Received In
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType('cash')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          paymentType === 'cash'
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                            : 'bg-zinc-850/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Cash in Hand</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('bank')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          paymentType === 'bank'
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                            : 'bg-zinc-850/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Bank Account</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                        const day = Number(e.target.value.split('-')[2] || 1);
                        setCustomLateFine(day > 10 ? 50 : 0);
                      }}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Late Fine adjustment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-zinc-300">
                        Late Fine (TK)
                      </label>
                      <span className="text-[10px] text-zinc-500">Auto applies after 10th</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={customLateFine}
                      onChange={(e) => setCustomLateFine(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Total Calculation */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400">Total To Collect:</span>
                    <span className="text-base font-black text-emerald-400">
                      {((selectedMember.monthlyFee || 1000) + customLateFine).toLocaleString()} TK
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCollectModalOpen(false)}
                      disabled={collectLoading}
                      className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCollection}
                      disabled={collectLoading}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                    >
                      {collectLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Confirm & Record</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
