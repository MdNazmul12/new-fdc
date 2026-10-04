'use client';

import React from 'react';
import { Collection } from '../types';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

// Number to Words converter for Bangladeshi Taka
function numberToWordsBDT(amount: number): string {
  if (amount <= 0) return 'Zero Taka Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  let lakh = Math.floor(amount / 100000);
  amount %= 100000;
  let thousand = Math.floor(amount / 1000);
  let remainder = amount % 1000;

  let result = '';
  if (crore > 0) result += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertBelowThousand(remainder) + ' ';

  return result.trim() + ' Taka Only';
}

export default function PrintableReceipt({ collection }: { collection: Collection }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  const grandTotal = (collection.amount || 0) + (collection.lateFine || 0);
  const inWords = numberToWordsBDT(grandTotal);

  return (
    <div className="bg-white text-zinc-900 p-6 sm:p-8 rounded-2xl max-w-xl mx-auto shadow-2xl border-4 border-double border-indigo-900/30 text-xs relative overflow-hidden font-sans print:shadow-none print:border-2 print:border-black print:p-6 print:max-w-none print:w-full">
      
      {/* Background Watermark FDC Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none z-0">
        <img src="/logo.jpg" alt="Watermark" className="w-80 h-80 object-contain grayscale" />
      </div>

      {/* Relative container to keep content above watermark */}
      <div className="relative z-10 space-y-4">

        {/* ---------------- PAD HEADER (প্যাড হেডার) ---------------- */}
        <div className="border-b-2 border-indigo-950 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          
          {/* Logo on Left */}
          <div className="flex items-center space-x-3.5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-indigo-900/20 p-1 flex items-center justify-center shadow-md shrink-0">
              <img src="/logo.jpg" alt="FDC Official Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl tracking-tight text-indigo-950 leading-tight uppercase">
                Friends Development Committee
              </h1>
              <h2 className="font-bold text-xs sm:text-sm text-emerald-800">
                ফ্রেন্ডস ডেভেলপমেন্ট কমিটি (এফডিসি)
              </h2>
              <p className="text-[10px] text-zinc-600 font-medium tracking-wide mt-0.5">
                Govt. Regd. Non-Profit Social Welfare & Member Cooperative Society
              </p>
              <p className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">
                একতা • উন্নয়ন • সমৃদ্ধি | Unity • Development • Prosperity
              </p>
            </div>
          </div>

          {/* Quick contact / Helpline on Right */}
          <div className="text-[9px] text-zinc-600 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-zinc-200 pt-2 sm:pt-0 sm:pl-3 space-y-0.5 shrink-0">
            <p className="font-semibold text-zinc-800">Central Bhaban, Dhaka</p>
            <p>Hotline: +880 1700-000001</p>
            <p>Email: info@fdc.org</p>
            <p className="font-mono text-indigo-700 font-bold">www.fdc.org</p>
          </div>
        </div>

        {/* ---------------- PAD TITLE BANNER ---------------- */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white px-4 py-2 rounded-xl shadow-sm">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-black text-xs sm:text-sm tracking-wider uppercase">
              Official Money Receipt / মানি রিসিট
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
            Customer Copy
          </span>
        </div>

        {/* ---------------- RECEIPT & DATE META ---------------- */}
        <div className="flex flex-wrap items-center justify-between text-[11px] bg-zinc-50 border border-zinc-200 px-3.5 py-2 rounded-xl">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500 font-semibold">Receipt No (রসিদ নং):</span>
            <span className="font-mono font-black text-indigo-900 text-xs">
              {collection.receiptNo || `REC-${collection.id}`}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-500 font-semibold">Issue Date (তারিখ):</span>
            <span className="font-bold text-zinc-800">{collection.date}</span>
          </div>
        </div>

        {/* ---------------- MEMBER INFORMATION ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] p-3.5 rounded-xl border border-zinc-200 bg-white">
          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Received With Thanks From (সদস্যের নাম):</span>
            <p className="font-black text-sm text-zinc-900 border-b border-dotted border-zinc-400 pb-1">
              {collection.memberName}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Member ID (সদস্য কোড):</span>
            <p className="font-mono font-bold text-sm text-indigo-950 border-b border-dotted border-zinc-400 pb-1">
              {collection.memberId}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Subscription Period (জমার মাস / অর্থবছর):</span>
            <p className="font-bold text-indigo-700 text-xs border-b border-dotted border-zinc-400 pb-1">
              {collection.month}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Payment Mode & TrxID (পরিশোধের মাধ্যম):</span>
            <p className="font-bold text-zinc-800 text-xs border-b border-dotted border-zinc-400 pb-1 flex items-center space-x-2">
              <span className="capitalize px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                {collection.paymentType.toUpperCase()}
              </span>
              {collection.transactionRef && (
                <span className="font-mono text-zinc-600 text-[10px]">
                  Ref: {collection.transactionRef}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ---------------- ITEM BREAKDOWN TABLE ---------------- */}
        <div className="overflow-hidden border border-zinc-200 rounded-xl">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-indigo-950 text-white text-[10px] uppercase tracking-wider">
                <th className="p-2.5 text-center w-10">Sl</th>
                <th className="p-2.5">Description / জমার বিবরণ</th>
                <th className="p-2.5 text-center">Month</th>
                <th className="p-2.5 text-right">Fee (TK)</th>
                <th className="p-2.5 text-right">Fine (TK)</th>
                <th className="p-2.5 text-right font-black">Total (TK)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800 bg-white">
              <tr>
                <td className="p-2.5 text-center font-bold text-zinc-500">01</td>
                <td className="p-2.5 font-bold text-zinc-900">
                  Monthly Subscription Contribution Fee
                  <span className="block text-[9px] text-zinc-500 font-normal">মাসিক নির্ধারিত সদস্য সঞ্চয় ও চাঁদা</span>
                </td>
                <td className="p-2.5 text-center font-mono font-semibold text-indigo-700">{collection.month}</td>
                <td className="p-2.5 text-right font-semibold">{collection.amount.toLocaleString()}</td>
                <td className="p-2.5 text-right font-semibold text-rose-600">
                  {(collection.lateFine || 0) > 0 ? `+${collection.lateFine}` : '0'}
                </td>
                <td className="p-2.5 text-right font-black text-indigo-950 text-xs">
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-zinc-100/90 font-black text-xs text-zinc-900 border-t-2 border-indigo-900">
                <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider text-indigo-950">
                  Total Amount Received (মোট আদায়কৃত টাকা):
                </td>
                <td className="p-2.5 text-right text-emerald-700 text-sm font-black">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ---------------- IN WORDS (কথায়) ---------------- */}
        <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-zinc-500 text-[10px] uppercase">In Words (কথায়): </span>
            <span className="font-bold text-indigo-950 italic">{inWords}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-black text-[10px] uppercase tracking-wider">Payment Verified</span>
          </div>
        </div>

        {/* ---------------- OFFICIAL SIGNATURES (স্বাক্ষর) ---------------- */}
        <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[10px] text-zinc-700 items-end">
          
          {/* Member signature */}
          <div className="space-y-1">
            <div className="border-b border-dashed border-zinc-400 w-4/5 mx-auto h-8"></div>
            <p className="font-semibold text-zinc-800">Member Signature</p>
            <p className="text-[8px] text-zinc-400">জমাকারীর স্বাক্ষর</p>
          </div>

          {/* Collector / Cashier */}
          <div className="space-y-1">
            <div className="border-b border-dashed border-zinc-400 w-4/5 mx-auto h-8 flex items-center justify-center">
              <span className="text-[10px] font-bold text-indigo-800 italic">
                {collection.collectedBy || 'Treasurer / Collector'}
              </span>
            </div>
            <p className="font-semibold text-zinc-800">Collected By</p>
            <p className="text-[8px] text-zinc-400">আদায়কারীর স্বাক্ষর</p>
          </div>

          {/* Authorized Officer */}
          <div className="space-y-1">
            <div className="border-b border-dashed border-zinc-400 w-4/5 mx-auto h-8 flex items-center justify-center">
              <div className="border border-emerald-600 text-emerald-800 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest rotate-[-3deg]">
                APPROVED & SEALED
              </div>
            </div>
            <p className="font-semibold text-zinc-800">Authorized Signature</p>
            <p className="text-[8px] text-zinc-400">কোষাধ্যক্ষ / সভাপতি</p>
          </div>

        </div>

        {/* ---------------- FOOTER NOTE ---------------- */}
        <div className="border-t border-zinc-200 pt-2 text-center text-[9px] text-zinc-400 space-y-0.5">
          <p className="font-medium text-zinc-500">
            এফডিসি ফাউন্ডেশন তহবিলে আপনার অবদানের জন্য আন্তরিক ধন্যবাদ।
          </p>
          <p className="text-[8px]">
            * This is an official computer-generated money receipt voucher issued by Friends Development Committee.
          </p>
        </div>

      </div>

    </div>
  );
}
