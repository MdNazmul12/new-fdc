'use client';

import React, { useState } from 'react';
import { Megaphone, X, Send, AlertTriangle, Info, Bell, CheckCircle2, Loader2, Users } from 'lucide-react';
import { useStore } from '../contexts/store-context';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const { broadcastAnnouncement } = useStore();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'alert'>('info');
  const [target, setTarget] = useState<'all' | 'due_members' | 'admins'>('all');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('অনুগ্রহ করে নোটিশের শিরোনাম ও বার্তা লিখুন।');
      return;
    }

    setLoading(true);
    try {
      const ok = await broadcastAnnouncement(title.trim(), message.trim(), type, target);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setTitle('');
          setMessage('');
          onClose();
        }, 1500);
      } else {
        alert('ঘোষণা পাঠানো সম্ভব হয়নি। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">নতুন সাধারণ ঘোষণা / নোটিশ পাঠান</h3>
              <p className="text-[11px] text-zinc-400">সকল সদস্যের ফোনে পুশ নোটিফিকেশন ও অ্যাপে বার্তা যাবে</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">নোটিশ সফলভাবে পাঠানো হয়েছে!</h4>
            <p className="text-xs text-zinc-400">সকল সংশ্লিষ্ট সদস্যের ফোন ও ইন-অ্যাপে নোটিফিকেশন পাঠানো হয়েছে।</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">প্রাপক (Target Audience)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'সকল সদস্য', desc: 'সবাই পাবে' },
                  { id: 'due_members', label: 'বকেয়া সদস্য', desc: 'চাঁদা বাকিদের' },
                  { id: 'admins', label: 'কমিটি সদস্য', desc: 'অ্যাডমিনগণ' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTarget(t.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      target === t.id
                        ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <p className="text-xs font-bold">{t.label}</p>
                    <p className="text-[10px] opacity-75">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Type / Priority */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">নোটিশের ধরন (Priority)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'info', label: 'তথ্যমূলক (Info)', icon: Info, color: 'text-sky-400' },
                  { id: 'warning', label: 'সতর্কতা (Warning)', icon: AlertTriangle, color: 'text-amber-400' },
                  { id: 'alert', label: 'জরুরি (Urgent)', icon: Bell, color: 'text-rose-400' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as any)}
                      className={`p-2 rounded-xl border flex items-center space-x-1.5 transition-all ${
                        type === item.id
                          ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                      <span className="text-[11px] font-semibold truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                শিরোনাম (Title) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: জরুরি সাধারণ সভা / পিকনিকের চাঁদা গ্রহণ সংক্রান্ত"
                className="w-full px-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                বিস্তারিত বার্তা (Message) <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="সভার স্থান, সময়, বিস্তারিত বিবরণ বা সদস্যদের জন্য যেকোনো নির্দেশনা লিখুন..."
                className="w-full px-3.5 py-2.5 bg-zinc-800/60 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>নোটিশ পাঠান</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}