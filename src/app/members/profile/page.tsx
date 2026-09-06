'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../../components/dashboard-layout';
import { useStore } from '../../../contexts/store-context';
import { useAuth } from '../../../contexts/auth-context';
import { Collection, Member } from '../../../types';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Heart,
  Phone,
  Mail, 
  X,
  Camera,
  Loader2
} from 'lucide-react';
import PrintableReceipt from '../../../components/receipt';

export default function MemberProfilePage() {
  const { user } = useAuth();
  const { members, collections, updateMemberPhoto } = useStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  
  // Find matching member profile based on user details
  const memberProfile = members.find(m => m.email.toLowerCase() === user?.email.toLowerCase()) || members[0] || {
    id: user?.id || 'm-temp',
    name: user?.name || 'Member',
    email: user?.email || '',
    phone: user?.phone || '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as const,
    monthlyFee: 1000,
    nomineeName: '',
    nomineeRelation: '',
    nomineePhone: '',
    photoUrl: user?.avatar
  };
  
  // States for print dialog
  const [selectedReceipt, setSelectedReceipt] = useState<Collection | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Update photo in MongoDB and state
        updateMemberPhoto(memberProfile.id, dataUrl);

        // Also update local storage session if currently logged-in user
        if (typeof window !== 'undefined' && user) {
          const updatedUser = { ...user, avatar: dataUrl };
          localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
        }

        setPhotoLoading(false);
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!memberProfile) {
    return (
      <DashboardLayout>
        <div className="p-4 bg-rose-500/10 text-rose-400 rounded-lg text-xs">
          Member profile record not found. Please log in or switch roles.
        </div>
      </DashboardLayout>
    );
  }

  // Filter collections recorded for this specific member
  const myPayments = collections.filter(c => c.memberId === memberProfile.id);
  
  // Calculate total paid vs due months (May, June, July 2026)
  const targetMonths = ['2026-05', '2026-06', '2026-07'];
  const duesList = targetMonths.filter(mon => 
    !collections.some(c => c.memberId === memberProfile.id && c.month === mon && c.status === 'paid')
  );

  const totalPaid = myPayments.reduce((sum, p) => sum + p.amount + p.lateFine, 0);

  const handlePrintReceipt = (receipt: Collection) => {
    setSelectedReceipt(receipt);
    setPrintOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Profile Card & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Personal profile */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-xl rounded-full"></div>
            
            {/* Avatar circle with photo upload overlay */}
            <div className="relative group mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500/30 bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-3xl uppercase shadow-xl relative">
                {memberProfile.photoUrl ? (
                  <img
                    src={memberProfile.photoUrl}
                    alt={memberProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  memberProfile.name.charAt(0)
                )}

                {photoLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload trigger badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-zinc-900 transition-transform hover:scale-110 cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {photoSuccess && (
              <span className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center space-x-1 animate-in fade-in">
                <CheckCircle2 className="w-3 h-3" />
                <span>Profile photo updated!</span>
              </span>
            )}

            <h3 className="text-lg font-black text-white">{memberProfile.name}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Joined on {memberProfile.joinDate}</p>

            <div className="w-full border-t border-zinc-800 my-4 pt-4 space-y-3 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Monthly Fee:</span>
                <span className="font-bold text-zinc-200">{memberProfile.monthlyFee.toLocaleString()} TK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {memberProfile.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Contact:</span>
                <span className="text-zinc-300 font-semibold">{memberProfile.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Email:</span>
                <span className="text-zinc-300 font-semibold truncate max-w-[150px]">{memberProfile.email}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Nominee & Emergency info */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-zinc-200">Registered Nominee Details</h3>
              </div>
              
              <div className="space-y-4 my-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Nominee Name</span>
                  <p className="font-bold text-zinc-200">{memberProfile.nomineeName || 'Not Set'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Relation</span>
                    <p className="font-bold text-zinc-200">{memberProfile.nomineeRelation || 'Not Set'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Nominee Contact</span>
                    <p className="font-bold text-zinc-200">{memberProfile.nomineePhone || 'Not Set'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 pt-3 border-t border-zinc-850">
              * To edit nominee credentials, contact any Super Admin or President.
            </div>
          </div>

          {/* Card 3: Due tracker */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-200 mb-3">Outstanding Dues Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Total Contribution</p>
                    <p className="text-base font-extrabold text-white mt-0.5">{totalPaid.toLocaleString()} TK</p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
                </div>

                <div className="flex justify-between items-center p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-zinc-500">Outstanding Due Months</p>
                    <p className="text-base font-extrabold text-amber-500 mt-0.5">{(duesList.length * memberProfile.monthlyFee).toLocaleString()} TK</p>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 mt-4 pt-3 border-t border-zinc-850">
              {duesList.length > 0 ? (
                <span className="text-amber-500 font-semibold">Dues pending for: {duesList.join(', ')}</span>
              ) : (
                <span className="text-emerald-400 font-semibold">All subscription payments are up to date!</span>
              )}
            </div>
          </div>

        </div>

        {/* Payment History List */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-zinc-200">Subscription & Contribution Ledger</h3>
            <p className="text-[10px] text-zinc-500">Receipts directory logged under your profile</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2 font-semibold">Date Paid</th>
                  <th className="pb-2 font-semibold">Receipt No.</th>
                  <th className="pb-2 font-semibold">Target Month</th>
                  <th className="pb-2 font-semibold">Base Amount</th>
                  <th className="pb-2 font-semibold">Late Fine</th>
                  <th className="pb-2 font-semibold">Payment Via</th>
                  <th className="pb-2 font-semibold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {myPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-zinc-500">No payment logs recorded yet.</td>
                  </tr>
                ) : (
                  myPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3 text-zinc-400">{p.date}</td>
                      <td className="py-3 text-zinc-200 font-medium">{p.receiptNo}</td>
                      <td className="py-3 text-indigo-400 font-semibold">{p.month}</td>
                      <td className="py-3 text-zinc-300 font-bold">{p.amount.toLocaleString()} TK</td>
                      <td className="py-3 text-zinc-400">
                        {p.lateFine > 0 ? (
                          <span className="text-rose-400 font-semibold">+{p.lateFine} TK</span>
                        ) : (
                          <span>0 TK</span>
                        )}
                      </td>
                      <td className="py-3 capitalize text-zinc-400">{p.paymentType}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handlePrintReceipt(p)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-400 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt Duplicate</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------- MODAL: PRINT RECEIPT ---------------- */}
        {printOpen && selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 relative animate-fade-in-up no-print">
              <button 
                onClick={() => setPrintOpen(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-zinc-200">Print Receipt</h3>
                <p className="text-[9px] text-zinc-500">Send copy to administrative printer</p>
              </div>

              {/* Printable Wrapper */}
              <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                <PrintableReceipt collection={selectedReceipt} />
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setPrintOpen(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
            
            {/* Real Print Only view in DOM */}
            <div className="print-only fixed inset-0 bg-white text-black p-8 z-50">
              <PrintableReceipt collection={selectedReceipt} />
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
