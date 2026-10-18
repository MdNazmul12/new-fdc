'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useAuth } from '../../contexts/auth-context';
import { useStore } from '../../contexts/store-context';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Layers,
  Server,
  ArrowRight,
  Clock,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface BackupSummary {
  [collection: string]: number;
}

interface ParsedBackup {
  app?: string;
  version?: string;
  exportedAt?: string;
  database?: string;
  totalRecords?: number;
  summary?: BackupSummary;
  data: Record<string, any[]>;
}

export default function BackupPage() {
  const { user } = useAuth();
  const {
    members,
    collections,
    investments,
    expenses,
    transactions,
    loans,
    dueDemands,
    users,
    notifications,
    documents
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Export
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [selectedColForSingleExport, setSelectedColForSingleExport] = useState<string>('members');

  // States for Restore
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<ParsedBackup | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Check access permission
  const isSuperAdmin = user?.role === 'super_admin';
  const isPresident = user?.role === 'president';
  const hasAccess = isSuperAdmin || isPresident;

  // Real-time collection counts from current store
  const collectionCounts: Record<string, number> = {
    members: members.length,
    collections: collections.length,
    investments: investments.length,
    expenses: expenses.length,
    transactions: transactions.length,
    loans: loans.length,
    due_demands: dueDemands.length,
    users: users.length,
    notifications: notifications.length,
    documents: documents.length
  };

  const totalLiveRecords = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

  // ─── 1. FULL BACKUP EXPORT ──────────────────────────────────────────
  const handleDownloadFullBackup = async () => {
    setExporting(true);
    setExportSuccess(null);
    try {
      const res = await fetch('/api/db/backup');
      if (!res.ok) {
        throw new Error('Failed to fetch database backup');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `FDC_Database_Backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportSuccess('Full database backup successfully generated and downloaded!');
      setTimeout(() => setExportSuccess(null), 6000);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ─── 2. SINGLE COLLECTION EXPORT ────────────────────────────────────
  const handleDownloadSingleCollection = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/db/${selectedColForSingleExport}`);
      if (!res.ok) throw new Error(`Failed to export ${selectedColForSingleExport}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fdc_${selectedColForSingleExport}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // ─── 3. FILE SELECTION & PARSING ────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileError(null);
    setRestoreSuccess(null);
    setRestoreError(null);
    setConfirmText('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Support both full wrapper format and direct { collection: [] } format
        let structuredData: Record<string, any[]> = {};
        let summary: BackupSummary = {};

        if (parsed.data && typeof parsed.data === 'object') {
          structuredData = parsed.data;
          summary = parsed.summary || {};
          if (Object.keys(summary).length === 0) {
            Object.keys(structuredData).forEach((k) => {
              summary[k] = Array.isArray(structuredData[k]) ? structuredData[k].length : 0;
            });
          }
        } else if (typeof parsed === 'object') {
          structuredData = parsed;
          Object.keys(parsed).forEach((k) => {
            if (Array.isArray(parsed[k])) {
              summary[k] = parsed[k].length;
            }
          });
        } else {
          throw new Error('Unrecognized JSON backup format');
        }

        const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);

        setParsedBackup({
          app: parsed.app || 'FDC Backup File',
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || new Date(file.lastModified).toISOString(),
          database: parsed.database || 'New-FDC',
          totalRecords,
          summary,
          data: structuredData
        });
      } catch (err: any) {
        setFileError(`Invalid JSON backup file: ${err.message}`);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // ─── 4. RESTORE EXECUTION ───────────────────────────────────────────
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      alert('Please type RESTORE in the confirmation box to proceed.');
      return;
    }

    setRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const res = await fetch('/api/db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: restoreMode,
          data: parsedBackup.data,
          restoredBy: user?.name || 'Super Admin'
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to restore database');
      }

      setRestoreSuccess(result);
      setParsedBackup(null);
      setSelectedFile(null);
      setConfirmText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setRestoreError(err.message || 'An error occurred during restore.');
    } finally {
      setRestoring(false);
    }
  };

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Access Restricted</h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto">
            Database Backup & Restore operations are restricted to <strong>Super Admin</strong> and <strong>President</strong> accounts for system security and integrity.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight flex items-center space-x-2">
              <Database className="w-6 h-6 text-indigo-400" />
              <span>Database Backup & Restore</span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Safeguard community records, download point-in-time snapshots, and restore from backups
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>MongoDB Connected</span>
            </span>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="glass-panel p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Database Engine</span>
              <p className="text-sm font-extrabold text-[var(--foreground)] mt-0.5 flex items-center space-x-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>MongoDB Atlas</span>
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]/70 font-mono">Cluster0 · New-FDC</p>
            </div>

            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Total Collections</span>
              <p className="text-sm font-extrabold text-[var(--foreground)] mt-0.5 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>{Object.keys(collectionCounts).length} Collections</span>
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]/70">Relational & Ledger</p>
            </div>

            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Total Documents</span>
              <p className="text-sm font-extrabold text-white mt-0.5 flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>{totalLiveRecords.toLocaleString()} Records</span>
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]/70">Stored in cloud</p>
            </div>

            <div>
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold">Security Protocol</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>TLS Encrypted</span>
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]/70">Audit logged</p>
            </div>
          </div>
        </div>

        {/* Global Success / Warning Alerts */}
        {exportSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {restoreSuccess && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{restoreSuccess.message}</span>
            </div>
            <p className="text-xs text-zinc-300">
              Total <strong>{restoreSuccess.totalRestored}</strong> documents restored across all collections. Please refresh your browser to re-sync all live data.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh App Now</span>
            </button>
          </div>
        )}

        {/* Two-Column Grid: Backup (Left) & Restore (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ==================== SECTION 1: EXPORT BACKUP ==================== */}
          <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-[var(--border)]">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--foreground)]">Download Database Backup</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Create a complete offline copy in JSON format</p>
              </div>
            </div>

            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Backing up generates a snapshot containing all members, collection receipts, investments, expenses, general ledger transactions, community loans, and user accounts.
            </p>

            {/* Live Collection Breakdown */}
            <div className="p-4 bg-[var(--secondary)] rounded-2xl space-y-2 border border-[var(--border)] text-xs">
              <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-wider block mb-2">
                Included in Full Snapshot ({Object.keys(collectionCounts).length} Collections)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(collectionCounts).map(([col, count]) => (
                  <div key={col} className="p-2 rounded-xl bg-[var(--background)]/60 border border-[var(--border)] flex justify-between items-center">
                    <span className="capitalize text-zinc-400 text-[11px] truncate">{col.replace('_', ' ')}</span>
                    <span className="font-mono font-bold text-indigo-400 text-[11px] ml-1">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleDownloadFullBackup}
              disabled={exporting}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {exporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Snapshot...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Full Database (.JSON)</span>
                </>
              )}
            </button>

            {/* Secondary Option: Export Single Collection */}
            <div className="pt-4 border-t border-[var(--border)]">
              <label className="block text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5">
                Export Single Collection Only
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedColForSingleExport}
                  onChange={(e) => setSelectedColForSingleExport(e.target.value)}
                  className="flex-1 bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 capitalize cursor-pointer"
                >
                  {Object.keys(collectionCounts).map((col) => (
                    <option key={col} value={col}>
                      {col.replace('_', ' ')} ({collectionCounts[col]} records)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDownloadSingleCollection}
                  disabled={exporting}
                  className="px-3 py-2 bg-[var(--secondary)] hover:bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* ==================== SECTION 2: RESTORE BACKUP ==================== */}
          <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-[var(--border)]">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--foreground)]">Restore from Backup</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Upload a previously exported .json file</p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File Dropzone / Picker */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-500/5 group text-center"
              >
                <FileJson className="w-10 h-10 text-[var(--muted-foreground)] group-hover:text-indigo-400 transition-colors mb-2" />
                <p className="text-xs font-bold text-[var(--foreground)]">Click to Select Backup JSON File</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Accepts official FDC .json backup files</p>
              </div>
            ) : (
              <div className="p-4 bg-[var(--secondary)] border border-[var(--border)] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 truncate">
                    <FileJson className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-[var(--foreground)] truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] font-mono">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedBackup(null);
                      setFileError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Parsed summary preview */}
                {parsedBackup && (
                  <div className="pt-3 border-t border-[var(--border)] space-y-2 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--muted-foreground)]">Backup Timestamp:</span>
                      <span className="font-mono text-zinc-300">
                        {new Date(parsedBackup.exportedAt || '').toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--muted-foreground)]">Total Documents:</span>
                      <span className="font-bold text-indigo-400">{parsedBackup.totalRecords} records</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold block mb-1.5">
                        Detected Collections:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedBackup.summary &&
                          Object.entries(parsedBackup.summary).map(([k, count]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[10px] text-zinc-300"
                            >
                              {k}: <strong className="text-emerald-400">{count}</strong>
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {fileError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Restore Options (when valid file loaded) */}
            {parsedBackup && (
              <div className="space-y-4 pt-2 border-t border-[var(--border)] animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-2">
                    Select Restore Strategy *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        restoreMode === 'replace'
                          ? 'border-rose-500/50 bg-rose-500/10 text-white'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <p className="font-bold flex items-center space-x-1.5">
                        <span>Clean Wipe & Replace</span>
                      </p>
                      <p className="text-[10px] opacity-70 mt-1">
                        Clears existing database and recreates identical snapshot.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        restoreMode === 'merge'
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      <p className="font-bold flex items-center space-x-1.5">
                        <span>Merge & Upsert</span>
                      </p>
                      <p className="text-[10px] opacity-70 mt-1">
                        Updates existing by ID and appends new documents.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Safety Confirmation Input */}
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
                  <p className="text-xs text-rose-300 font-semibold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Safety Confirmation Required</span>
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    Type <strong className="font-mono text-rose-300">RESTORE</strong> in the box below to authorize this database operation:
                  </p>
                  <input
                    type="text"
                    placeholder="Type RESTORE to confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full bg-[var(--background)] border border-rose-500/30 rounded-xl p-2 text-xs text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono tracking-widest"
                  />
                </div>

                {restoreError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={restoring || confirmText.trim().toUpperCase() !== 'RESTORE'}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {restoring ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Restoring Database Records...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Execute Database Restore</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
