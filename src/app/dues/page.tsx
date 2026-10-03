'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import CalendarPicker from '../../components/calendar-picker';
import ConfirmModal from '../../components/confirm-modal';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Member, Collection, DueDemand } from '../../types';
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
  FileCheck,
  Plus,
  Trash2,
  Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PaymentSubmitModal from '../../components/payment-submit-modal';

export default function DuesPage() {
  const { stats, members, collections, addCollection, dueDemands, addDueDemand, deleteDueDemand } = useStore();
  const { user, hasPermission } = useAuth();

  const canManageDues = user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'paid' | 'pending'>('all');

  // Member self-payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payModalMember, setPayModalMember] = useState<Member | null>(null);
  const [payModalMonth, setPayModalMonth] = useState<string>(currentMonthStr);
  const [payModalAmount, setPayModalAmount] = useState<number>(1000);
  const [payModalFine, setPayModalFine] = useState<number>(0);

  // Manual Collection Modal state
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank'>('cash');
  const [customDate, setCustomDate] = useState<string>(selectedDate);
  const [customLateFine, setCustomLateFine] = useState<number>(0);
  const [collectLoading, setCollectLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Due Modal state
  const [addDueModalOpen, setAddDueModalOpen] = useState(false);
  const [newDueMonth, setNewDueMonth] = useState<string>(targetMonth);
  const [newDueTitle, setNewDueTitle] = useState<string>(`Monthly Subscription Fee - ${targetMonth}`);
  const [newDueAmountType, setNewDueAmountType] = useState<'member_fee' | 'fixed'>('member_fee');
  const [newDueFixedAmount, setNewDueFixedAmount] = useState<number>(1000);
  const [newDueCutoffDay, setNewDueCutoffDay] = useState<number>(10);
  const [newDueLateFine, setNewDueLateFine] = useState<number>(50);
  const [addDueLoading, setAddDueLoading] = useState(false);

  // Delete Due Modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<DueDemand | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle Calendar Date change
  const handleDateChange = (newDate: string, newMonth: string) => {
    setSelectedDate(newDate);
    setTargetMonth(newMonth);
    setNewDueMonth(newMonth);
    setNewDueTitle(`Monthly Subscription Fee - ${newMonth}`);
  };

  // Check if current targetMonth has a generated due demand
  const activeDemand = useMemo(() => {
    return dueDemands.find(d => d.month === targetMonth);
  }, [dueDemands, targetMonth]);

  // Determine if late fine applies for selected date
  const isSelectedDateAfterCutoff = useMemo(() => {
    const day = Number(selectedDate.split('-')[2] || 1);
    const cutoff = activeDemand ? Number(activeDemand.dueDate.split('-')[2] || 10) : 10;
    return day > cutoff;
  }, [selectedDate, activeDemand]);

  // Active members only (filtered to single member if logged in as member)
  const activeMembers = useMemo(() => {
    if (user?.role === 'member') {
      const isReal = (p?: string) => {
        if (!p) return false;
        const c = p.replace(/[^0-9]/g, '');
        return c.length >= 8 && !/^0+$/.test(c) && !/^0170{5,}/.test(c) && !/^880170{5,}/.test(c);
      };

      const myM = members.find(
        m => (user?.memberId && m.id === user.memberId) ||
             (user?.id && (m.id === user.id || m.id === user.id.replace('u-', 'm-'))) ||
             (user?.name && m.name?.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
             (user?.email && m.email?.toLowerCase() === user.email.toLowerCase()) ||
             (isReal(user?.phone) && m.phone === user.phone)
      );

      if (myM) return [myM];

      // Synthesize profile from logged-in user if not yet in members array
      const fallbackM: Member = {
        id: user?.memberId || user?.id?.replace('u-', 'm-') || `m-${user?.id || Date.now()}`,
        name: user?.name || 'Member',
        email: user?.email || '',
        phone: user?.phone || '',
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        monthlyFee: 1000,
        nomineeName: '',
        nomineeRelation: '',
        nomineePhone: ''
      };
      return [fallbackM];
    }
    return members.filter(m => m.status === 'active');
  }, [members, user]);

  // Compute Dues status for all active members for targetMonth
  const duesList = useMemo(() => {
    if (!activeDemand) {
      return [];
    }

    return activeMembers.map((member) => {
      // Find if there is a paid collection for this member in targetMonth
      const paidRecord = collections.find(
        c => (c.memberId === member.id || 
              (user?.memberId && c.memberId === user.memberId) || 
              (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
              (member.name && c.memberName?.toLowerCase() === member.name?.toLowerCase()) ||
              (user?.name && c.memberName?.toLowerCase() === user.name?.toLowerCase())) && 
             c.month === targetMonth && 
             c.status === 'paid'
      );

      // Find if there is a pending submission for this member in targetMonth
      const pendingRecord = collections.find(
        c => (c.memberId === member.id || 
              (user?.memberId && c.memberId === user.memberId) || 
              (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
              (member.name && c.memberName?.toLowerCase() === member.name?.toLowerCase()) ||
              (user?.name && c.memberName?.toLowerCase() === user.name?.toLowerCase())) && 
             c.month === targetMonth && 
             c.status === 'pending'
      );

      const isPaid = !!paidRecord;
      const isPending = !isPaid && !!pendingRecord;
      const baseFee = activeDemand.amountType === 'fixed' 
        ? (activeDemand.fixedAmount || 1000) 
        : (member.monthlyFee || 1000);
      
      // Calculate late fine: if not paid & not pending and selected date is after cutoff
      const lateFine = !isPaid && !isPending && isSelectedDateAfterCutoff ? activeDemand.lateFine : 0;
      const totalPayable = isPaid 
        ? (paidRecord.amount + (paidRecord.lateFine || 0)) 
        : isPending 
          ? (pendingRecord.amount + (pendingRecord.lateFine || 0))
          : (baseFee + lateFine);

      return {
        member,
        isPaid,
        isPending,
        paidRecord,
        pendingRecord,
        baseFee,
        lateFine,
        totalPayable,
        targetMonth
      };
    });
  }, [activeMembers, collections, targetMonth, activeDemand, isSelectedDateAfterCutoff, user]);

  // Filtered list
  const filteredDues = useMemo(() => {
    return duesList.filter(item => {
      const matchesSearch = 
        item.member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === 'due') return !item.isPaid && !item.isPending;
      if (statusFilter === 'paid') return item.isPaid;
      if (statusFilter === 'pending') return item.isPending;
      return true;
    });
  }, [duesList, searchQuery, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = duesList.length;
    const paidCount = duesList.filter(d => d.isPaid).length;
    const pendingCount = duesList.filter(d => d.isPending).length;
    const dueCount = duesList.filter(d => !d.isPaid && !d.isPending).length;
    const totalDueAmount = duesList
      .filter(d => !d.isPaid)
      .reduce((sum, d) => sum + d.totalPayable, 0);
    const totalCollected = duesList
      .filter(d => d.isPaid)
      .reduce((sum, d) => sum + (d.paidRecord?.amount || 0) + (d.paidRecord?.lateFine || 0), 0);

    return { total, paidCount, pendingCount, dueCount, totalDueAmount, totalCollected };
  }, [duesList]);

  // Open manual collection modal for a member
  const handleOpenCollectModal = (member: Member) => {
    setSelectedMember(member);
    setCustomDate(selectedDate);
    const day = Number(selectedDate.split('-')[2] || 1);
    const cutoff = activeDemand ? Number(activeDemand.dueDate.split('-')[2] || 10) : 10;
    const fine = activeDemand ? activeDemand.lateFine : 50;
    setCustomLateFine(day > cutoff ? fine : 0);
    setPaymentType('cash');
    setCollectModalOpen(true);
    setSuccessMessage(null);
  };

  // Confirm manual collection
  const handleConfirmCollection = async () => {
    if (!selectedMember) return;
    setCollectLoading(true);
    try {
      const baseFee = activeDemand?.amountType === 'fixed'
        ? (activeDemand.fixedAmount || 1000)
        : (selectedMember.monthlyFee || 1000);

      await addCollection({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        amount: baseFee,
        month: targetMonth,
        date: customDate,
        paymentType: paymentType,
        lateFine: customLateFine,
        status: 'paid',
        collectedBy: user?.name || 'Treasurer',
      });

      setSuccessMessage(`Payment of ${(baseFee + customLateFine).toLocaleString()} TK successfully collected for ${selectedMember.name}!`);
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

  // Open Add Due Modal
  const handleOpenAddDueModal = () => {
    setNewDueMonth(targetMonth);
    setNewDueTitle(`Monthly Subscription Fee - ${targetMonth}`);
    setNewDueAmountType('member_fee');
    setNewDueFixedAmount(1000);
    setNewDueCutoffDay(10);
    setNewDueLateFine(50);
    setAddDueModalOpen(true);
  };

  // Confirm Generate Due
  const handleConfirmGenerateDue = async () => {
    if (!newDueMonth) return;
    setAddDueLoading(true);
    try {
      const [year, month] = newDueMonth.split('-');
      const formattedCutoff = `${year}-${month}-${String(newDueCutoffDay).padStart(2, '0')}`;

      await addDueDemand({
        month: newDueMonth,
        title: newDueTitle || `Monthly Subscription Fee - ${newDueMonth}`,
        dueDate: formattedCutoff,
        amountType: newDueAmountType,
        fixedAmount: newDueAmountType === 'fixed' ? newDueFixedAmount : undefined,
        lateFine: newDueLateFine,
        applicableTo: 'all',
        createdBy: user?.name || 'Admin',
      });

      setTargetMonth(newDueMonth);
      setSelectedDate(`${newDueMonth}-01`);
      setAddDueModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddDueLoading(false);
    }
  };

  // Prompt delete due demand
  const handlePromptDeleteDue = (demand: DueDemand, e: React.MouseEvent) => {
    e.stopPropagation();
    setDemandToDelete(demand);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete due demand
  const handleConfirmDeleteDue = async () => {
    if (!demandToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDueDemand(demandToDelete.id);
      setDeleteConfirmOpen(false);
      setDemandToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
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
              <span className="text-xs text-[var(--muted-foreground)]">Manual Collection Workflow</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              Due Management & Directory
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Select date via calendar to inspect dues for <span className="text-emerald-400 font-bold">{targetMonth}</span>. No payments are auto-generated.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {canManageDues && (
              <button
                type="button"
                onClick={handleOpenAddDueModal}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add / Generate Due</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!activeDemand || filteredDues.length === 0}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] disabled:opacity-50 text-[var(--foreground)]/80 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!activeDemand || filteredDues.length === 0}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] disabled:opacity-50 text-[var(--foreground)]/80 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Generated Due Months Selector & Delete Manager */}
        <div className="p-4 bg-[var(--secondary)]/90 border border-[var(--border)] rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-[var(--card-foreground)]">Active Generated Due Months:</span>
              <span className="text-[11px] text-[var(--muted-foreground)]">Click any month to view or delete</span>
            </div>
            {canManageDues && (
              <button
                type="button"
                onClick={handleOpenAddDueModal}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Month Due</span>
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {dueDemands.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]/70 py-1">No due demands generated yet. Click "+ Add / Generate Due" to begin.</p>
            ) : (
              dueDemands.map((demand) => {
                const isSelected = demand.month === targetMonth;
                return (
                  <div
                    key={demand.id}
                    onClick={() => {
                      setTargetMonth(demand.month);
                      setSelectedDate(`${demand.month}-01`);
                    }}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                        : 'bg-[var(--muted)]/80 border-zinc-750 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-white'
                    }`}
                  >
                    <span>{demand.month}</span>
                    {canManageDues && (
                      <button
                        type="button"
                        onClick={(e) => handlePromptDeleteDue(demand, e)}
                        className="p-1 text-[var(--muted-foreground)] hover:text-rose-400 hover:bg-[var(--accent)] rounded-md transition-colors cursor-pointer"
                        title={`Delete due demand for ${demand.month}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Foundation Overall Metrics Banner (Visible to ALL users) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/30 via-[var(--secondary)] to-emerald-950/20 border border-indigo-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Foundation Overall Status (সার্বিক তথ্য - সকল সদস্য)</span>
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)]">Live aggregated across all foundation members</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--background)]/60 rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase">Overall Total Collection</p>
              <p className="text-lg font-black text-emerald-400 mt-1">{(stats?.totalCollection || 0).toLocaleString()} TK</p>
              <p className="text-[9px] text-[var(--muted-foreground)]/70 mt-0.5">Approved & deposited funds</p>
            </div>
            <div className="p-3 bg-[var(--background)]/60 rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase">Overall Total Dues</p>
              <p className="text-lg font-black text-amber-400 mt-1">{(stats?.dueCollection || 0).toLocaleString()} TK</p>
              <p className="text-[9px] text-[var(--muted-foreground)]/70 mt-0.5">Uncollected subscriptions</p>
            </div>
            <div className="p-3 bg-[var(--background)]/60 rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase">Active Members</p>
              <p className="text-lg font-black text-white mt-1">{stats?.activeMembers || 0}</p>
              <p className="text-[9px] text-[var(--muted-foreground)]/70 mt-0.5">Contributing members</p>
            </div>
            <div className="p-3 bg-[var(--background)]/60 rounded-xl border border-[var(--border)]">
              <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase">Total Investments</p>
              <p className="text-lg font-black text-indigo-400 mt-1">{(stats?.totalInvestment || 0).toLocaleString()} TK</p>
              <p className="text-[9px] text-[var(--muted-foreground)]/70 mt-0.5">Active portfolio funds</p>
            </div>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Target Month</span>
              <div className="p-2 bg-[var(--accent)] text-[var(--foreground)]/80 rounded-lg">
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <p className="text-lg font-black text-white mt-2">{targetMonth}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-0.5">Date: {selectedDate}</p>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Active Profiles</span>
              <div className="p-2 bg-[var(--accent)] text-[var(--foreground)]/80 rounded-lg">
                <Users className="w-4 h-4 text-[var(--foreground)]/80" />
              </div>
            </div>
            <p className="text-lg font-black text-white mt-2">{metrics.total}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-0.5">Eligible subscription members</p>
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
            <div className="p-4 bg-[var(--secondary)]/80 border border-[var(--border)] rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">Manual Collection Protection</span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                The system strictly disables automated payment creation. Dues reflect pending accounts only. To mark a member paid, click <strong>"Collect Due"</strong> to save the transaction manually.
              </p>
            </div>

            {/* Filter & Search */}
            <div className="p-4 bg-[var(--secondary)]/80 border border-[var(--border)] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[var(--card-foreground)]">Search & Filter</span>
              
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--muted-foreground)]/70" />
                <input
                  type="text"
                  placeholder="Search name, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--card-foreground)] placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--accent)]/80 text-[var(--muted-foreground)] hover:text-white'
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
                      : 'bg-[var(--accent)]/80 text-[var(--muted-foreground)] hover:text-white'
                  }`}
                >
                  Dues ({metrics.dueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-black shadow-sm font-black'
                      : 'bg-[var(--accent)]/80 text-amber-400 hover:text-amber-300'
                  }`}
                >
                  Pending ({metrics.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--accent)]/80 text-[var(--muted-foreground)] hover:text-white'
                  }`}
                >
                  Paid ({metrics.paidCount})
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Dues Directory Table (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border)] shadow-xl">
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Member Due Roster — {targetMonth}
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
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

              {!activeDemand ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/80 text-[var(--muted-foreground)]/70 border border-zinc-750 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-base font-bold text-white mb-1">No Due Generated for {targetMonth}</h4>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      You have not yet generated a payment due for this month. Once you click "Generate Due", it will automatically become applicable to all active members.
                    </p>
                  </div>
                  {canManageDues && (
                    <button
                      type="button"
                      onClick={handleOpenAddDueModal}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate Due for {targetMonth}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-[var(--muted-foreground)]">
                        <th className="p-3.5 font-semibold">Member</th>
                        <th className="p-3.5 font-semibold">Monthly Fee</th>
                        <th className="p-3.5 font-semibold">Late Fine</th>
                        <th className="p-3.5 font-semibold text-right">Total Payable</th>
                        <th className="p-3.5 font-semibold text-center">Status</th>
                        <th className="p-3.5 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredDues.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[var(--muted-foreground)]/70">
                            No member records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredDues.map((item) => (
                          <tr key={item.member.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {item.member.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-xs">{item.member.name}</p>
                                  <p className="text-[10px] text-[var(--muted-foreground)]/70">{item.member.id} • {item.member.phone}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-medium text-[var(--foreground)]/80">
                              {item.baseFee.toLocaleString()} TK
                            </td>

                            <td className="p-3.5">
                              {item.lateFine > 0 ? (
                                <span className="text-rose-400 font-bold">+{item.lateFine} TK</span>
                              ) : (
                                <span className="text-[var(--muted-foreground)]/70">-</span>
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
                              ) : item.isPending ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1 animate-pulse">
                                  <Clock className="w-3 h-3" />
                                  <span>PENDING APPROVAL</span>
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
                                <div className="text-[11px] text-[var(--muted-foreground)]/70">
                                  <span className="font-mono text-[10px]">{item.paidRecord?.receiptNo}</span>
                                </div>
                              ) : item.isPending ? (
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold inline-flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Awaiting Review</span>
                                </span>
                              ) : user?.role === 'member' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayModalMember(item.member);
                                    setPayModalMonth(item.targetMonth);
                                    setPayModalAmount(item.baseFee);
                                    setPayModalFine(item.lateFine);
                                    setPayModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center space-x-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay / Submit</span>
                                </button>
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
              )}
            </div>
          </div>

        </div>

        {/* Generate Due Modal */}
        {addDueModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="relative w-full max-w-md bg-[var(--secondary)] border border-zinc-750 rounded-3xl p-6 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setAddDueModalOpen(false)}
                disabled={addDueLoading}
                className="absolute top-4 right-4 p-1.5 text-[var(--muted-foreground)]/70 hover:text-[var(--foreground)]/80 hover:bg-[var(--accent)] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center space-x-3 pb-4 border-b border-[var(--border)] mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Generate Monthly Due Demand
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Apply subscription fee to all active members
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Target Month */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
                    Target Month (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={newDueMonth}
                    onChange={(e) => {
                      setNewDueMonth(e.target.value);
                      setNewDueTitle(`Monthly Subscription Fee - ${e.target.value}`);
                    }}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Due Title */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
                    Due Title / Description
                  </label>
                  <input
                    type="text"
                    value={newDueTitle}
                    onChange={(e) => setNewDueTitle(e.target.value)}
                    placeholder="e.g. Monthly Subscription Fee - 2026-10"
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Amount Rule */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1.5">
                    Fee Calculation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDueAmountType('member_fee')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        newDueAmountType === 'member_fee'
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                          : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                      }`}
                    >
                      Member Profile Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDueAmountType('fixed')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        newDueAmountType === 'fixed'
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                          : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                      }`}
                    >
                      Fixed Amount
                    </button>
                  </div>
                </div>

                {newDueAmountType === 'fixed' && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
                      Fixed Amount per Member (TK)
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={newDueFixedAmount}
                      onChange={(e) => setNewDueFixedAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Due Cutoff Day & Late Fine */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
                      Cutoff Day of Month
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newDueCutoffDay}
                      onChange={(e) => setNewDueCutoffDay(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
                      Late Fine (TK)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newDueLateFine}
                      onChange={(e) => setNewDueLateFine(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Target Summary */}
                <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">Applies to:</span>
                  <span className="text-xs font-bold text-emerald-400">
                    All {activeMembers.length} Active Members
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddDueModalOpen(false)}
                    disabled={addDueLoading}
                    className="flex-1 py-2.5 px-4 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--foreground)]/80 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmGenerateDue}
                    disabled={addDueLoading || !newDueMonth}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {addDueLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Generate & Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Due Demand Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          loading={deleteLoading}
          title="Delete Due Demand"
          message={`Are you sure you want to delete the generated due demand for ${demandToDelete?.month} (${demandToDelete?.title})? This will remove the due record for all members for this month.`}
          confirmText="Delete Due Demand"
          onConfirm={handleConfirmDeleteDue}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDemandToDelete(null);
          }}
        />

        {/* Manual Due Collection Modal */}
        {collectModalOpen && selectedMember && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              className="relative w-full max-w-md bg-[var(--secondary)] border border-zinc-750 rounded-3xl p-6 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                disabled={collectLoading}
                className="absolute top-4 right-4 p-1.5 text-[var(--muted-foreground)]/70 hover:text-[var(--foreground)]/80 hover:bg-[var(--accent)] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center space-x-3 pb-4 border-b border-[var(--border)] mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Manual Due Collection
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
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
                  <p className="text-xs text-[var(--muted-foreground)]">Receipt logged and accounting balances updated.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Member & Month Summary */}
                  <div className="p-3 bg-[var(--muted)]/60 border border-[var(--border)] rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[var(--muted-foreground)]/70 uppercase font-bold">Target Subscription</p>
                      <p className="text-sm font-extrabold text-white">{targetMonth}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--muted-foreground)]/70 uppercase font-bold">Member ID</p>
                      <p className="text-xs font-mono text-[var(--foreground)]/80">{selectedMember.id}</p>
                    </div>
                  </div>

                  {/* Payment Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1.5">
                      Payment Received In
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType('cash')}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                          paymentType === 'cash'
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-sm'
                            : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
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
                            : 'bg-[var(--muted)]/60 border-[var(--border)] text-[var(--muted-foreground)] hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Bank Account</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)]/80 mb-1">
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
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Late Fine adjustment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[var(--foreground)]/80">
                        Late Fine (TK)
                      </label>
                      <span className="text-[10px] text-[var(--muted-foreground)]/70">Auto applies after 10th</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={customLateFine}
                      onChange={(e) => setCustomLateFine(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Total Calculation */}
                  <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--muted-foreground)]">Total To Collect:</span>
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
                      className="flex-1 py-2.5 px-4 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--foreground)]/80 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
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

        {/* Member Self-Payment Modal */}
        {payModalOpen && (
          <PaymentSubmitModal
            isOpen={payModalOpen}
            onClose={() => setPayModalOpen(false)}
            memberId={payModalMember?.id || user?.id || ''}
            memberName={payModalMember?.name || user?.name || ''}
            defaultMonth={payModalMonth}
            defaultAmount={payModalAmount}
            defaultFine={payModalFine}
            unpaidMonths={duesList.filter(d => !d.isPaid && !d.isPending).map(d => ({
              month: d.targetMonth,
              fee: d.baseFee,
              fine: d.lateFine
            }))}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
