"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Hapus",
  onConfirm,
  onCancel,
  isPending,
}: Props) {
  // Tutup modal dengan ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-xl border border-navy-700 bg-navy-900 p-6 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150">
        {/* Icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-950 border border-red-900">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2 className="mb-1 text-base font-semibold text-slate-200">{title}</h2>
        <p className="mb-6 text-sm text-slate-500 leading-relaxed">{description}</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="cursor-pointer flex-1 rounded-lg border border-navy-700 px-4 py-2 text-sm text-slate-400 hover:border-navy-600 hover:text-slate-200 disabled:opacity-50 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="cursor-pointer flex-1 rounded-lg bg-red-900 border border-red-800 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
