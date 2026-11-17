'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { SystemNotification, Member } from '../../types';
import { 
  History, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  Send, 
  RotateCcw, 
  Smartphone, 
  MessageSquare, 
  Phone, 
  User, 
  Users, 
  Calendar, 
  Download, 
  ChevronRight, 
  Eye, 
  RefreshCw, 
  Mail, 
  Plus,
  Clock,
  CheckCheck,
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { PageSizeSelector, DataTablePagination, usePagination } from '../../components/pagination';

export default function MessagesPage() {
  const { user } = useAuth();
  const { 
    members, 
    notifications, 
    resendNotification, 
    addNotification, 
    markNotificationRead, 
    markAllNotificationsRead 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'members' | 'logs'>('members');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'delivered' | 'not_sent' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Message Modal State
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState<string>('all');
  const [newMsgTitle, setNewMsgTitle] = useState('');
  const [newMsgBody, setNewMsgBody] = useState('');
  const [newMsgCategory, setNewMsgCategory] = useState<'notice' | 'due' | 'payment' | 'general'>('notice');
  const [isSending, setIsSending] = useState(false);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Resend Handler
  const handleResend = async (id: string, memberName?: string) => {
    setResendingId(id);
    try {
      const ok = await resendNotification(id);
      if (ok) {
        showToast(memberName ? `${memberName}-কে মেসেজ আবার সফলভাবে পাঠানো হয়েছে!` : 'মেসেজ পুনরায় সফলভাবে পাঠানো হয়েছে!');
      } else {
        showToast('মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (e) {
      console.error(e);
      showToast('মেসেজ পাঠাতে ত্রুটি হয়েছে।');
    } finally {
      setResendingId(null);
    }
  };

  // Quick Send to a specific member
  const handleOpenSendForMember = (memberId: string) => {
    setTargetMemberId(memberId);
    setSendModalOpen(true);
  };

  // Submit New Message
  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgTitle.trim() || !newMsgBody.trim()) {
      showToast('শিরোনাম ও মেসেজ লিখুন');
      return;
    }

    setIsSending(true);
    try {
      if (targetMemberId === 'all') {
        // Broadcast
        await addNotification({
          userId: 'all',
          title: newMsgTitle.trim(),
          message: newMsgBody.trim(),
          type: newMsgCategory === 'due' ? 'warning' : 'info',
          category: newMsgCategory,
          link: '/dashboard',
          smsStatus: 'sent'
        });
        showToast('সকল সদস্যকে সফলভাবে নোটিফিকেশন/মেসেজ পাঠানো হয়েছে!');
      } else {
        const targetMember = members.find(m => m.id === targetMemberId);
        await addNotification({
          userId: targetMemberId,
          title: newMsgTitle.trim(),
          message: newMsgBody.trim(),
          type: newMsgCategory === 'due' ? 'warning' : 'info',
          category: newMsgCategory,
          link: '/dashboard',
          smsStatus: 'sent'
        });
        showToast(`${targetMember ? targetMember.name : 'মেম্বার'}-কে মেসেজ পাঠানো হয়েছে!`);
      }

      setSendModalOpen(false);
      setNewMsgTitle('');
      setNewMsgBody('');
    } catch (err) {
      console.error(err);
      showToast('মেসেজ পাঠানো সম্ভব হয়নি।');
    } finally {
      setIsSending(false);
    }
  };

  // 1. Process Member-wise Message status
  const memberMessageStatuses = useMemo(() => {
    return members.map(m => {
      // Find all notifications for this member
      const memberNotifs = notifications.filter(n => {
        if (n.userId === m.id) return true;
        if (m.id.startsWith('m-') && n.userId === m.id.replace('m-', 'u-')) return true;
        if (n.userId === 'all') return true;
        return false;
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const latestNotif = memberNotifs[0] || null;
      const totalSent = memberNotifs.length;
      const hasDelivered = latestNotif ? (latestNotif.smsStatus !== 'failed') : false;
      const isRead = latestNotif ? latestNotif.read : false;
      const status: 'delivered' | 'not_sent' | 'unread' = !latestNotif 
        ? 'not_sent' 
        : (latestNotif.smsStatus === 'failed' ? 'not_sent' : (isRead ? 'delivered' : 'unread'));

      return {
        member: m,
        latestNotif,
        totalSent,
        hasDelivered,
        isRead,
        status,
        allNotifs: memberNotifs
      };
    });
  }, [members, notifications]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalSent = notifications.length;
    const deliveredCount = memberMessageStatuses.filter(m => m.hasDelivered).length;
    const notSentCount = memberMessageStatuses.filter(m => !m.hasDelivered).length;
    const unreadCount = notifications.filter(n => !n.read && n.userId !== 'admin').length;

    return {
      totalSent,
      deliveredCount,
      notSentCount,
      unreadCount,
      totalMembers: members.length
    };
  }, [notifications, memberMessageStatuses, members]);

  // Filtered Member statuses
  const filteredMemberRows = useMemo(() => {
    return memberMessageStatuses.filter(item => {
      // Delivery status filter
      if (deliveryFilter === 'delivered' && !item.hasDelivered) return false;
      if (deliveryFilter === 'not_sent' && item.hasDelivered) return false;
      if (deliveryFilter === 'unread' && item.isRead) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m = item.member;
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesPhone = m.phone?.toLowerCase().includes(q);
        const matchesId = m.id?.toLowerCase().includes(q);
        const matchesLatestMsg = item.latestNotif?.message?.toLowerCase().includes(q) || item.latestNotif?.title?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesId || matchesLatestMsg;
      }
      return true;
    });
  }, [memberMessageStatuses, deliveryFilter, searchQuery]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return notifications.filter(n => {
      // Category filter
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;

      // Delivery status
      if (deliveryFilter === 'delivered' && n.smsStatus === 'failed') return false;
      if (deliveryFilter === 'not_sent' && n.smsStatus !== 'failed' && n.smsStatus !== 'pending') return false;
      if (deliveryFilter === 'unread' && n.read) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesBody = n.message?.toLowerCase().includes(q);
        const targetMember = members.find(m => m.id === n.userId || (m.id.startsWith('m-') && n.userId === m.id.replace('m-', 'u-')));
        const matchesMember = targetMember && (targetMember.name.toLowerCase().includes(q) || targetMember.phone.includes(q));
        return matchesTitle || matchesBody || matchesMember;
      }
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [notifications, categoryFilter, deliveryFilter, searchQuery, members]);

  // Pagination for members tab
  const {
    pageSize: memberPageSize,
    setPageSize: setMemberPageSize,
    currentPage: memberCurrentPage,
    setCurrentPage: setMemberCurrentPage,
    totalPages: memberTotalPages,
    paginatedItems: paginatedMembers
  } = usePagination(filteredMemberRows, 15);

  // Pagination for logs tab
  const {
    pageSize: logPageSize,
    setPageSize: setLogPageSize,
    currentPage: logCurrentPage,
    setCurrentPage: setLogCurrentPage,
    totalPages: logTotalPages,
    paginatedItems: paginatedLogs
  } = usePagination(filteredLogs, 15);

  // Export to Excel
  const exportToExcel = () => {
    if (activeTab === 'members') {
      const data = filteredMemberRows.map((r, idx) => ({
        'ক্র/নং': idx + 1,
        'মেম্বার আইডি': r.member.id,
        'মেম্বার নাম': r.member.name,
        'মোবাইল নং': r.member.phone,
        'মেসেজ ডেলিভারি': r.hasDelivered ? 'মেসেজ গেছে (Delivered)' : 'মেসেজ যায় নাই (Not Sent)',
        'পড়া হয়েছে কিনা': r.isRead ? 'পড়েছেন (Read)' : 'পড়েননি (Unread)',
        'সর্বশেষ মেসেজ': r.latestNotif?.title || 'কোনো মেসেজ নেই',
        'তারিখ': r.latestNotif?.date || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Member_Message_Status');
      XLSX.writeFile(wb, `FDC_Member_Message_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const data = filteredLogs.map((n, idx) => ({
        'ক্র/নং': idx + 1,
        'তারিখ': n.date,
        'শিরোনাম': n.title,
        'মেসেজ বিবরণী': n.message,
        'ক্যাটাগরি': n.category || 'general',
        'প্রাপক': n.userId === 'all' ? 'সকল সদস্য (All)' : (members.find(m => m.id === n.userId)?.name || n.userId),
        'স্ট্যাটাস': n.smsStatus || 'sent',
        'পঠিত': n.read ? 'হ্যাঁ' : 'না'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'All_Message_Logs');
      XLSX.writeFile(wb, `FDC_Message_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-sm">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[var(--foreground)] tracking-tight">
                  মেসেজ হিস্টোরি ও ডেলিভারি ট্র্যাকার (Message History)
                </h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  কোন মেম্বারের কাছে মেসেজ গেছে এবং কার কাছে যায়নি তার সম্পূর্ণ রিপোর্ট ও নিয়ন্ত্রণ
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3.5 py-2 rounded-xl bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--foreground)] text-xs font-bold transition-all border border-[var(--border)] inline-flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Excel এ ডাউনলোড করুন"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel Export</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetMemberId('all');
                setSendModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>নতুন মেসেজ পাঠান</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted-foreground)]">মোট মেম্বার</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-[var(--foreground)] mt-2">{stats.totalMembers}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">এফডিসি নিবন্ধিত সদস্য</p>
          </div>

          <div 
            onClick={() => setDeliveryFilter('delivered')}
            className={`p-4 rounded-2xl bg-[var(--card)] border transition-all cursor-pointer shadow-sm ${
              deliveryFilter === 'delivered' ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30' : 'border-[var(--border)] hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">মেসেজ গেছে (সফল)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{stats.deliveredCount}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">মেম্বারের কাছে মেসেজ পৌঁছেছে</p>
          </div>

          <div 
            onClick={() => setDeliveryFilter('not_sent')}
            className={`p-4 rounded-2xl bg-[var(--card)] border transition-all cursor-pointer shadow-sm ${
              deliveryFilter === 'not_sent' ? 'border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/30' : 'border-[var(--border)] hover:border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400">মেসেজ যায় নাই / বাকি</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{stats.notSentCount}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">যাদের মেসেজ যায়নি বা কখনো পাঠানো হয়নি</p>
          </div>

          <div 
            onClick={() => setDeliveryFilter('unread')}
            className={`p-4 rounded-2xl bg-[var(--card)] border transition-all cursor-pointer shadow-sm ${
              deliveryFilter === 'unread' ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30' : 'border-[var(--border)] hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">অপঠিত মেসেজ</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{stats.unreadCount}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">মেম্বার এখনও পড়ে দেখেননি</p>
          </div>
        </div>

        {/* Tab & Filter Navigation */}
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border)]">
            
            {/* View Switcher: Member-wise Status vs All Logs */}
            <div className="flex items-center space-x-1.5 p-1 bg-[var(--secondary)] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'members'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>মেম্বারভিত্তিক তালিকা ({filteredMemberRows.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>সকল মেসেজ লগ ({filteredLogs.length})</span>
              </button>
            </div>

            {/* Delivery Filter Tabs */}
            <div className="flex items-center space-x-1.5 flex-wrap">
              {[
                { key: 'all', label: 'সব (All)' },
                { key: 'delivered', label: '✓ মেসেজ গেছে' },
                { key: 'not_sent', label: '✕ মেসেজ যায় নাই' },
                { key: 'unread', label: '• অপঠিত' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setDeliveryFilter(f.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    deliveryFilter === f.key
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-bold'
                      : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar & Category Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="মেম্বারের নাম, আইডি, ফোন নাম্বার বা মেসেজ দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeTab === 'logs' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[var(--muted-foreground)] font-semibold shrink-0">ধরন:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">সকল ধরন</option>
                  <option value="due">বকেয়া তাগিদ (Due Reminder)</option>
                  <option value="payment">পেমেন্ট রসিদ (Payment Receipt)</option>
                  <option value="notice">সমিতি নোটিশ (Notice)</option>
                  <option value="loan">লোন সতর্কবার্তা (Loan Alert)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: MEMBER-WISE MESSAGE STATUS TABLE */}
        {activeTab === 'members' && (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/40 text-[11px] font-black uppercase text-[var(--muted-foreground)] tracking-wider">
                    <th className="py-3 px-4">মেম্বার</th>
                    <th className="py-3 px-4">মোবাইল নং</th>
                    <th className="py-3 px-4 text-center">ডেলিভারি স্ট্যাটাস</th>
                    <th className="py-3 px-4">সর্বশেষ মেসেজ</th>
                    <th className="py-3 px-4 text-center">পঠিত কিনা</th>
                    <th className="py-3 px-4 text-center">মোট মেসেজ</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {paginatedMembers.length > 0 ? (
                    paginatedMembers.map((row) => {
                      const m = row.member;
                      const hasDelivered = row.hasDelivered;
                      const latest = row.latestNotif;

                      return (
                        <tr key={m.id} className="hover:bg-[var(--accent)]/40 transition-colors">
                          {/* Member info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0">
                                {m.photoUrl ? (
                                  <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                                ) : (
                                  m.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-[var(--foreground)] block">{m.name}</span>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                  {m.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Mobile No with Call action */}
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {m.phone ? (
                              <a 
                                href={`tel:${m.phone}`}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center space-x-1"
                                title="সরাসরি কল দিন"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{m.phone}</span>
                              </a>
                            ) : (
                              <span className="text-[var(--muted-foreground)]/60">নং নেই</span>
                            )}
                          </td>

                          {/* Delivery Status Badge */}
                          <td className="py-3 px-4 text-center">
                            {hasDelivered ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>মেসেজ গেছে</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <XCircle className="w-3 h-3" />
                                <span>মেসেজ যায় নাই</span>
                              </span>
                            )}
                          </td>

                          {/* Latest Message Details */}
                          <td className="py-3 px-4 max-w-xs">
                            {latest ? (
                              <div>
                                <p className="font-semibold text-[var(--foreground)] truncate" title={latest.title}>
                                  {latest.title}
                                </p>
                                <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5" title={latest.message}>
                                  {latest.message}
                                </p>
                                <span className="text-[9px] text-[var(--muted-foreground)]/60 font-mono block mt-0.5">
                                  {latest.date}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--muted-foreground)]/50 italic text-[11px]">
                                কোনো মেসেজ পাঠানো হয়নি
                              </span>
                            )}
                          </td>

                          {/* Read status */}
                          <td className="py-3 px-4 text-center">
                            {latest ? (
                              latest.read ? (
                                <span className="text-emerald-400 text-[11px] font-semibold inline-flex items-center space-x-1">
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>পড়েছেন</span>
                                </span>
                              ) : (
                                <span className="text-amber-400 text-[11px] font-semibold inline-flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>পড়েননি</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[var(--muted-foreground)]/40">-</span>
                            )}
                          </td>

                          {/* Total Sent */}
                          <td className="py-3 px-4 text-center font-bold text-[var(--foreground)]">
                            {row.totalSent}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {latest ? (
                                <button
                                  type="button"
                                  onClick={() => handleResend(latest.id, m.name)}
                                  disabled={resendingId === latest.id}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                                  title="সর্বশেষ মেসেজ আবার পাঠান"
                                >
                                  <RotateCcw className={`w-3 h-3 ${resendingId === latest.id ? 'animate-spin' : ''}`} />
                                  <span>{resendingId === latest.id ? 'পাঠাচ্ছে...' : 'আবার পাঠান'}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSendForMember(m.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                                  title="এই মেম্বারকে নতুন মেসেজ পাঠান"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>মেসেজ দিন</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenSendForMember(m.id)}
                                className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                                title="নতুন কাস্টম মেসেজ লিখুন"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--muted-foreground)]">
                        <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
                        <p className="font-semibold text-xs">কোনো মেম্বার রেকর্ড পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <PageSizeSelector pageSize={memberPageSize} onPageSizeChange={setMemberPageSize} />
              <DataTablePagination 
                currentPage={memberCurrentPage} 
                totalPages={memberTotalPages} 
                onPageChange={setMemberCurrentPage} 
                totalItems={filteredMemberRows.length} 
                pageSize={memberPageSize} 
              />
            </div>
          </div>
        )}

        {/* TAB 2: COMPLETE MESSAGE LOGS TABLE */}
        {activeTab === 'logs' && (
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/40 text-[11px] font-black uppercase text-[var(--muted-foreground)] tracking-wider">
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">প্রাপক মেম্বার</th>
                    <th className="py-3 px-4">ক্যাটাগরি</th>
                    <th className="py-3 px-4">মেসেজ বিবরণ</th>
                    <th className="py-3 px-4 text-center">ডেলিভারি</th>
                    <th className="py-3 px-4 text-center">পঠিত</th>
                    <th className="py-3 px-4 text-right">পুনরায় পাঠান</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((n) => {
                      const recipientMember = members.find(m => m.id === n.userId || (m.id.startsWith('m-') && n.userId === m.id.replace('m-', 'u-')));
                      const isBroadcast = n.userId === 'all';
                      const isFailed = n.smsStatus === 'failed';

                      return (
                        <tr key={n.id} className="hover:bg-[var(--accent)]/40 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted-foreground)] whitespace-nowrap">
                            {n.date}
                            {n.resendCount && n.resendCount > 0 && (
                              <span className="block text-[9px] text-indigo-400 font-bold">
                                Sent {n.resendCount + 1}x
                              </span>
                            )}
                          </td>

                          {/* Recipient */}
                          <td className="py-3 px-4">
                            {isBroadcast ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                📢 সকল সদস্য (All)
                              </span>
                            ) : recipientMember ? (
                              <div>
                                <span className="font-bold text-[var(--foreground)] block">{recipientMember.name}</span>
                                <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                  {recipientMember.phone}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--muted-foreground)] font-mono text-[11px]">{n.userId || 'System'}</span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
                              {n.category || 'general'}
                            </span>
                          </td>

                          {/* Message Body */}
                          <td className="py-3 px-4 max-w-sm">
                            <p className="font-bold text-[var(--foreground)] truncate" title={n.title}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5" title={n.message}>
                              {n.message}
                            </p>
                          </td>

                          {/* Delivery status */}
                          <td className="py-3 px-4 text-center">
                            {isFailed ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Failed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                Delivered
                              </span>
                            )}
                          </td>

                          {/* Read Status */}
                          <td className="py-3 px-4 text-center">
                            {n.read ? (
                              <span className="text-emerald-400 text-[11px] font-semibold">পড়েছেন</span>
                            ) : (
                              <span className="text-amber-400 text-[11px] font-semibold">অপঠিত</span>
                            )}
                          </td>

                          {/* Resend Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleResend(n.id, recipientMember?.name)}
                              disabled={resendingId === n.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                              title="মেসেজটি আবার পাঠান"
                            >
                              <RotateCcw className={`w-3 h-3 ${resendingId === n.id ? 'animate-spin' : ''}`} />
                              <span>{resendingId === n.id ? 'পাঠাচ্ছে...' : 'আবার পাঠান'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--muted-foreground)]">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
                        <p className="font-semibold text-xs">কোনো মেসেজ লগ পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <PageSizeSelector pageSize={logPageSize} onPageSizeChange={setLogPageSize} />
              <DataTablePagination 
                currentPage={logCurrentPage} 
                totalPages={logTotalPages} 
                onPageChange={setLogCurrentPage} 
                totalItems={filteredLogs.length} 
                pageSize={logPageSize} 
              />
            </div>
          </div>
        )}

        {/* MODAL: SEND NEW MESSAGE / SMS */}
        {sendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">নতুন মেসেজ বা নোটিফিকেশন পাঠান</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSendModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendMessageSubmit} className="p-5 space-y-4">
                {/* Select Recipient */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    প্রাপক নির্বাচন করুন (Recipient) *
                  </label>
                  <select
                    value={targetMemberId}
                    onChange={(e) => setTargetMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">📢 সকল সদস্য (Send to All Members)</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    ক্যাটাগরি (Category)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'notice', label: 'নোটিশ' },
                      { key: 'due', label: 'বকেয়া তাগিদ' },
                      { key: 'payment', label: 'পেমেন্ট' },
                      { key: 'general', label: 'সাধারণ' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setNewMsgCategory(cat.key as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          newMsgCategory === cat.key
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--accent)]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    মেসেজের বিষয় / শিরোনাম (Title) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মাসিক চাঁদা পরিশোধের অনুরোধ"
                    value={newMsgTitle}
                    onChange={(e) => setNewMsgTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    মেসেজের বিবরণী (Message Body) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="আপনার মেসেজ এখানে লিখুন..."
                    value={newMsgBody}
                    onChange={(e) => setNewMsgBody(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setSendModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-bold transition-all cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠান'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
