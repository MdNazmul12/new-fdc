'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen || !mounted) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-3xl p-6 shadow-2xl shadow-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Badge Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${
            isDanger 
              ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 shadow-lg shadow-rose-500/10' 
              : isWarning
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-500/10'
              : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
          }`}>
            {isDanger ? (
              <Trash2 className="w-6 h-6 animate-pulse" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-white mb-2 tracking-tight">
            {title}
          </h3>

          {/* Message */}
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl border border-zinc-700/60 transition-all disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 px-4 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-lg disabled:opacity-50 cursor-pointer ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  : isWarning
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
