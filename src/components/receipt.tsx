'use client';

import React from 'react';
import { Collection } from '../types';
import { Shield } from 'lucide-react';

export default function PrintableReceipt({ collection }: { collection: Collection }) {
  // Format Currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  const grandTotal = collection.amount + collection.lateFine;

  return (
    <div className="bg-white text-zinc-900 p-6 rounded-lg max-w-sm mx-auto shadow-inner text-xs border border-zinc-200">
      
      {/* Receipt Header */}
      <div className="flex flex-col items-center text-center border-b border-zinc-200 pb-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white mb-2 shadow-md">
          <Shield className="w-5 h-5" />
        </div>
        <h2 className="font-extrabold text-sm tracking-tight text-indigo-900 uppercase">FDC Foundation Ltd.</h2>
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Official Payment Receipt</p>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-2 gap-y-2 border-b border-zinc-100 pb-4 mb-4 text-[10px]">
        <div>
          <p className="text-zinc-400 font-medium">Receipt No:</p>
          <p className="font-bold text-zinc-800">{collection.receiptNo}</p>
        </div>
        <div className="text-right">
          <p className="text-zinc-400 font-medium">Payment Date:</p>
          <p className="font-bold text-zinc-800">{collection.date}</p>
        </div>
        <div className="mt-2">
          <p className="text-zinc-400 font-medium">Paid By (Member):</p>
          <p className="font-bold text-zinc-800">{collection.memberName}</p>
          <p className="text-[9px] text-zinc-500">ID: {collection.memberId}</p>
        </div>
        <div className="text-right mt-2">
          <p className="text-zinc-400 font-medium">Subscription Period:</p>
          <p className="font-bold text-indigo-600">{collection.month}</p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="space-y-2 border-b border-zinc-100 pb-4 mb-4">
        <div className="flex justify-between font-bold text-zinc-400 text-[9px] uppercase tracking-wider pb-1 border-b border-zinc-50">
          <span>Item Description</span>
          <span>Total</span>
        </div>
        <div className="flex justify-between text-zinc-700">
          <span>Monthly Base Fee ({collection.month})</span>
          <span className="font-semibold">{formatCurrency(collection.amount)}</span>
        </div>
        <div className="flex justify-between text-zinc-700">
          <span>Late Fine Configuration</span>
          <span className="font-semibold text-rose-600">
            {collection.lateFine > 0 ? `+ ${formatCurrency(collection.lateFine)}` : '0.00 Tk'}
          </span>
        </div>
      </div>

      {/* Grand Total */}
      <div className="flex justify-between items-center text-sm font-black text-zinc-800 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 mb-6">
        <span>Grand Total (BDT):</span>
        <span className="text-indigo-700 font-black">{formatCurrency(grandTotal)}</span>
      </div>

      {/* Payment details / stamps */}
      <div className="grid grid-cols-2 gap-4 items-end text-[10px]">
        <div>
          <p className="text-zinc-400">Payment Channel:</p>
          <span className="inline-block px-2 py-0.5 mt-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase text-[9px] font-black tracking-wider">
            {collection.paymentType}
          </span>
        </div>
        
        {/* Signature stamp */}
        <div className="text-right border-t border-dashed border-zinc-300 pt-2">
          <p className="font-semibold text-zinc-700 italic">{collection.collectedBy || 'Treasurer'}</p>
          <p className="text-[8px] text-zinc-400 uppercase tracking-widest font-medium mt-0.5">Authorised Stamp</p>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="text-center text-[9px] text-zinc-400 border-t border-zinc-100 pt-4 mt-6">
        <p>Thank you for your active foundation contribution!</p>
        <p className="text-[8px] mt-0.5">This is a system generated document. No physical signature required.</p>
      </div>

    </div>
  );
}
