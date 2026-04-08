"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { id as idLocale } from "date-fns/locale";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
};

function parseValueToDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIdDate(value: string): string {
  if (!value) return "Pilih tanggal";
  const date = parseValueToDate(value);
  if (!date) return "Pilih tanggal";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function BlogDatePicker({ label, name, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseValueToDate(value), [value]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      const target = event.target as Node;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("mousedown", onPointerDown);
    }

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <label className="mb-2 block text-xs font-medium text-slate-400">{label}</label>

      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 transition-colors hover:border-forest-700 focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30"
      >
        <span>{formatIdDate(value)}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-[320px] rounded-xl border border-navy-700 bg-navy-950 p-3 shadow-[0_20px_45px_-20px_rgba(0,0,0,0.6)]">
          <DayPicker
            mode="single"
            locale={idLocale}
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              onChange(toYmd(date));
              setOpen(false);
            }}
            showOutsideDays
            weekStartsOn={1}
            formatters={{
              formatWeekdayName: (date) =>
                date.toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 3),
            }}
            classNames={{
              months: "flex flex-col",
              month: "space-y-3",
              caption: "flex items-center justify-between px-1",
              caption_label: "text-sm font-semibold text-slate-100",
              nav: "flex items-center gap-1",
              nav_button: "h-7 w-7 rounded-md border border-navy-700 text-slate-300 hover:border-forest-700 hover:text-forest-200",
              table: "w-full border-collapse",
              head_row: "",
              head_cell: "h-8 text-center text-xs text-slate-500 font-medium",
              row: "",
              cell: "h-10 w-10 p-0 text-center",
              day: "h-9 w-9 rounded-md text-sm text-slate-200 hover:bg-navy-800",
              day_selected: "bg-forest-700 text-white hover:bg-forest-600",
              day_today: "border border-forest-700/60",
              day_outside: "text-slate-600",
              day_disabled: "text-slate-700",
            }}
          />

          <div className="mt-3 flex items-center justify-between border-t border-navy-800 pt-3">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs text-slate-400 hover:text-red-300"
            >
              Hapus
            </button>

            <button
              type="button"
              onClick={() => {
                onChange(toYmd(new Date()));
                setOpen(false);
              }}
              className="text-xs text-forest-300 hover:text-forest-200"
            >
              Hari ini
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
