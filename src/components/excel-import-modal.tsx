'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Table as TableIcon
} from 'lucide-react';

export type ImportType = 'members' | 'collections' | 'investments';

interface ExcelImportModalProps {
  isOpen: boolean;
  type: ImportType;
  title: string;
  onClose: () => void;
  onImportSuccess: (rows: any[]) => Promise<void>;
}

export default function ExcelImportModal({
  isOpen,
  type,
  title,
  onClose,
  onImportSuccess,
}: ExcelImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setColumns([]);
    setError(null);
    setSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleRow: any[] = [];
    let filename = '';

    if (type === 'members') {
      filename = 'FDC_Members_Template.xlsx';
      headers = ['Name', 'Email', 'Phone', 'Monthly Fee', 'Nominee Name', 'Nominee Relation', 'Nominee Phone', 'Join Date', 'Status'];
      sampleRow = ['Rahim Ahmed', 'rahim@fdc.org', '+8801711223344', 1000, 'Salma Begum', 'Wife', '+8801711001122', '2026-01-10', 'active'];
    } else if (type === 'collections') {
      filename = 'FDC_Collections_Template.xlsx';
      headers = ['Member Name', 'Amount', 'Month', 'Payment Type', 'Late Fine', 'Collected By', 'Date'];
      sampleRow = ['Rahim Ahmed', 1000, '2026-05', 'cash', 0, 'Treasurer', '2026-05-10'];
    } else if (type === 'investments') {
      filename = 'FDC_Investments_Template.xlsx';
      headers = ['Type', 'Provider', 'Principal Amount', 'Interest Rate', 'Start Date', 'Maturity Date', 'Notes'];
      sampleRow = ['FDR', 'BRAC Bank', 200000, 9.5, '2026-01-01', '2027-01-01', 'Standard 1-Year FDR'];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    // Set auto-width
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename);
  };

  // Handle File Upload and Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Convert to JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('The uploaded Excel file contains no data rows.');
          setParsedData([]);
          return;
        }

        // Detect columns from first row
        const detectedCols = Object.keys(rawJson[0]);
        setColumns(detectedCols);

        // Normalize data based on type
        const normalized = rawJson.map((row) => {
          // Helper to find column regardless of casing or spaces
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                key => key.trim().toLowerCase() === k.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return row[matchedKey];
              }
            }
            return '';
          };

          if (type === 'members') {
            const name = String(getVal(['name', 'member name', 'member_name'])).trim();
            const email = String(getVal(['email', 'email address'])).trim();
            const phone = String(getVal(['phone', 'phone number', 'contact', 'mobile'])).trim();
            const fee = Number(getVal(['monthly fee', 'monthlyfee', 'fee', 'amount'])) || 1000;
            const nomineeName = String(getVal(['nominee name', 'nominee', 'nomineename'])).trim();
            const nomineeRelation = String(getVal(['nominee relation', 'relation', 'nomineerelation'])).trim();
            const nomineePhone = String(getVal(['nominee phone', 'nominee contact', 'nomineephone'])).trim();
            const joinDate = String(getVal(['join date', 'joindate', 'date'])).trim() || new Date().toISOString().split('T')[0];
            const status = String(getVal(['status'])).toLowerCase() === 'inactive' ? 'inactive' : 'active';

            return {
              name: name || 'Unnamed Member',
              email: email || `member-${Date.now()}-${Math.floor(Math.random()*1000)}@fdc.org`,
              phone: phone || '+8801700000000',
              monthlyFee: fee,
              nomineeName,
              nomineeRelation,
              nomineePhone,
              joinDate,
              status
            };
          } else if (type === 'collections') {
            const memberName = String(getVal(['member name', 'member', 'name', 'membername'])).trim();
            const amount = Number(getVal(['amount', 'fee', 'collected amount'])) || 1000;
            const month = String(getVal(['month', 'period'])).trim() || new Date().toISOString().substring(0, 7);
            const rawPayType = String(getVal(['payment type', 'paymenttype', 'type', 'method'])).toLowerCase();
            const paymentType = rawPayType.includes('bank') ? 'bank' : 'cash';
            const lateFine = Number(getVal(['late fine', 'latefine', 'fine'])) || 0;
            const collectedBy = String(getVal(['collected by', 'collector', 'collectedby'])).trim() || 'Treasurer';
            const date = String(getVal(['date', 'collection date'])).trim() || new Date().toISOString().split('T')[0];

            return {
              memberName: memberName || 'Member',
              amount,
              month,
              paymentType,
              lateFine,
              collectedBy,
              date
            };
          } else if (type === 'investments') {
            const rawType = String(getVal(['type', 'investment type', 'category'])).trim();
            const validTypes = ['FDR', 'DPS', 'Savings', 'Business', 'Loan', 'Share Market', 'Mutual Fund', 'Others'];
            const invType = validTypes.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'FDR';
            const provider = String(getVal(['provider', 'bank', 'institution', 'company'])).trim() || 'General Provider';
            const principalAmount = Number(getVal(['principal amount', 'principal', 'amount'])) || 50000;
            const interestRate = Number(getVal(['interest rate', 'rate', 'interest'])) || 8.5;
            const startDate = String(getVal(['start date', 'startdate', 'opening date'])).trim() || new Date().toISOString().split('T')[0];
            const maturityDate = String(getVal(['maturity date', 'maturitydate', 'end date'])).trim() || new Date(Date.now() + 31536000000).toISOString().split('T')[0];
            const notes = String(getVal(['notes', 'description', 'remarks'])).trim();

            return {
              type: invType,
              provider,
              principalAmount,
              interestRate,
              startDate,
              maturityDate,
              notes
            };
          }
          return row;
        });

        setParsedData(normalized);
      } catch (err: any) {
        console.error('Error reading Excel file:', err);
        setError(`Failed to read file: ${err.message || 'Unknown format error'}`);
        setParsedData([]);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await onImportSuccess(parsedData);
      setSuccessCount(parsedData.length);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-zinc-400">Import bulk records directly via Excel or CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Download Banner */}
        <div className="flex items-center justify-between p-3.5 bg-zinc-850/60 border border-zinc-800 rounded-2xl mb-5">
          <div>
            <p className="text-xs font-bold text-zinc-200">Need the correct Excel format?</p>
            <p className="text-[11px] text-zinc-400">Download a pre-formatted template with sample columns</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>
        </div>

        {/* Upload Dropzone */}
        {!file && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-750 hover:border-emerald-500/50 bg-zinc-950/40 hover:bg-zinc-900/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all mb-4 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-zinc-850 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 flex items-center justify-center mb-3 transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-zinc-200 mb-1">Click to select an Excel or CSV file</p>
            <p className="text-[10px] text-zinc-500">Supports .xlsx, .xls, and .csv files</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successCount !== null && (
          <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 mb-4 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully imported {successCount} records into the system!</span>
          </div>
        )}

        {/* Parsed Preview Table */}
        {file && parsedData.length > 0 && (
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-zinc-200">{file.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {parsedData.length} records found
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-zinc-400 hover:text-rose-400 transition-colors"
              >
                Choose another file
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/60 text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-semibold sticky top-0">
                    <th className="p-2.5">#</th>
                    {type === 'members' && (
                      <>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Fee</th>
                        <th className="p-2.5">Nominee</th>
                      </>
                    )}
                    {type === 'collections' && (
                      <>
                        <th className="p-2.5">Member</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Month</th>
                        <th className="p-2.5">Type</th>
                      </>
                    )}
                    {type === 'investments' && (
                      <>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Provider</th>
                        <th className="p-2.5">Principal</th>
                        <th className="p-2.5">Rate</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-300">
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/30">
                      <td className="p-2 text-zinc-500">{idx + 1}</td>
                      {type === 'members' && (
                        <>
                          <td className="p-2 font-medium text-white">{row.name}</td>
                          <td className="p-2 text-zinc-400">{row.phone}</td>
                          <td className="p-2 text-emerald-400 font-bold">{row.monthlyFee} TK</td>
                          <td className="p-2 text-zinc-400">{row.nomineeName || '-'}</td>
                        </>
                      )}
                      {type === 'collections' && (
                        <>
                          <td className="p-2 font-medium text-white">{row.memberName}</td>
                          <td className="p-2 text-emerald-400 font-bold">{row.amount} TK</td>
                          <td className="p-2 text-zinc-400">{row.month}</td>
                          <td className="p-2 text-zinc-400 uppercase font-semibold">{row.paymentType}</td>
                        </>
                      )}
                      {type === 'investments' && (
                        <>
                          <td className="p-2 font-medium text-indigo-400">{row.type}</td>
                          <td className="p-2 text-white">{row.provider}</td>
                          <td className="p-2 text-emerald-400 font-bold">{row.principalAmount.toLocaleString()} TK</td>
                          <td className="p-2 text-zinc-400">{row.interestRate}%</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 5 && (
              <p className="text-[10px] text-zinc-500 text-center">
                ...and {parsedData.length - 5} more records will be imported.
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={loading || parsedData.length === 0 || successCount !== null}
            className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:shadow-none"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Importing...' : `Import ${parsedData.length} Records`}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
