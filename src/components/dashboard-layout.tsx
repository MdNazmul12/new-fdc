'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/auth-context';
import { useStore } from '../contexts/store-context';
import { UserRole } from '../types';
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
  Palette
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, switchRole, hasPermission, loading } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'night'>('dark');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Sync theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('fdc_theme') as 'light' | 'dark' | 'night' || 'dark';
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-zinc-400 font-medium">Checking authentication...</p>
      </div>
    );
  }

  // Navigation Links definition with permission checks
  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: { module: 'dashboard', action: 'view' as const } },
    { 
      name: user.role === 'member' ? 'My Profile' : 'Members', 
      path: user.role === 'member' ? '/members/profile' : '/members', 
      icon: Users, 
      permission: { module: 'members', action: 'view' as const } 
    },
    { name: 'Collections', path: '/collections', icon: DollarSign, permission: { module: 'collections', action: 'view' as const } },
    { name: 'Due List', path: '/dues', icon: CalendarClock, permission: { module: 'collections', action: 'view' as const } },
    { name: 'Generate Dues', path: '/generate-dues', icon: PlusCircle, permission: { module: 'collections', action: 'create' as const } },
    { name: 'Investments', path: '/investments', icon: TrendingUp, permission: { module: 'investments', action: 'view' as const } },
    { name: 'Expenses', path: '/expenses', icon: CreditCard, permission: { module: 'expenses', action: 'view' as const } },
    { name: 'Accounting', path: '/accounting', icon: BookOpen, permission: { module: 'accounting', action: 'view' as const } },
    { name: 'Reports', path: '/reports', icon: FileText, permission: { module: 'reports', action: 'view' as const } },
    { name: 'User Management', path: '/users', icon: UserCog, permission: { module: 'users', action: 'view' as const } },
  ];

  const filteredNavItems = navigationItems.filter(item => 
    hasPermission(item.permission.module, item.permission.action)
  );

  const userNotifications = notifications.filter(n => {
    if (user.role !== 'member') return true;
    return !n.userId || n.userId === 'all' || n.userId === user.id || n.userId === user.id.replace('u-', 'm-');
  });

  const unreadNotifications = userNotifications.filter(n => !n.read);

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
    <div className="min-h-screen flex bg-zinc-950">
      {/* ---------------- SIDEBAR (DESKTOP) ---------------- */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-zinc-900 border-r border-zinc-800 p-4 shrink-0 justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden shrink-0">
              <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">FDC Management</span>
              <span className="block text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Friends Dreams Corp</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info footer */}
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-850 border border-zinc-800">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-zinc-200 truncate">{user.name}</p>
                <p className="text-[10px] text-zinc-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- MOBILE SIDEBAR (DRAWER) ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col justify-between h-full animate-fade-in-up">
            <div>
              <div className="flex items-center justify-between px-2 py-4 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                    <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-zinc-200">FDC Platform</span>
                    <span className="block text-[9px] text-emerald-400 font-semibold">Friends Dreams Corp</span>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1" onClick={() => setMobileMenuOpen(false)}>
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' 
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <button onClick={logout} className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-md">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MAIN CONTENT AREA ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header bar */}
        <header className="bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800 h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 no-print">
          
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-md lg:hidden hover:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base lg:text-lg font-bold text-zinc-100 flex items-center space-x-2">
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
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Toggle Theme Mode"
              >
                {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
                {theme === 'night' && <Palette className="w-4 h-4 text-sky-400" />}
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl py-1 z-50">
                  <button
                    onClick={() => changeTheme('light')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'light' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'dark' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    onClick={() => changeTheme('night')}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center space-x-2 ${
                      theme === 'night' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800'
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="capitalize hidden md:inline">Role: {user.role.replace('_', ' ')}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {roleSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl py-1 z-50">
                    <div className="px-3 py-1 border-b border-zinc-850">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Emulate Role</p>
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
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                  setRoleSwitcherOpen(false);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 relative transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-200">System Notifications</h3>
                    {unreadNotifications.length > 0 && (
                      <button 
                        onClick={markAllNotificationsRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
                    {userNotifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">No notifications</div>
                    ) : (
                      userNotifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            markNotificationRead(n.id);
                          }}
                          className={`p-3 text-left transition-colors cursor-pointer ${
                            n.read ? 'bg-zinc-900 opacity-60' : 'bg-zinc-850 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <span className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</span>
                            <div>
                              <p className="text-xs font-semibold text-zinc-200">{n.title}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[9px] text-zinc-500 mt-1">{n.date}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
                className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="w-7.5 h-7.5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 hidden sm:inline" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-zinc-850 text-left">
                    <p className="text-xs font-semibold text-zinc-200">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                  
                  {user.role === 'member' ? (
                    <Link 
                      href="/members/profile" 
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      My Profile
                    </Link>
                  ) : (
                    <Link 
                      href="/users" 
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      User Profile
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-zinc-800 flex items-center space-x-1 border-t border-zinc-850"
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
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
