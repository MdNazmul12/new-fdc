'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth-context';
import { useStore } from '../contexts/store-context';
import { UserRole } from '../types';
import PushNotificationManager, { PushNotificationRow } from './push-notification-manager';
import BroadcastModal from './broadcast-modal';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  BookOpen, 
  FileText, 
  UserCog, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  Shield, 
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  PlusCircle,
  FileCheck,
  CheckCircle,
  Info,
  Sun,
  Moon,
  Palette,
  Banknote,
  Database,
  Smartphone,
  Download,
  Share2,
  Megaphone,
  Coins,
  MessageSquare,
  Send,
  RotateCcw,
  History,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  PanelLeftClose
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, switchRole, hasPermission, loading } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, resendNotification } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'night'>('light');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'payment' | 'due' | 'notice' | 'loan'>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Main menu sidebar visibility & submenu toggle states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fdc_sidebar_open');
      if (saved !== null) {
        setSidebarOpen(saved === 'true');
      }
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fdc_sidebar_open', String(next));
      }
      return next;
    });
  };

  const toggleSubmenu = (itemName: string, defaultOpen: boolean) => {
    setOpenSubmenus(prev => {
      const current = prev[itemName] !== undefined ? prev[itemName] : defaultOpen;
      return {
        ...prev,
        [itemName]: !current
      };
    });
  };

  const handleResendNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setResendingId(id);
    try {
      await resendNotification(id);
    } catch (err) {
      console.error(err);
    } finally {
      setResendingId(null);
    }
  };

  // Sync theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('fdc_theme') as 'light' | 'dark' | 'night' || 'light';
      setTheme(savedTheme);
      document.documentElement.className = `${savedTheme}`;
    }
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'night') => {
    setTheme(newTheme);
    localStorage.setItem('fdc_theme', newTheme);
    document.documentElement.className = `${newTheme}`;
    setThemeMenuOpen(false);
  };

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[var(--muted-foreground)] font-medium">Checking authentication...</p>
      </div>
    );
  }

  // Navigation Links definition with parent-child submenu structure
  type NavItem = {
    name: string;
    path: string;
    icon: any;
    permission: { module: string; action: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'print' };
    badge?: string;
    badgeColor?: string;
    children?: NavItem[];
  };

  const navigationItems: NavItem[] = [
    // ── TOP-LEVEL STANDALONE ITEMS ──
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: LayoutDashboard, 
      permission: { module: 'dashboard', action: 'view' as const } 
    },
    { 
      name: user.role === 'member' ? 'My Profile' : 'Members', 
      path: user.role === 'member' ? '/members/profile' : '/members', 
      icon: Users, 
      permission: { module: 'members', action: 'view' as const } 
    },
    { 
      name: 'Community Chat', 
      path: '/chat', 
      icon: MessageSquare, 
      permission: { module: 'chat', action: 'view' as const },
      badge: 'NEW',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    },

    // ── COLLECTIONS & DUES (PARENT WITH SUBMENU) ──
    { 
      name: 'Collections & Dues',
      path: '/collections',
      icon: DollarSign, 
      permission: { module: 'collections', action: 'view' as const },
      children: [
        { 
          name: 'Collections', 
          path: '/collections', 
          icon: DollarSign, 
          permission: { module: 'collections', action: 'view' as const } 
        },
        { 
          name: 'Due List', 
          path: '/dues', 
          icon: CalendarClock, 
          permission: { module: 'collections', action: 'view' as const } 
        },
        { 
          name: 'Advance Payment', 
          path: '/advance-payment', 
          icon: Coins, 
          permission: { module: 'advance_payment', action: 'view' as const },
          badge: 'NEW',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
        },
        { 
          name: 'Generate Dues', 
          path: '/generate-dues', 
          icon: PlusCircle, 
          permission: { module: 'collections', action: 'create' as const },
          badge: '12M',
          badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
        },
      ]
    },

    // ── REPORTS (PARENT WITH SUBMENU) ──
    { 
      name: 'Reports',
      path: '/reports',
      icon: FileSpreadsheet, 
      permission: { module: 'collections', action: 'view' as const },
      children: [
        { 
          name: 'Member Collections', 
          path: '/reports?type=member_collection', 
          icon: UserCheck, 
          permission: { module: 'collections', action: 'view' as const },
          badge: 'NEW',
          badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
        },
        { 
          name: 'Member Dues Report', 
          path: '/reports?type=due', 
          icon: AlertTriangle, 
          permission: { module: 'collections', action: 'view' as const },
          badge: 'NEW',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        },
        { 
          name: 'All Financial Reports', 
          path: '/reports', 
          icon: FileSpreadsheet, 
          permission: { module: 'reports', action: 'view' as const } 
        },
      ]
    },

    // ── FINANCE & ACCOUNTS (PARENT WITH SUBMENU) ──
    { 
      name: 'Finance & Accounts',
      path: '/expenses',
      icon: CreditCard, 
      permission: { module: 'expenses', action: 'view' as const },
      children: [
        { 
          name: 'Expenses', 
          path: '/expenses', 
          icon: CreditCard, 
          permission: { module: 'expenses', action: 'view' as const } 
        },
        { 
          name: 'Loans', 
          path: '/loans', 
          icon: Banknote, 
          permission: { module: 'loans', action: 'view' as const } 
        },
        { 
          name: 'Investments', 
          path: '/investments', 
          icon: TrendingUp, 
          permission: { module: 'investments', action: 'view' as const } 
        },
        { 
          name: 'Accounting Ledger', 
          path: '/accounting', 
          icon: BookOpen, 
          permission: { module: 'accounting', action: 'view' as const } 
        },
      ]
    },

    // ── COMMUNICATION & SYSTEM (PARENT WITH SUBMENU) ──
    { 
      name: 'Communication & System',
      path: '/dashboard#message-history',
      icon: UserCog, 
      permission: { module: 'dashboard', action: 'view' as const },
      children: [
        { 
          name: 'Message History', 
          path: '/dashboard#message-history', 
          icon: History, 
          permission: { module: 'dashboard', action: 'view' as const },
          badge: 'NEW',
          badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
        },
        { 
          name: 'User Management', 
          path: '/users', 
          icon: UserCog, 
          permission: { module: 'users', action: 'view' as const } 
        },
        { 
          name: 'Backup & Restore', 
          path: '/backup', 
          icon: Database, 
          permission: { module: 'backup', action: 'view' as const } 
        },
      ]
    },
  ];

  // Filter top-level items AND children by permission
  const filteredNavItems = navigationItems.filter(item => {
    if (user.role === 'super_admin') return true;
    if (item.children) {
      return item.children.some(child => hasPermission(child.permission.module, child.permission.action));
    }
    return hasPermission(item.permission.module, item.permission.action);
  }).map(item => {
    if (item.children && user.role !== 'super_admin') {
      return {
        ...item,
        children: item.children.filter(child => hasPermission(child.permission.module, child.permission.action))
      };
    }
    return item;
  });

  const isItemActive = (itemPath: string) => {
    if (typeof window !== 'undefined') {
      const currentFull = window.location.pathname + window.location.search;
      if (itemPath.includes('?')) {
        return currentFull === itemPath;
      }
      if (itemPath.includes('#')) {
        return window.location.pathname === itemPath.split('#')[0] && window.location.hash === '#' + itemPath.split('#')[1];
      }
      if (itemPath === '/reports') {
        return pathname === '/reports' && !window.location.search.includes('type=');
      }
    }
    return pathname === itemPath || (itemPath !== '/dashboard' && pathname.startsWith(itemPath));
  };

  // Check if any child of a parent is currently active
  const isParentActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some(child => isItemActive(child.path));
  };

  const userNotifications = notifications.filter(n => {
    if (user.role !== 'member') {
      // Admin, Collector, President, Treasurer view
      return !n.userId || n.userId === 'all' || n.userId === 'admin' || n.userId === user.id;
    }
    // Strict Member View: NEVER show admin approval reminders or other members' payment notices
    if (n.userId === 'admin') return false;
    if (n.link === '/collections') return false;
    if (n.title?.includes('অনুমোদন করুন') || n.message?.includes('অনুমোদন করুন')) return false;
    if (n.title?.includes('নতুন পেমেন্ট জমা') && !n.title?.includes('পেমেন্ট সাবমিট হয়েছে')) return false;

    // Must be directly targeted to this member or general society announcement
    const isDirectlyForMe = (
      n.userId === user.id || 
      n.userId === user.id.replace('u-', 'm-') || 
      (user.memberId && n.userId === user.memberId)
    );
    if (isDirectlyForMe) return true;
    if (n.userId === 'all' && (n.category === 'notice' || n.type === 'info' || n.type === 'warning')) {
      // General society broadcast or meeting notice
      return true;
    }
    return false;
  });

  const unreadNotifications = userNotifications.filter(n => !n.read);

  const filteredNotifications = userNotifications.filter(n => {
    if (notifFilter === 'all') return true;
    if (n.category) return n.category === notifFilter;
    const text = (n.title + ' ' + n.message).toLowerCase();
    if (notifFilter === 'payment') return text.includes('পেমেন্ট') || text.includes('জমা') || text.includes('payment');
    if (notifFilter === 'due') return text.includes('বকেয়া') || text.includes('বকেয়া') || text.includes('due') || text.includes('জরিমানা');
    if (notifFilter === 'notice') return text.includes('নোটিশ') || text.includes('ঘোষণা') || text.includes('notice') || text.includes('মিটিং');
    if (notifFilter === 'loan') return text.includes('লোন') || text.includes('ঋণ') || text.includes('loan') || text.includes('কিস্তি');
    return true;
  });

  const canBroadcast = user.role === 'super_admin' || user.role === 'president' || user.role === 'treasurer' || user.role === 'collector';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  const rolesList: { key: UserRole; name: string }[] = [
    { key: 'super_admin', name: 'Super Admin' },
    { key: 'president', name: 'President' },
    { key: 'treasurer', name: 'Treasurer' },
    { key: 'collector', name: 'Collector' },
    { key: 'auditor', name: 'Auditor' },
    { key: 'member', name: 'Member' }
  ];

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* ---------------- SIDEBAR (DESKTOP) ---------------- */}
      <aside className={`${sidebarOpen ? 'lg:flex' : 'hidden'} hidden lg:flex-col lg:w-64 bg-[var(--card)] border-r border-[var(--border)] p-4 shrink-0 justify-between h-screen sticky top-0 overflow-y-auto scrollbar-thin transition-all duration-300`}>
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between px-2 py-3 mb-4">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
              </div>
              <div className="truncate">
                <span className="font-extrabold text-base tracking-tight text-[var(--foreground)] block truncate">FDC Management</span>
                <span className="block text-[10px] text-emerald-500 font-semibold tracking-wider uppercase truncate">Friends Dreams Corp</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer shrink-0"
              title="Hide Main Menu (মেনু লুকান)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {filteredNavItems.map((item) => {
              const isActive = isItemActive(item.path);
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const parentActive = Boolean(hasChildren && isParentActive(item));
              const isExpanded = Boolean(hasChildren && (
                openSubmenus[item.name] !== undefined 
                  ? openSubmenus[item.name] 
                  : parentActive
              ));

              return (
                <React.Fragment key={item.name}>
                  {hasChildren ? (
                    <>
                      {/* Parent menu item with submenu */}
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.name, parentActive)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 group cursor-pointer mt-1 ${
                          parentActive
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                            : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                        }`}
                        title={`${isExpanded ? 'Hide' : 'Show'} ${item.name}`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            parentActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                          }`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted-foreground)] transition-transform duration-200 ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`} />
                      </button>
                      {/* Submenu items */}
                      {isExpanded && (
                        <div className="ml-3 pl-3 border-l-2 border-[var(--border)] space-y-0.5 py-0.5">
                          {item.children!.map((child) => {
                            const childActive = isItemActive(child.path);
                            return (
                              <Link
                                key={child.name}
                                href={child.path}
                                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 group ${
                                  childActive
                                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold shadow-sm'
                                    : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  <child.icon className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${childActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                                  <span className="truncate">{child.name}</span>
                                </div>
                                {child.badge && (
                                  <span className={`text-[8px] px-1 py-0.5 rounded font-black tracking-wider uppercase shrink-0 ${child.badgeColor || 'bg-indigo-500/20 text-indigo-300'}`}>
                                    {child.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Standalone menu item (no submenu) */
                    <Link
                      href={item.path}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 group ${
                        isActive 
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)] font-bold shadow-sm' 
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase shrink-0 ${item.badgeColor || 'bg-indigo-500/20 text-indigo-300'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* User Info footer */}
        <div className="border-t border-[var(--border)] pt-4 mt-4">
          <Link
            href="/members/profile"
            className="flex items-center justify-between p-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] transition-colors group"
            title="View Profile & Change Password"
          >
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0 uppercase overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">{user.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                logout(); 
              }} 
              className="p-1.5 text-[var(--muted-foreground)] hover:text-rose-500 rounded-md hover:bg-[var(--accent)] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </aside>

      {/* ---------------- MOBILE SIDEBAR (DRAWER) ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 bg-[var(--card)] border-r border-[var(--border)] p-4 flex flex-col justify-between h-full overflow-y-auto animate-fade-in-up">
            <div>
              <div className="flex items-center justify-between px-2 py-4 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                    <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[var(--foreground)]">FDC Platform</span>
                    <span className="block text-[9px] text-emerald-500 font-semibold">Friends Dreams Corp</span>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--accent)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-0.5">
                {filteredNavItems.map((item) => {
                  const isActive = isItemActive(item.path);
                  const hasChildren = Boolean(item.children && item.children.length > 0);
                  const parentActive = Boolean(hasChildren && isParentActive(item));
                  const isExpanded = Boolean(hasChildren && (
                    openSubmenus[item.name] !== undefined 
                      ? openSubmenus[item.name] 
                      : parentActive
                  ));

                  return (
                    <React.Fragment key={item.name}>
                      {hasChildren ? (
                        <>
                          {/* Parent menu item with submenu */}
                          <button
                            type="button"
                            onClick={() => toggleSubmenu(item.name, parentActive)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 group cursor-pointer mt-1 ${
                              parentActive
                                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                            }`}
                            title={`${isExpanded ? 'Hide' : 'Show'} ${item.name}`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                                parentActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                              }`} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted-foreground)] transition-transform duration-200 ${
                              isExpanded ? 'rotate-0' : '-rotate-90'
                            }`} />
                          </button>
                          {/* Submenu items */}
                          {isExpanded && (
                            <div className="ml-3 pl-3 border-l-2 border-[var(--border)] space-y-0.5 py-0.5">
                              {item.children!.map((child) => {
                                const childActive = isItemActive(child.path);
                                return (
                                  <Link
                                    key={child.name}
                                    href={child.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 group ${
                                      childActive
                                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-bold shadow-sm'
                                        : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <child.icon className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110 ${childActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                                      <span className="truncate">{child.name}</span>
                                    </div>
                                    {child.badge && (
                                      <span className={`text-[8px] px-1 py-0.5 rounded font-black tracking-wider uppercase shrink-0 ${child.badgeColor || 'bg-indigo-500/20 text-indigo-300'}`}>
                                        {child.badge}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Standalone menu item (no submenu) */
                        <Link
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 group ${
                            isActive 
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)] font-bold shadow-sm' 
                              : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase shrink-0 ${item.badgeColor || 'bg-indigo-500/20 text-indigo-300'}`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <Link 
                href="/members/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] transition-colors mb-2"
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">{user.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{user.role.replace('_', ' ')} • Profile</p>
                  </div>
                </div>
              </Link>
              {/* Permanent Install App Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowInstallGuide(true);
                }}
                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-xl flex items-center justify-center space-x-2 transition-all mb-2 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Install FDC App (iOS / Android)</span>
              </button>

              <button 
                onClick={logout} 
                className="w-full py-2 px-3 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center justify-center space-x-2 transition-colors border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header bar */}
        <header className="bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 no-print">
          
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  toggleSidebar();
                } else {
                  setMobileMenuOpen(true);
                }
              }}
              className="p-2 -ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--accent)] transition-colors"
              title={sidebarOpen ? 'মেনু লুকান (Hide Menu)' : 'মেনু দেখান (Show Menu)'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base lg:text-lg font-bold text-[var(--foreground)] flex items-center space-x-2">
              <span className="capitalize">{pathname.split('/')[1] || 'Dashboard'}</span>
            </h1>
          </div>

          {/* Right: Quick actions, notifications, role switcher */}
          <div className="flex items-center space-x-3">
            
            {/* THEME TOGGLER (LIGHT / DARK / NIGHT) */}
            <div className="relative">
              <button
                onClick={() => {
                  setThemeMenuOpen(!themeMenuOpen);
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                  setRoleSwitcherOpen(false);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
                title="Toggle Theme Mode"
              >
                {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
                {theme === 'night' && <Palette className="w-4 h-4 text-sky-400" />}
                <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" />
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => changeTheme('light')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'light' ? 'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'dark' ? 'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    onClick={() => changeTheme('night')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'night' ? 'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-sky-400" />
                    <span>Night Mode</span>
                  </button>
                </div>
              )}
            </div>

            {/* ROLE EMULATOR SWITCHER (DEVELOPMENT REVIEW MODE ONLY) */}
            {user.role === 'super_admin' && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setRoleSwitcherOpen(!roleSwitcherOpen);
                    setNotificationsOpen(false);
                    setProfileOpen(false);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="capitalize hidden md:inline">Role: {user.role.replace('_', ' ')}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {roleSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-50">
                    <div className="px-3 py-1 border-b border-[var(--border)]">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">Emulate Role</p>
                    </div>
                    {rolesList.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => {
                          switchRole(r.key);
                          setRoleSwitcherOpen(false);
                          router.refresh();
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          user.role === r.key 
                            ? 'bg-indigo-600 text-white font-medium' 
                            : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BROADCAST ANNOUNCEMENT BUTTON (COMMITTEE / ADMINS) */}
            {canBroadcast && (
              <button
                type="button"
                onClick={() => setBroadcastOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Send Broadcast Announcement (Push & In-App)"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ঘোষণা</span>
              </button>
            )}

            {/* COMMUNITY CHAT SHORTCUT */}
            <Link
              href="/chat"
              className={`p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors relative ${
                pathname === '/chat' ? 'text-indigo-400 bg-indigo-500/10' : ''
              }`}
              title="Community Chat (কমিউনিটি চ্যাট)"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>

            {/* Notification Dropdown - Single Bell Icon */}
            <div className="relative">
              <button 
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                  setRoleSwitcherOpen(false);
                }}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] relative transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-[var(--foreground)]">Notifications</h3>
                      {unreadNotifications.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                          {unreadNotifications.length} new
                        </span>
                      )}
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button 
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-[var(--primary)] hover:opacity-80 font-medium cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification Category Filter Tabs */}
                  <div className="px-2.5 py-1.5 bg-zinc-900/60 border-b border-[var(--border)] flex items-center space-x-1 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'all', label: 'সব' },
                      { id: 'payment', label: '💰 পেমেন্ট' },
                      { id: 'due', label: '📋 বকেয়া' },
                      { id: 'notice', label: '📢 নোটিশ' },
                      { id: 'loan', label: '💳 লোন' },
                    ].map((tab) => {
                      const isActive = notifFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setNotifFilter(tab.id as any)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Phone Push Notification integrated toggle row */}
                  <PushNotificationRow />
                  
                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                        কোনো নোটিফিকেশন পাওয়া যায়নি
                      </div>
                    ) : (
                      filteredNotifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            markNotificationRead(n.id);
                          }}
                          className={`p-3 text-left transition-colors cursor-pointer ${
                            n.read ? 'opacity-65' : 'bg-indigo-500/5 hover:bg-indigo-500/10'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <span className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-semibold text-[var(--foreground)] truncate">{n.title}</p>
                                <div className="flex items-center space-x-1 shrink-0">
                                  {n.resendCount && n.resendCount > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-300">
                                      {n.resendCount}x
                                    </span>
                                  ) : null}
                                  {n.category && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider bg-zinc-800 text-zinc-400">
                                      {n.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{n.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[9px] text-[var(--muted-foreground)]/80">{n.date}</p>
                                <button
                                  type="button"
                                  onClick={(e) => handleResendNotif(e, n.id)}
                                  disabled={resendingId === n.id}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all inline-flex items-center space-x-1 cursor-pointer"
                                  title="মেসেজ বা নোটিফিকেশন আবার পাঠান"
                                >
                                  <RotateCcw className={`w-2.5 h-2.5 ${resendingId === n.id ? 'animate-spin' : ''}`} />
                                  <span>{resendingId === n.id ? 'পাঠানো হচ্ছে...' : 'আবার পাঠান'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-zinc-900/80 border-t border-[var(--border)] text-center">
                    <Link
                      href="/dashboard#message-history"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center space-x-1"
                    >
                      <span>মেসেজ ও নোটিফিকেশন হিস্টরি দেখুন</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                  setRoleSwitcherOpen(false);
                }}
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-xs overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)] hidden sm:inline" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-[var(--border)] text-left">
                    <p className="text-xs font-semibold text-[var(--foreground)]">{user.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                  </div>
                  
                  <Link 
                    href="/members/profile" 
                    onClick={() => setProfileOpen(false)}
                    className="block w-full text-left px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                  >
                    My Profile & Password
                  </Link>
                  
                  {user.role !== 'member' && (
                    <Link 
                      href="/users" 
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                    >
                      User Management
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-[var(--accent)] flex items-center space-x-1 border-t border-[var(--border)]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Section */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* ---------------- MOBILE BOTTOM NAVIGATION BAR ---------------- */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--card)]/95 backdrop-blur-xl border-t border-[var(--border)] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              pathname === '/dashboard' ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Home</span>
          </Link>

          <Link
            href="/collections"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              pathname.startsWith('/collections') ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Collection</span>
          </Link>

          <Link
            href="/dues"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              pathname.startsWith('/dues') ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Dues</span>
          </Link>

          <Link
            href="/loans"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              pathname.startsWith('/loans') ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Loans</span>
          </Link>

          <Link
            href={user.role === 'member' ? '/members/profile' : '/members'}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              pathname.startsWith('/members') ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{user.role === 'member' ? 'Profile' : 'Members'}</span>
          </Link>
        </nav>
      </div>

      {/* ──────────────── INSTALL FDC APP MODAL (iOS & Android) ──────────────── */}
      {showInstallGuide && (
        <div 
          className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowInstallGuide(false)}
        >
          <div 
            className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">FDC App ইনস্টলেশন গাইড</h3>
                  <p className="text-[10px] text-zinc-400">iPhone / iPad এবং Android এর জন্য</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS Instructions Section */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                <span>🍏 iPhone / iPad (Safari) ব্যবহারকারীদের জন্য:</span>
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">১</span>
                  <p>Safari ব্রাউজারের নিচে থাকা <strong className="text-white">Share (শেয়ার)</strong> আইকনে চাপ দিন (<Share2 className="w-3.5 h-3.5 inline mx-0.5 text-indigo-400" />)।</p>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">২</span>
                  <p>একটু নিচে স্ক্রোল করে <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> অপশনে ট্যাপ করুন।</p>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">৩</span>
                  <p>উপরে ডান কোণায় <strong className="text-emerald-400">&ldquo;Add&rdquo;</strong> বাটনে ট্যাপ করলেই আপনার হোম স্ক্রিনে FDC অ্যাপ যুক্ত হয়ে যাবে!</p>
                </div>
              </div>
            </div>

            {/* Android Instructions Section */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                <span>🤖 Android (Chrome) ব্যবহারকারীদের জন্য:</span>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-300">
                <p>Chrome ব্রাউজারের উপরে ডান কোণায় <strong className="text-white">থ্রি-ডট (⋮)</strong> মেনুতে চাপ দিয়ে <strong className="text-emerald-400">&ldquo;Install app&rdquo;</strong> বা <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong> ট্যাপ করুন।</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বুঝেছি / Close
            </button>
          </div>
        </div>
      )}
      <PushNotificationManager />
      <BroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </div>
  );
}
