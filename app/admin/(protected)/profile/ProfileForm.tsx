"use client";

import { useTransition } from "react";
import { Profile } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";

type Props = {
  profile?: Profile | null;
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
      {children}
      {required ? (
        <span className="text-forest-200 text-xs">*</span>
      ) : (
        <span className="text-slate-600 text-[10px] font-normal">(opsional)</span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30";

export default function ProfileForm({ profile, onSave }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await onSave(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profil diperbarui", {
          description: "Data diri dan CV Anda berhasil disimpan.",
        });
      }
    });
  };

  return (
    <form action={handleAction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label required>Nama Lengkap</Label>
          <input
            name="name"
            defaultValue={profile?.name ?? "Arif Jagad"}
            required
            className={inputClass}
          />
        </div>
        <div>
          <Label required>Role Pekerjaan</Label>
          <input
            name="role"
            defaultValue={profile?.role ?? "Fullstack Developer"}
            required
            className={inputClass}
          />
        </div>
        <div>
          <Label required>Lokasi / Domisili</Label>
          <input
            name="location"
            defaultValue={profile?.location ?? "berbasis di Medan"}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <Label required>Slogan / Fokus Portofolio (Hero text)</Label>
        <textarea
          name="short_bio"
          rows={3}
          defaultValue={profile?.short_bio ?? "Saya merancang dan membangun... (silakan ubah di admin)"}
          required
          className={inputClass}
        />
      </div>

      <div>
        <Label>Cerita Singkat "Tentang Saya" (About Me)</Label>
        <textarea
          name="about_text"
          rows={6}
          defaultValue={profile?.about_text ?? ""}
          className={inputClass}
          placeholder="Ceritakan perjalanan karir, keahlian utama, dan apa yang membuat Anda spesial..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-navy-800">
        <div>
          <Label>Upload Pas Foto / Profil</Label>
          <input
            name="photo_file"
            type="file"
            accept="image/*"
            className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:bg-forest-700/20 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-forest-200 file:border-0 hover:file:bg-forest-700/30"
          />
          {profile?.photo_url && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">Foto Saat Ini:</p>
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-navy-800">
                <Image src={profile.photo_url} alt="Profile" fill priority className="object-cover" />
              </div>
            </div>
          )}
          <input type="hidden" name="existing_photo_url" value={profile?.photo_url ?? ""} />
        </div>

        <div>
          <Label>Upload File CV / Resume (PDF)</Label>
          <input
            name="cv_file"
            type="file"
            accept="application/pdf"
            className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:bg-forest-700/20 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-forest-200 file:border-0 hover:file:bg-forest-700/30"
          />
          {profile?.cv_url && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">CV Saat Ini:</p>
              <div className="flex items-center gap-2">
                <a href={profile.cv_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-forest-200 hover:underline">
                  Lihat File CV Aktif &#x2197;
                </a>
              </div>
            </div>
          )}
          <input type="hidden" name="existing_cv_url" value={profile?.cv_url ?? ""} />
        </div>
      </div>

      <div className="pt-4 border-t border-navy-800">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Menyimpan data..." : "Simpan Profil & CV"}
        </button>
      </div>
    </form>
  );
}
