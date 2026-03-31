"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TechStack } from "@/lib/supabase";

type Props = {
  skill?: TechStack;
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

export default function TechStackForm({ skill, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(skill?.is_visible ?? true);

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
        toast.success(skill ? "Tech Stack diperbarui" : "Tech Stack ditambahkan", {
          description: skill ? "Perubahan telah disimpan." : "Tech Stack baru berhasil masuk list.",
        });
        router.push("/admin/skills");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="⚡"
          title="Data Tech Stack"
          subtitle="Nama teknologi dan logonya."
        />

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" required>Nama Teknologi</Label>
            <input
              id="name"
              name="name"
              defaultValue={skill?.name}
              required
              placeholder="Contoh: React.js"
              className={inputClass}
            />
          </div>

          <div>
            <Label htmlFor="image_url">Upload Icon/Logo (SVG/PNG)</Label>
            <input
              id="image_url"
              name="image_url"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-forest-700/20 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-forest-200 hover:file:bg-forest-700/30 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30"
            />
            {skill?.image_url && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Logo Saat Ini</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={skill.image_url} alt="Logo" className="h-16 w-16 rounded-xl border border-navy-800 bg-navy-950 object-cover p-2" />
              </div>
            )}
            <input type="hidden" name="existing_image_url" value={skill?.image_url ?? ""} />
            <p className="mt-1 text-[11px] text-slate-600">Disarankan menggunakan format SVG atau PNG *transparent* untuk logo.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="⚙️"
          title="Pengaturan"
        />

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
                  {isVisible ? "Aktif" : "Sembunyikan sementara"}
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
              defaultValue={skill?.sort_order ?? 0}
              min={0}
              className="w-28 rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-forest-700 focus:outline-none text-center"
            />
          </div>
        </div>
      </div>

      {/* ── Aksi */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Menyimpan..." : skill ? "Simpan Perubahan" : "Tambah Tech Stack"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/skills")}
          className="cursor-pointer rounded-lg border border-navy-800 px-6 py-2.5 text-sm text-slate-400 hover:border-navy-700 hover:text-slate-200 transition-all"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
