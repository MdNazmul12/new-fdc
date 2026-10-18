'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Member, Collection } from '../types';
import { X, Download, Printer, ShieldCheck, Phone, Calendar, UserCheck, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

interface MemberCardProps {
  member: Member;
  collections?: Collection[];
  onClose: () => void;
}

export default function MemberCard({ member, collections = [], onClose }: MemberCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate QR code with member verification data
    const qrData = JSON.stringify({
      org: 'Friends Development Committee',
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      joinDate: member.joinDate,
      status: member.status,
    });

    QRCode.toDataURL(qrData, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [member]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
      });
      const link = document.createElement('a');
      link.download = `${member.name.replace(/\s+/g, '_')}_FDC_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Header Controls */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--border)] mb-5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg text-[var(--foreground)]">Digital Member ID Card</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRINTABLE CARD CONTAINER */}
        <div
          ref={cardRef}
          id="member-card-print"
          className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-indigo-500/30 text-white relative select-none"
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)',
          }}
        >
          {/* Subtle Decorative Elements */}
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>

          {/* Card Top / Header Bar */}
          <div className="px-5 py-4 border-b border-indigo-400/20 flex items-center justify-between relative z-10 bg-black/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm tracking-tight text-white leading-tight">
                  Friends Development Committee
                </h4>
                <p className="text-[10px] text-indigo-300 font-medium tracking-wider uppercase">
                  Official Membership Card
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                member.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {member.status}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-5 flex items-start space-x-4 relative z-10">
            {/* Member Photo */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-20 h-24 rounded-xl border-2 border-indigo-400/50 overflow-hidden shadow-lg bg-indigo-950/60 flex items-center justify-center">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-900/60 text-indigo-200">
                    <UserCheck className="w-8 h-8 opacity-70 mb-1" />
                    <span className="text-[11px] font-bold uppercase">{member.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-indigo-300/80 mt-1.5 font-bold">
                {member.id.toUpperCase()}
              </span>
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-lg text-white truncate leading-tight tracking-tight">
                {member.name}
              </h3>
              <p className="text-[11px] text-indigo-300 font-medium mb-3 truncate">
                {member.email || 'member@fdc.org'}
              </p>

              <div className="space-y-1.5 text-xs text-zinc-300">
                <div className="flex items-center space-x-2 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-mono">{member.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Joined: {member.joinDate || '2025'}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Monthly Fee: ৳{member.monthlyFee?.toLocaleString() || 1000}</span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="p-1 bg-white rounded-lg shadow-md">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Member QR" className="w-16 h-16 object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-zinc-200 animate-pulse rounded" />
                )}
              </div>
              <span className="text-[8px] text-zinc-400 uppercase tracking-widest mt-1 font-mono">
                Scan Verify
              </span>
            </div>
          </div>

          {/* Card Footer / Holographic Strip & Nominee */}
          <div className="px-5 py-2.5 bg-black/40 border-t border-indigo-400/15 flex items-center justify-between text-[10px] text-zinc-400 relative z-10">
            <div>
              <span className="text-zinc-500">Nominee:</span>{' '}
              <span className="text-zinc-300 font-medium">{member.nomineeName || 'N/A'}</span>{' '}
              {member.nomineeRelation && <span className="text-zinc-500">({member.nomineeRelation})</span>}
            </div>
            <div className="flex items-center space-x-1 text-indigo-300 font-mono text-[9px]">
              <span>SECURED BY FDC</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mt-6 w-full max-w-md">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Card (PNG)</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-[var(--foreground)] bg-[var(--secondary)] hover:bg-[var(--border)] border border-[var(--border)] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
