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
  Tag,
  Send,
  Mail,
  FileSpreadsheet,
  Receipt,
  ChevronRight,
  CalendarClock,
  CheckCircle,
  Eye,
  ListChecks,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import PaymentSubmitModal from '../../components/payment-submit-modal';
import PrintableReceipt from '../../components/receipt';
import ExcelImportModal, { downloadDuesTemplate } from '../../components/excel-import-modal';
import { PageSizeSelector, DataTablePagination, usePagination } from '../../components/pagination';

export default function DuesPage() {
  const { 
    stats, 
    members, 
    collections, 
    addCollection, 
    dueDemands, 
    addDueDemand, 
    deleteDueDemand, 
    fineWaivers, 
    waiveFine, 
    removeFineWaiver,
    importPreviousDues
  } = useStore();
  const { user, hasPermission } = useAuth();

  const canManageDues = user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';
  const isMember = user?.role === 'member';

  // Receipt Modal State
  const [viewReceipt, setViewReceipt] = useState<Collection | null>(null);

  // Member Filter State: 'all' | 'unpaid' | 'pending' | 'paid'
  const [memberFilter, setMemberFilter] = useState<'all' | 'unpaid' | 'pending' | 'paid'>('all');

  // Admin Tab: 'all_members_due' | 'monthly_roster'
  const [adminTab, setAdminTab] = useState<'all_members_due' | 'monthly_roster'>('all_members_due');
  const [allMembersSearch, setAllMembersSearch] = useState('');
  const [allMembersFilter, setAllMembersFilter] = useState<'all' | 'due_only'>('due_only');

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
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  // Find linked member record for regular member role
  const myMember = useMemo(() => {
    if (!user) return null;
    if (['super_admin', 'president', 'treasurer', 'collector', 'auditor'].includes(user.role)) return null;
    if (user.memberId) {
      const found = members.find(m => m.id === user.memberId);
      if (found) return found;
    }
    const byId = members.find(m => m.id === user.id || m.id === user.id.replace('u-', 'm-'));
    if (byId) return byId;
    if (user.name) {
      const byName = members.find(m => m.name?.trim().toLowerCase() === user.name?.trim().toLowerCase());
      if (byName) return byName;
    }
    if (user.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    if (user.phone) {
      const cleaned = user.phone.replace(/[^0-9]/g, '');
      const isReal = cleaned.length >= 8 && !/^0+$/.test(cleaned) && !/^0170{5,}/.test(cleaned) && !/^880170{5,}/.test(cleaned);
      if (isReal) {
        const byPhone = members.find(m => m.phone === user.phone);
        if (byPhone) return byPhone;
      }
    }
    return null;
  }, [members, user]);

  const memberProfile: Member = useMemo(() => {
    return myMember || {
      id: user?.memberId || user?.id?.replace('u-', 'm-') || `m-${user?.id || 'member'}`,
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
  }, [myMember, user]);

  // Active members for admin month roster
  const activeMembers = useMemo(() => {
    if (user?.role === 'member') {
      return [memberProfile];
    }
    return members.filter(m => m.status === 'active');
  }, [members, user, memberProfile]);

  // Member-specific monthly due breakdown for ALL generated active demands
  const myDuesBreakdown = useMemo(() => {
    if (!isMember) return [];
    const today = new Date().toISOString().slice(0, 10);

    return dueDemands.map(demand => {
      const paidRecord = collections.find(
        c => (c.memberId === memberProfile.id || 
              (user?.memberId && c.memberId === user.memberId) ||
              (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
              (memberProfile.name && c.memberName?.toLowerCase() === memberProfile.name.toLowerCase()) ||
              (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())) && 
             c.month === demand.month && 
             c.status === 'paid'
      );
      const pendingRecord = collections.find(
        c => (c.memberId === memberProfile.id || 
              (user?.memberId && c.memberId === user.memberId) ||
              (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
              (memberProfile.name && c.memberName?.toLowerCase() === memberProfile.name.toLowerCase()) ||
              (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())) && 
             c.month === demand.month && 
             c.status === 'pending'
      );
      const isPaid = !!paidRecord;
      const isPending = !isPaid && !!pendingRecord;
      const baseFee = demand.amountType === 'fixed' 
        ? (demand.fixedAmount || 0) 
        : (memberProfile.monthlyFee || 1000);

      const isWaived = (fineWaivers || []).some(
        w => (w.memberId === memberProfile.id || (user?.memberId && w.memberId === user.memberId) || (user?.id && w.memberId === user.id)) && w.month === demand.month
      );

      const isOverdue = !isPaid && !isPending && today > demand.dueDate;
      const fine = (!isPaid && !isPending && !isWaived && isOverdue) ? (demand.lateFine || 50) : 0;
      const totalAmount = isPaid 
        ? (paidRecord.amount + (paidRecord.lateFine || 0)) 
        : isPending 
          ? (pendingRecord.amount + (pendingRecord.lateFine || 0))
          : (baseFee + fine);

      return {
        demand,
        paidRecord,
        pendingRecord,
        isPaid,
        isPending,
        isOverdue,
        isWaived,
        baseFee,
        fine,
        totalAmount
      };
    }).sort((a, b) => b.demand.month.localeCompare(a.demand.month));
  }, [dueDemands, collections, memberProfile, user, isMember, fineWaivers]);

  const myUnpaidDues = useMemo(() => {
    return myDuesBreakdown.filter(item => !item.isPaid);
  }, [myDuesBreakdown]);

  const myTotalOutstandingDue = useMemo(() => {
    return myUnpaidDues.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [myUnpaidDues]);

  const myPaidDues = useMemo(() => {
    return myDuesBreakdown.filter(item => item.isPaid);
  }, [myDuesBreakdown]);

  const filteredMemberDues = useMemo(() => {
    if (memberFilter === 'unpaid') return myDuesBreakdown.filter(d => !d.isPaid && !d.isPending);
    if (memberFilter === 'pending') return myDuesBreakdown.filter(d => d.isPending);
    if (memberFilter === 'paid') return myDuesBreakdown.filter(d => d.isPaid);
    return myDuesBreakdown;
  }, [myDuesBreakdown, memberFilter]);

  // Aggregated dues for ALL active members across ALL demands (for Admin / Overall overview)
  const allMembersDuesSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const activeList = members.filter(m => m.status === 'active');

    return activeList.map(member => {
      const unpaidList: {
        demand: DueDemand;
        baseFee: number;
        lateFine: number;
        total: number;
        isOverdue: boolean;
      }[] = [];

      dueDemands.forEach(demand => {
        const isPaid = collections.some(
          c => (c.memberId === member.id || (member.name && c.memberName?.toLowerCase() === member.name.toLowerCase())) &&
               c.month === demand.month &&
               c.status === 'paid'
        );
        const isPending = collections.some(
          c => (c.memberId === member.id || (member.name && c.memberName?.toLowerCase() === member.name.toLowerCase())) &&
               c.month === demand.month &&
               c.status === 'pending'
        );

        if (!isPaid && !isPending) {
          const baseFee = demand.amountType === 'fixed'
            ? (demand.fixedAmount || 1000)
            : (member.monthlyFee || 1000);
          
          const isWaived = (fineWaivers || []).some(
            w => w.memberId === member.id && w.month === demand.month
          );
          const isOverdue = today > demand.dueDate;
          const lateFine = !isWaived && isOverdue ? (demand.lateFine || 50) : 0;
          const total = baseFee + lateFine;

          unpaidList.push({ demand, baseFee, lateFine, total, isOverdue });
        }
      });

      const totalDueAmount = unpaidList.reduce((sum, item) => sum + item.total, 0);
      const totalLateFine = unpaidList.reduce((sum, item) => sum + item.lateFine, 0);

      return {
        member,
        unpaidList,
        unpaidCount: unpaidList.length,
        unpaidMonths: unpaidList.map(u => u.demand.month),
        totalDueAmount,
        totalLateFine,
        hasDues: unpaidList.length > 0,
        hasOverdue: unpaidList.some(u => u.isOverdue)
      };
    });
  }, [members, dueDemands, collections, fineWaivers]);

  const filteredAllMembersDues = useMemo(() => {
    return allMembersDuesSummary.filter(item => {
      const matchesSearch = 
        item.member.name.toLowerCase().includes(allMembersSearch.toLowerCase()) ||
        item.member.id.toLowerCase().includes(allMembersSearch.toLowerCase()) ||
        item.member.phone.includes(allMembersSearch);
      
      if (!matchesSearch) return false;
      if (allMembersFilter === 'due_only') return item.hasDues;
      return true;
    }).sort((a, b) => b.totalDueAmount - a.totalDueAmount);
  }, [allMembersDuesSummary, allMembersSearch, allMembersFilter]);

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
      
      // Check if late fine is waived for this member in targetMonth
      const isWaived = (fineWaivers || []).some(
        w => (w.memberId === member.id || (user?.memberId && w.memberId === user.memberId)) && w.month === targetMonth
      );

      // Calculate late fine: if not paid & not pending and selected date is after cutoff (and not waived)
      const lateFine = !isPaid && !isPending && !isWaived && isSelectedDateAfterCutoff ? activeDemand.lateFine : 0;
      const totalPayable = isPaid 
        ? (paidRecord.amount + (paidRecord.lateFine || 0)) 
        : isPending 
          ? (pendingRecord.amount + (pendingRecord.lateFine || 0))
          : (baseFee + lateFine);

      return {
        member,
        isPaid,
        isPending,
        isWaived,
        paidRecord,
        pendingRecord,
        baseFee,
        lateFine,
        totalPayable,
        targetMonth
      };
    });
  }, [activeMembers, collections, targetMonth, activeDemand, isSelectedDateAfterCutoff, user, fineWaivers]);

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

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems: paginatedDues,
  } = usePagination(filteredDues, 25);

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

  // Open manual collection modal for a member (optionally for a specific month)
  const handleOpenCollectModal = (member: Member, monthToCollect?: string) => {
    setSelectedMember(member);
    const m = monthToCollect || targetMonth;
    if (monthToCollect) {
      setTargetMonth(monthToCollect);
    }
    setCustomDate(selectedDate);
    const demand = dueDemands.find(d => d.month === m);
    const day = Number(selectedDate.split('-')[2] || 1);
    const cutoff = demand ? Number(demand.dueDate.split('-')[2] || 10) : 10;
    const fine = demand ? demand.lateFine : 50;
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

      const newCol = await addCollection({
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

      // Send Instant Email Receipt to Member
      if (selectedMember.email) {
        fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'collection_receipt',
            to: selectedMember.email,
            data: {
              memberName: selectedMember.name,
              receiptNo: newCol?.receiptNo || 'PAID',
              month: targetMonth,
              amount: baseFee + customLateFine,
              paymentType,
              collectedBy: user?.name || 'Treasurer'
            }
          })
        }).catch(err => console.warn('Due collection receipt email error:', err));
      }

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

  // State for sending reminders
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingBulkReminders, setSendingBulkReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  // Send single due reminder
  const handleSendDueReminder = async (item: typeof duesList[0]) => {
    if (!item.member.email) {
      alert(`No email address registered for ${item.member.name}`);
      return;
    }
    setSendingReminder(item.member.id);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'due_reminder',
          to: item.member.email,
          data: {
            memberName: item.member.name,
            month: targetMonth,
            amount: item.totalPayable,
            dueDate: activeDemand?.dueDate || `${targetMonth}-10`,
            lateFine: activeDemand?.lateFine || 50
          }
        })
      });
      // Also dispatch Web Push Notification directly to the member phone
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `⏰ চাঁদা পরিশোধের অনুস্মারক (${targetMonth})`,
          message: `${item.member.name}, আপনার ${targetMonth} মাসের ${item.totalPayable} টাকা চাঁদা বকেয়া রয়েছে। অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে পরিশোধ করুন।`,
          targetUserId: item.member.id,
          url: '/dues',
        })
      }).catch(err => console.warn('Due reminder push notification error:', err));

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReminderResult(`Reminder email & push sent to ${item.member.name}!`);
      setTimeout(() => setReminderResult(null), 4000);
    } catch (err: any) {
      alert(`Failed to send reminder: ${err.message}`);
    } finally {
      setSendingReminder(null);
    }
  };

  // Send bulk reminders to all due members who have an email
  const handleSendBulkReminders = async () => {
    const dueMembersWithEmail = duesList.filter(d => !d.isPaid && !d.isPending && d.member.email);
    if (dueMembersWithEmail.length === 0) {
      alert('No unpaid members with valid email found for this month.');
      return;
    }
    if (!confirm(`Send due reminder email to ${dueMembersWithEmail.length} members for ${targetMonth}?`)) {
      return;
    }

    setSendingBulkReminders(true);
    let sentCount = 0;
    try {
      // 1. Dispatch Web Push notification to all due members
      duesList.forEach(item => {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `⏰ চাঁদা পরিশোধের অনুস্মারক (${targetMonth})`,
            message: `${item.member.name}, আপনার ${targetMonth} মাসের ${item.totalPayable} টাকা চাঁদা বকেয়া রয়েছে। নির্ধারিত তারিখ: ${activeDemand?.dueDate || `${targetMonth}-10`}।`,
            targetUserId: item.member.id,
            url: '/dues',
          })
        }).catch(err => console.warn('Bulk push send error:', err));
      });

      // 2. Dispatch Emails to members with email addresses
      for (const item of dueMembersWithEmail) {
        try {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'due_reminder',
              to: item.member.email,
              data: {
                memberName: item.member.name,
                month: targetMonth,
                amount: item.totalPayable,
                dueDate: activeDemand?.dueDate || `${targetMonth}-10`,
                lateFine: activeDemand?.lateFine || 50
              }
            })
          });
          sentCount++;
        } catch (e) {
          console.warn('Failed to send reminder to', item.member.name);
        }
      }
      setReminderResult(`Successfully sent due reminders (push + ${sentCount} emails)!`);
      setTimeout(() => setReminderResult(null), 5000);
    } finally {
      setSendingBulkReminders(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ========================================================================= */}
        {/* CASE 1: REGULAR MEMBER VIEW (USER-WISE DUES & MONTH-WISE DETAILS) */}
        {/* ========================================================================= */}
        {isMember ? (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    MEMBER PORTAL
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">মাসভিত্তিক চাঁদা ও বকেয়া বিবরণী</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                  My Subscription Dues
                </h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  আপনার অ্যাকাউন্টের মাসভিত্তিক সকল বকেয়া ও পরিশোধের অবস্থা (Month-Wise Details)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)]/80 text-xs font-mono font-medium">
                  Member ID: {memberProfile.id}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] text-[var(--foreground)]/80 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
              </div>
            </div>

            {/* Personal KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Due */}
              <div className={`glass-card p-4 rounded-2xl relative overflow-hidden border ${myTotalOutstandingDue > 0 ? 'border-amber-500/30' : 'border-[var(--border)]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Outstanding Due</span>
                  <div className={`p-2 rounded-lg ${myTotalOutstandingDue > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className={`text-lg lg:text-2xl font-black mt-3 ${myTotalOutstandingDue > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {myTotalOutstandingDue.toLocaleString()} TK
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">
                  {myUnpaidDues.length > 0 ? `${myUnpaidDues.length} month(s) pending payment` : 'All monthly dues cleared!'}
                </p>
              </div>

              {/* Card 2: Unpaid Months */}
              <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Unpaid Months</span>
                  <div className="p-2 bg-[var(--accent)] text-[var(--foreground)]/80 rounded-lg">
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">
                  {myUnpaidDues.length} <span className="text-xs font-normal text-[var(--muted-foreground)]">/ {myDuesBreakdown.length} Months</span>
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">
                  {myDuesBreakdown.filter(d => d.isOverdue).length} month(s) overdue
                </p>
              </div>

              {/* Card 3: Monthly Subscription */}
              <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Monthly Subscription</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">
                  {(memberProfile.monthlyFee || 1000).toLocaleString()} TK <span className="text-xs font-normal text-[var(--muted-foreground)]">/ mo</span>
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">Cutoff by 10th of every month</p>
              </div>

              {/* Card 4: Verified Cleared Months */}
              <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Total Cleared Months</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-emerald-400 mt-3">{myPaidDues.length} Months</p>
                <p className="text-[10px] text-emerald-500/80 mt-1">Verified receipts in system</p>
              </div>
            </div>

            {/* Quick Online Payment Banner (when member has outstanding dues) */}
            {myUnpaidDues.filter(d => !d.isPending).length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-600/15 to-emerald-600/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>বকেয়া চাঁদা পরিশোধ করুন (bKash / Nagad / Rocket)</span>
                  </div>
                  <p className="text-xs text-[var(--foreground)]/80 mt-1 max-w-xl">
                    আপনার অ্যাকাউন্টে {myUnpaidDues.filter(d => !d.isPending).length} টি মাসের মোট <strong>৳{myTotalOutstandingDue.toLocaleString()}</strong> চাঁদা বকেয়া রয়েছে। ঝামেলামুক্তভাবে যেকোনো মাসের চাঁদা এখনই অনলাইনে পরিশোধ করতে পারবেন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const firstUnpaid = myUnpaidDues.find(d => !d.isPending);
                    if (firstUnpaid) {
                      setPayModalMember(memberProfile);
                      setPayModalMonth(firstUnpaid.demand.month);
                      setPayModalAmount(firstUnpaid.baseFee);
                      setPayModalFine(firstUnpaid.fine);
                      setPayModalOpen(true);
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-pink-600/25 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Dues Online Now</span>
                </button>
              </div>
            )}

            {/* Month-Wise Dues Breakdown Section */}
            <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
              <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                    <CalendarClock className="w-4 h-4 text-indigo-400" />
                    <span>মাসভিত্তিক চাঁদা ও বকেয়া বিবরণী (Month-Wise Dues Breakdown)</span>
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    প্রতিটি মাসের দাবিকৃত চাঁদা, বিলম্ব ফি এবং পেমেন্ট স্ট্যাটাস
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setMemberFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      memberFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-white'
                    }`}
                  >
                    All Months ({myDuesBreakdown.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('unpaid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      memberFilter === 'unpaid'
                        ? 'bg-amber-500 text-black shadow-sm font-black'
                        : 'bg-[var(--secondary)] text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    Unpaid Dues ({myUnpaidDues.filter(d => !d.isPending).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      memberFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-white'
                    }`}
                  >
                    Pending ({myDuesBreakdown.filter(d => d.isPending).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      memberFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-[var(--secondary)] text-emerald-400 hover:text-white'
                    }`}
                  >
                    Paid ({myPaidDues.length})
                  </button>
                </div>
              </div>

              {filteredMemberDues.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No records found matching this filter</h4>
                  <p className="text-xs text-[var(--muted-foreground)] max-w-sm">
                    {memberFilter === 'unpaid' ? 'Great news! You have no unpaid dues in this category.' : 'No demands match the selected filter.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-[var(--muted-foreground)]">
                        <th className="p-3.5 font-semibold w-12 text-center">SL</th>
                        <th className="p-3.5 font-semibold">Billing Month</th>
                        <th className="p-3.5 font-semibold">Demand Title</th>
                        <th className="p-3.5 font-semibold">Cutoff Date</th>
                        <th className="p-3.5 font-semibold">Base Fee</th>
                        <th className="p-3.5 font-semibold">Late Fine</th>
                        <th className="p-3.5 font-semibold text-right">Total Payable</th>
                        <th className="p-3.5 font-semibold text-center">Status</th>
                        <th className="p-3.5 font-semibold text-right">Payment Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredMemberDues.map((item, idx) => (
                        <tr key={item.demand.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                          <td className="p-3.5 text-center font-mono text-[11px] text-[var(--muted-foreground)] font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-white bg-[var(--secondary)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                              {item.demand.month}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-[var(--foreground)]/90">
                            {item.demand.title}
                          </td>
                          <td className="p-3.5 text-[var(--muted-foreground)]">
                            <div className="flex items-center space-x-1 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-[var(--muted-foreground)]/70" />
                              <span>{item.demand.dueDate}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-[var(--foreground)]/80">
                            {item.baseFee.toLocaleString()} TK
                          </td>
                          <td className="p-3.5">
                            {item.isWaived ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                মওকুফ
                              </span>
                            ) : item.fine > 0 ? (
                              <span className="text-rose-400 font-bold">+{item.fine} TK</span>
                            ) : (
                              <span className="text-[var(--muted-foreground)]/70">0 TK</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right font-black text-white">
                            {item.totalAmount.toLocaleString()} TK
                          </td>
                          <td className="p-3.5 text-center">
                            {item.isPaid ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PAID</span>
                              </span>
                            ) : item.isPending ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1 animate-pulse">
                                <Clock className="w-3 h-3" />
                                <span>PENDING APPROVAL</span>
                              </span>
                            ) : item.isOverdue ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>OVERDUE</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>DUE</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {item.isPaid && item.paidRecord ? (
                              <button
                                type="button"
                                onClick={() => setViewReceipt(item.paidRecord || null)}
                                className="px-2.5 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-zinc-700 text-white text-xs font-semibold transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-sm border border-[var(--border)]"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-mono">{item.paidRecord.receiptNo || 'View Receipt'}</span>
                              </button>
                            ) : item.isPending ? (
                              <span className="text-xs text-amber-400 font-semibold inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Awaiting Review</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayModalMember(memberProfile);
                                  setPayModalMonth(item.demand.month);
                                  setPayModalAmount(item.baseFee);
                                  setPayModalFine(item.fine);
                                  setPayModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1 shadow-md shadow-indigo-600/20"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay / Submit</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: ADMIN / MANAGEMENT VIEW (ALL MEMBERS DUES + MONTH ROSTER) */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ADMIN COMMAND
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">Manual Collection & Directory</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                  Due Management & Directory
                </h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  সকল সদস্যের সামগ্রিক বকেয়া এবং মাসভিত্তিক কালেকশন ডিরেক্টরি পরিচালনা করুন
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

                {canManageDues && (
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    title="সদস্যদের পূর্বের বকেয়া এক্সেল ফাইলের মাধ্যমে ইম্পোর্ট করুন"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Import Previous Dues</span>
                  </button>
                )}

                {canManageDues && (
                  <button
                    type="button"
                    onClick={downloadDuesTemplate}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    title="বকেয়া এন্ট্রি করার জন্য নমুনা এক্সেল টেমপ্লেট ডাউনলোড করুন"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>বকেয়া টেমপ্লেট (.xlsx)</span>
                  </button>
                )}

                {canManageDues && (
                  <button
                    type="button"
                    onClick={handleSendBulkReminders}
                    disabled={sendingBulkReminders || !activeDemand || metrics.dueCount === 0}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                    title="Send due reminder email to all unpaid members"
                  >
                    {sendingBulkReminders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>{sendingBulkReminders ? 'Sending Emails...' : `Send Due Reminder (${metrics.dueCount})`}</span>
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

            {/* Admin View Mode Switcher Tabs */}
            <div className="flex items-center space-x-3 p-1.5 bg-[var(--secondary)]/90 border border-[var(--border)] rounded-2xl">
              <button
                type="button"
                onClick={() => setAdminTab('all_members_due')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  adminTab === 'all_members_due'
                    ? 'bg-amber-500 text-black shadow-md font-black'
                    : 'text-[var(--muted-foreground)] hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>সকল সদস্যের সামগ্রিক বকেয়া (All Members Due Summary)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  adminTab === 'all_members_due' ? 'bg-black/20 text-black' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {allMembersDuesSummary.filter(m => m.hasDues).length} Members
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('monthly_roster')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  adminTab === 'monthly_roster'
                    ? 'bg-indigo-600 text-white shadow-md font-black'
                    : 'text-[var(--muted-foreground)] hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>মাসভিত্তিক রোস্টার ও ক্যালেন্ডার (Month Roster: {targetMonth})</span>
              </button>
            </div>

            {/* TAB 1: ALL MEMBERS CUMULATIVE DUE SUMMARY */}
            {adminTab === 'all_members_due' && (
              <div className="space-y-6">
                {/* Overall KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-2xl border border-[var(--border)]">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Total Active Members</span>
                    <p className="text-xl font-black text-white mt-2">{members.filter(m => m.status === 'active').length}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-0.5">Contributing member profiles</p>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                    <span className="text-xs font-semibold text-amber-400">Members with Dues</span>
                    <p className="text-xl font-black text-amber-400 mt-2">
                      {allMembersDuesSummary.filter(m => m.hasDues).length} Members
                    </p>
                    <p className="text-[10px] text-amber-500/80 mt-0.5">
                      {allMembersDuesSummary.filter(m => m.hasOverdue).length} members overdue
                    </p>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                    <span className="text-xs font-semibold text-rose-400">Total Outstanding Dues</span>
                    <p className="text-xl font-black text-rose-400 mt-2">
                      {allMembersDuesSummary.reduce((s, m) => s + m.totalDueAmount, 0).toLocaleString()} TK
                    </p>
                    <p className="text-[10px] text-rose-400/70 mt-0.5">Across all generated demands</p>
                  </div>

                  <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                    <span className="text-xs font-semibold text-indigo-400">Total Generated Months</span>
                    <p className="text-xl font-black text-indigo-400 mt-2">{dueDemands.length} Months</p>
                    <p className="text-[10px] text-indigo-400/70 mt-0.5">Active demand records</p>
                  </div>
                </div>

                {/* Table of Members with Dues */}
                <div className="glass-panel rounded-2xl border border-[var(--border)] overflow-hidden shadow-xl">
                  <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>সকল সদস্যের সামগ্রিক বকেয়া তালিকা (All Members Due Directory)</span>
                      </h3>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        সদস্যদের বকেয়া মাস ও মোট টাকার পূর্ণাঙ্গ হিসাব
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--muted-foreground)]/70" />
                        <input
                          type="text"
                          placeholder="Search member name / ID..."
                          value={allMembersSearch}
                          onChange={(e) => setAllMembersSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:border-amber-500 w-52"
                        />
                      </div>

                      {/* Filter */}
                      <button
                        type="button"
                        onClick={() => setAllMembersFilter(allMembersFilter === 'due_only' ? 'all' : 'due_only')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          allMembersFilter === 'due_only'
                            ? 'bg-amber-500 text-black shadow-sm font-black'
                            : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-white'
                        }`}
                      >
                        {allMembersFilter === 'due_only' ? 'Due Only' : 'All Members'}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-[var(--muted-foreground)]">
                          <th className="p-3.5 font-semibold w-12 text-center">SL</th>
                          <th className="p-3.5 font-semibold">Member</th>
                          <th className="p-3.5 font-semibold">Monthly Fee</th>
                          <th className="p-3.5 font-semibold text-center">Unpaid Months</th>
                          <th className="p-3.5 font-semibold">Which Months Due</th>
                          <th className="p-3.5 font-semibold text-right">Late Fine</th>
                          <th className="p-3.5 font-semibold text-right">Total Due</th>
                          <th className="p-3.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {filteredAllMembersDues.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-[var(--muted-foreground)]/70">
                              কোনো বকেয়া পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          filteredAllMembersDues.map((item, idx) => (
                            <tr key={item.member.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                              <td className="p-3.5 text-center font-mono text-[11px] text-[var(--muted-foreground)] font-bold">
                                {idx + 1}
                              </td>
                              <td className="p-3.5">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {item.member.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-xs">{item.member.name}</p>
                                    <p className="text-[10px] text-[var(--muted-foreground)]/70">{item.member.id} • {item.member.phone}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 font-medium text-[var(--foreground)]/80">
                                {(item.member.monthlyFee || 1000).toLocaleString()} TK
                              </td>

                              <td className="p-3.5 text-center">
                                {item.unpaidCount > 0 ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{item.unpaidCount} Month{item.unpaidCount > 1 ? 's' : ''}</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>CLEARED</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center flex-wrap gap-1 max-w-xs">
                                  {item.unpaidList.length === 0 ? (
                                    <span className="text-[10px] text-emerald-400 font-semibold">সকল চাঁদা পরিশোধিত</span>
                                  ) : (
                                    item.unpaidList.map(u => (
                                      <span
                                        key={u.demand.id}
                                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                          u.isOverdue
                                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                        }`}
                                        title={`Fee: ${u.baseFee} TK, Fine: ${u.lateFine} TK`}
                                      >
                                        {u.demand.month}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 text-right font-medium text-rose-400">
                                {item.totalLateFine > 0 ? `+${item.totalLateFine.toLocaleString()} TK` : '-'}
                              </td>

                              <td className="p-3.5 text-right font-black text-amber-400 text-xs">
                                {item.totalDueAmount.toLocaleString()} TK
                              </td>

                              <td className="p-3.5 text-right">
                                {item.hasDues ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const firstMonth = item.unpaidMonths[0];
                                      handleOpenCollectModal(item.member, firstMonth);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-1"
                                  >
                                    <span>Collect Due</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-emerald-400 font-medium">Paid</span>
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
            )}

            {/* TAB 2: MONTH-WISE ROSTER & CALENDAR */}
            {adminTab === 'monthly_roster' && (
              <div className="space-y-6">
                {/* Reminder Result Toast Banner */}
                {reminderResult && (
                  <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{reminderResult}</span>
                  </div>
                )}

                {/* Generated Due Months Selector & Delete Manager */}
                <div className="p-4 bg-[var(--secondary)]/90 border border-[var(--border)] rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-[var(--card-foreground)]">Active Generated Due Months:</span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">Click any month to inspect or collect</span>
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

                    {/* Notice Box: Manual Collection Protection */}
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
                      <span className="text-xs font-bold text-[var(--card-foreground)]">Search & Filter ({targetMonth})</span>
                      
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--muted-foreground)]/70" />
                        <input
                          type="text"
                          placeholder="Search member name or phone..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-white placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            statusFilter === 'all'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-[var(--accent)]/80 text-[var(--muted-foreground)] hover:text-white'
                          }`}
                        >
                          All ({metrics.total})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('due')}
                          className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            statusFilter === 'due'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-[var(--accent)]/80 text-rose-400 hover:text-rose-300'
                          }`}
                        >
                          Due ({metrics.dueCount})
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
                        <div className="space-y-3">
                          {/* Top Page Size Selector */}
                          <div className="flex items-center justify-between px-1 pb-1">
                            <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} options={[10, 25, 50, 100]} />
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              Total: <strong className="text-[var(--foreground)]">{filteredDues.length}</strong> records
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-[var(--border)]/60">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/50 text-[var(--muted-foreground)]">
                                  <th className="p-3.5 font-semibold w-12 text-center">SL</th>
                                  <th className="p-3.5 font-semibold">Member</th>
                                  <th className="p-3.5 font-semibold">Monthly Fee</th>
                                  <th className="p-3.5 font-semibold">Late Fine</th>
                                  <th className="p-3.5 font-semibold text-right">Total Payable</th>
                                  <th className="p-3.5 font-semibold text-center">Status</th>
                                  <th className="p-3.5 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border)]">
                                {paginatedDues.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="p-8 text-center text-[var(--muted-foreground)]/70">
                                      No member records found matching your filters.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedDues.map((item, idx) => {
                                    const serialNo = pageSize === -1 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                                    return (
                                      <tr key={item.member.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                                        <td className="p-3.5 text-center font-mono text-[11px] text-[var(--muted-foreground)] font-bold">
                                          {serialNo}
                                        </td>
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
                                          {item.isWaived ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1" title="জরিমানা মওকুফ করা হয়েছে">
                                              <span>মওকুফ</span>
                                            </span>
                                          ) : item.lateFine > 0 ? (
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
                                          ) : (
                                            <div className="flex items-center justify-end space-x-1.5">
                                              {canManageDues && !item.isPaid && !item.isPending && (
                                                item.isWaived ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => removeFineWaiver(item.member.id, item.targetMonth)}
                                                    className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                                                    title="জরিমানা পুনর্বহাল করুন"
                                                  >
                                                    ফাইন ফেরাও
                                                  </button>
                                                ) : isSelectedDateAfterCutoff && (activeDemand?.lateFine || 0) > 0 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => waiveFine(item.member.id, item.targetMonth)}
                                                    className="px-2 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                                    title="বিলম্ব জরিমানা মওকুফ করুন"
                                                  >
                                                    <span>জরিমানা মওকুফ</span>
                                                  </button>
                                                ) : null
                                              )}
                                              {canManageDues && item.member.email && (
                                                <button
                                                  type="button"
                                                  disabled={sendingReminder === item.member.id}
                                                  onClick={() => handleSendDueReminder(item)}
                                                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center"
                                                  title={`Send due reminder email to ${item.member.email}`}
                                                >
                                                  {sendingReminder === item.member.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                  ) : (
                                                    <Mail className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleOpenCollectModal(item.member)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center space-x-1"
                                              >
                                                <span>Collect Due</span>
                                                <ArrowRight className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Bottom Table Controls: Pagination */}
                          <DataTablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
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
            memberId={payModalMember?.id || memberProfile?.id || user?.id || ''}
            memberName={payModalMember?.name || memberProfile?.name || user?.name || ''}
            defaultMonth={payModalMonth}
            defaultAmount={payModalAmount}
            defaultFine={payModalFine}
            unpaidMonths={
              isMember
                ? myUnpaidDues.filter(d => !d.isPending).map(d => ({
                    month: d.demand.month,
                    fee: d.baseFee,
                    fine: d.fine
                  }))
                : duesList.filter(d => !d.isPaid && !d.isPending).map(d => ({
                    month: d.targetMonth,
                    fee: d.baseFee,
                    fine: d.lateFine
                  }))
            }
          />
        )}

        {/* View Receipt Voucher Modal */}
        {viewReceipt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-4 sm:p-6 relative text-[var(--foreground)] shadow-2xl animate-in zoom-in-95 duration-150 my-6">
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-[var(--accent)] hover:bg-zinc-700 text-[var(--muted-foreground)] hover:text-white transition-all cursor-pointer z-20"
                title="Close receipt"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4 pr-10">
                <h3 className="text-sm font-bold text-white">Official Money Receipt Voucher</h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">FDC Foundation computerized subscription deposit pad</p>
              </div>

              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded-xl p-1 bg-zinc-200/50">
                <PrintableReceipt collection={viewReceipt} />
              </div>

              <div className="pt-4 mt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  Receipt Ref: <span className="font-mono text-emerald-400 font-bold">{viewReceipt.receiptNo}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewReceipt(null)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)]/80 text-xs font-medium transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Previous Dues Import Modal */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="dues"
          title="সদস্যদের পূর্বের বকেয়া তালিকা ইম্পোর্ট (Excel / CSV)"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            const count = await importPreviousDues(rows);
            setReminderResult(`✅ সফলভাবে ${count}টি পূর্বের বকেয়া রেকর্ড সিস্টেমে যুক্ত করা হয়েছে!`);
            setTimeout(() => setReminderResult(null), 6000);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
