'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Percent, 
  PiggyBank, 
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  PlusCircle
} from 'lucide-react';
import Link from 'next/link';

// Dynamic Recharts import to avoid SSR issues
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export default function Dashboard() {
  const { stats, transactions, investments, notifications } = useStore();
  const { user, hasPermission } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format Currency in BDT
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  // Generate dynamic chart data based on transactions
  const getChartData = () => {
    const months = ['2026-05', '2026-06', '2026-07'];
    
    return months.map(m => {
      // Income = Collections + Interest Income
      const monthlyIncome = transactions
        .filter(t => t.date.startsWith(m) && (t.category === 'Collection' || t.category === 'Interest Income'))
        .reduce((sum, t) => sum + t.amount, 0);

      // Expenses = Expense category
      const monthlyExpense = transactions
        .filter(t => t.date.startsWith(m) && t.category === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthName = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' });
      return {
        month: monthName,
        Income: monthlyIncome,
        Expense: monthlyExpense
      };
    });
  };

  // Generate dynamic investment distribution data
  const getInvestmentDistribution = () => {
    const distribution: Record<string, number> = {};
    const runningInvs = investments.filter(i => i.status === 'running');
    
    if (runningInvs.length === 0) return [{ name: 'No Investments', value: 1 }];

    runningInvs.forEach(inv => {
      distribution[inv.type] = (distribution[inv.type] || 0) + inv.principalAmount;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getChartData();
  const pieData = getInvestmentDistribution();
  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  // Filter recent 5 transactions
  const recentTransactions = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Active notifications (max 3)
  const activeAlerts = notifications.filter(n => !n.read).slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Quick welcome bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Assalamu Alaikum, {user?.name}</h2>
            <p className="text-xs text-zinc-400">Welcome to your financial command center. Here is your foundation status.</p>
          </div>
          
          {/* Quick Actions (only for relevant roles) */}
          <div className="flex items-center space-x-2">
            {hasPermission('collections', 'create') && (
              <Link 
                href="/collections"
                className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Collection</span>
              </Link>
            )}
            
            {hasPermission('investments', 'create') && (
              <Link
                href="/investments" 
                className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/15 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Investment</span>
              </Link>
            )}
          </div>
        </div>

        {/* Live warnings / notifications bar */}
        {activeAlerts.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <p className="text-xs font-bold">Action Required: Pending Reminders</p>
              <ul className="list-disc list-inside text-[11px] text-zinc-400 mt-1 space-y-1">
                {activeAlerts.map(alert => (
                  <li key={alert.id}>{alert.title}: {alert.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---------------- METRICS CARDS GRID ---------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Collection */}
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-2xl rounded-full"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Collections</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalCollection)}</p>
            <div className="flex items-center space-x-1 text-[10px] text-emerald-400 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>12.5% increase vs last month</span>
            </div>
          </div>

          {/* Card 2: Total Active Investment */}
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 grad-emerald opacity-5 blur-2xl rounded-full"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Running Portfolios</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalInvestment)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{stats.runningInvestments} active assets running</p>
          </div>

          {/* Card 3: Total Expenses */}
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 grad-rose opacity-5 blur-2xl rounded-full"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Expenses</span>
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><CreditCard className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalExpenses)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Including office rents, staff salary</p>
          </div>

          {/* Card 4: Accumulated Interest */}
          <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 grad-amber opacity-5 blur-2xl rounded-full"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Interest Income</span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Percent className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalInterestEarned)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">FDR/DPS dividends & loan returns</p>
          </div>

          {/* Card 5: Bank Balance */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Bank Book Balance</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><PiggyBank className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.bankBalance)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Managed across savings & FDR books</p>
          </div>

          {/* Card 6: Cash In Hand */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Available Cash (Drawer)</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><Wallet className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.availableCash)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Cash buffer for administrative expenses</p>
          </div>

          {/* Card 7: Outstanding Dues */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Outstanding Dues</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3 text-amber-500">{formatCurrency(stats.dueCollection)}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Dues from active member profiles</p>
          </div>

          {/* Card 8: Total Members */}
          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Members</span>
              <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><Users className="w-4 h-4" /></div>
            </div>
            <p className="text-lg lg:text-2xl font-black text-white mt-3">{stats.totalMembers}</p>
            <p className="text-[10px] text-zinc-500 mt-1">{stats.activeMembers} Active Profiles registered</p>
          </div>

        </div>

        {/* ---------------- CHARTS SECTION ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Income vs Expenses Chart */}
          <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Monthly Cash Inflow vs Expenses</h3>
                <p className="text-[10px] text-zinc-500">Summary comparison of monthly collected funds against administrative logs</p>
              </div>
            </div>
            
            <div className="h-64 w-full text-xs">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Income" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500">Loading Chart...</div>
              )}
            </div>
          </div>

          {/* Asset Allocation Chart */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-zinc-200">Investment Asset Allocation</h3>
              <p className="text-[10px] text-zinc-500">Breakdown of principal values in running portfolios</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-zinc-500">Loading Chart...</div>
              )}
            </div>

            {/* Custom Pie Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
              {pieData.map((entry, idx) => (
                <div key={entry.name} className="flex items-center space-x-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  <span className="text-zinc-300 truncate">{entry.name}</span>
                  <span className="text-zinc-500 ml-auto">({formatCurrency(entry.value)})</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ---------------- BOTTOM SEGMENT: TRANSACTIONS & DETAILS ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Double Entry Ledgers */}
          <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Recent Accounting Ledgers</h3>
                <p className="text-[10px] text-zinc-500">Double-entry record of capital credits and expenses</p>
              </div>
              
              <Link 
                href="/accounting"
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
              >
                View Cash Book
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Account</th>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold">Description</th>
                    <th className="pb-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {recentTransactions.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr key={tx.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-2.5 text-zinc-400 text-[10px]">{tx.date}</td>
                        <td className="py-2.5 font-medium text-zinc-300 capitalize text-[10px]">{tx.account}</td>
                        <td className="py-2.5 text-[10px]"><span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">{tx.category}</span></td>
                        <td className="py-2.5 text-zinc-400 truncate max-w-[200px] text-[10px]">{tx.description}</td>
                        <td className={`py-2.5 font-bold text-right text-[11px] ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-200">Portfolio Status</h3>
              <p className="text-[10px] text-zinc-500">Summary ratios for foundation health check</p>
            </div>

            <div className="space-y-4 my-4">
              {/* Stat 1: Collections Ratio */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-400">Paid Collections Ratio</span>
                  <span className="text-zinc-200 font-semibold">
                    {Math.round((stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${(stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Stat 2: Expense to Income Ratio */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-400">Expense-to-Income Ratio</span>
                  <span className="text-zinc-200 font-semibold">
                    {Math.min(100, Math.round((stats.totalExpenses / (stats.totalCollection + stats.totalInterestEarned || 1)) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (stats.totalExpenses / (stats.totalCollection + stats.totalInterestEarned || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stat 3: Investment returns */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-zinc-400">Running Investments Principal Ratio</span>
                  <span className="text-zinc-200 font-semibold">
                    {Math.round((stats.totalInvestment / (stats.bankBalance + stats.totalInvestment || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${(stats.totalInvestment / (stats.bankBalance + stats.totalInvestment || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-850 text-center">
              All financial ratios are updated automatically.
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
