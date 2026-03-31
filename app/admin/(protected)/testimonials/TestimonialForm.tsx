"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Testimonial } from "@/lib/supabase";

type Props = {
  testimonial?: Testimonial;
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
};

function Label({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
      {children}
      {required ? (
        <span className="text-forest-200 text-xs">*</span>
      ) : (
        <span className="text-slate-600 text-[10px] font-normal">(opsional)</span>
      )}
    </label>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-700/20 text-forest-200 text-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30";

const textareaClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30 resize-none";

export default function TestimonialForm({ testimonial, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(testimonial?.is_visible ?? true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await onSave(fd);
      if (result?.error) {
        const { toast } = await import("sonner");
        toast.error(result.error);
      } else {
        const { toast } = await import("sonner");
        toast.success(testimonial ? "Testimoni berhasil diperbarui" : "Testimoni berhasil ditambahkan", {
          description: testimonial ? "Perubahan telah disimpan." : "Testimoni baru telah ditambahkan.",
        });
        router.push("/admin/testimonials");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Bagian 1: Identitas Klien ───────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="👤"
          title="Identitas Klien"
          subtitle="Nama dan posisi/jabatan klien yang memberikan testimoni."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" required>Nama Klien</Label>
            <input
              id="name"
              name="name"
              defaultValue={testimonial?.name}
              required
              placeholder="Contoh: Budi Santoso"
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="role" required>Role / Jabatan</Label>
            <input
              id="role"
              name="role"
              defaultValue={testimonial?.role}
              required
              placeholder="Contoh: Owner, Zazi Coffee"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-slate-600">Format: Jabatan, Nama Bisnis</p>
          </div>
        </div>
      </div>

      {/* ── Bagian 2: Isi Testimoni ─────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="💬"
          title="Isi Testimoni"
          subtitle="Tuliskan ulasan atau review langsung dari klien."
        />

        <div>
          <Label htmlFor="content" required>Pesan Testimoni</Label>
          <textarea
            id="content"
            name="content"
            defaultValue={testimonial?.content}
            required
            rows={5}
            placeholder="Contoh: &quot;Hasilnya melampaui ekspektasi kami. Website-nya cepat, modern, dan klien kami sangat puas...&quot;"
            className={textareaClass}
          />
          <p className="mt-1 text-[11px] text-slate-600">Tulis apa adanya, tanpa tanda kutip. Tanda kutip akan ditambahkan otomatis saat ditampilkan.</p>
        </div>
      </div>

      {/* ── Bagian 3: Foto & Pengaturan ─────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="🖼️"
          title="Foto & Pengaturan"
        />

        <div className="space-y-5">
          <div>
            <Label htmlFor="avatar_url">Upload Foto Profil</Label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-forest-700/20 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-forest-200 hover:file:bg-forest-700/30 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30"
            />
            {testimonial?.avatar_url && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Foto Saat Ini</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={testimonial.avatar_url} alt="Avatar Preview" className="h-16 w-16 rounded-full border border-navy-800 bg-navy-950 object-cover" />
              </div>
            )}
            <input type="hidden" name="existing_avatar_url" value={testimonial?.avatar_url ?? ""} />
            <p className="mt-1 text-[11px] text-slate-600">Foto akan muncul sebagai avatar di kartu testimoni. Kosongkan jika ingin generate inisial otomatis.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Toggle Tampilkan */}
            <div className="flex items-center gap-4 rounded-lg border border-navy-800 bg-navy-950 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-3 w-full">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="is_visible"
                    id="is_visible"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full border border-navy-700 bg-navy-900 peer-checked:border-forest-700 peer-checked:bg-forest-700/30 transition-all" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-600 peer-checked:translate-x-4 peer-checked:bg-forest-200 transition-all" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">Tampilkan di Homepage</p>
                  <p className="text-xs text-slate-500">
                    {isVisible ? "Aktif — terlihat di portfolio" : "Tersembunyi"}
                  </p>
                </div>
              </label>
            </div>

            {/* Urutan */}
            <div>
              <Label htmlFor="sort_order" required>Urutan Tampil</Label>
              <input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={testimonial?.sort_order ?? 0}
                min={0}
                className="w-28 rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-forest-700 focus:outline-none text-center"
              />
              <p className="mt-1 text-[11px] text-slate-600">Angka kecil tampil lebih dulu</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Aksi ─────────────────────────── */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Menyimpan..." : testimonial ? "Simpan Perubahan" : "Tambah Testimoni"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/testimonials")}
          className="cursor-pointer rounded-lg border border-navy-800 px-6 py-2.5 text-sm text-slate-400 hover:border-navy-700 hover:text-slate-200 transition-all"
        >
          Batal
        </button>
        <p className="ml-auto text-xs text-slate-600">
          <span className="text-forest-200">*</span> Wajib diisi
        </p>
      </div>
    </form>
  );
}
