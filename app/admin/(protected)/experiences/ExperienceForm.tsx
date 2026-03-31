"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import { Experience } from "@/lib/supabase";

const employmentOptions = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Kontrak" },
  { value: "Freelance", label: "Freelance" },
  { value: "Internship", label: "Magang" },
];

type Props = {
  experience?: Experience;
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

export default function ExperienceForm({ experience, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCurrent, setIsCurrent] = useState(experience?.is_current ?? false);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(experience?.skills ?? []);

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("skills");
    fd.append("skills", JSON.stringify(skills));

    startTransition(async () => {
      const result = await onSave(fd);
      if (result?.error) {
        const { toast } = await import("sonner");
        toast.error(result.error);
      } else {
        const { toast } = await import("sonner");
        toast.success(experience ? "Pengalaman berhasil diperbarui" : "Pengalaman berhasil ditambahkan", {
          description: experience ? "Perubahan telah disimpan." : "Riwayat kerja baru telah ditambahkan.",
        });
        router.push("/admin/experiences");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Bagian 1: Informasi Pekerjaan ──────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="🏢"
          title="Informasi Pekerjaan"
          subtitle="Nama perusahaan dan posisi yang kamu pegang."
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="company" required>Perusahaan</Label>
              <input
                id="company"
                name="company"
                defaultValue={experience?.company}
                required
                placeholder="Contoh: PT. Teknologi Maju"
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="position" required>Posisi / Role</Label>
              <input
                id="position"
                name="position"
                defaultValue={experience?.position}
                required
                placeholder="Contoh: Fullstack Developer"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="employment_type" required>Status Pekerjaan</Label>
            <Select
              id="employment_type"
              name="employment_type"
              options={employmentOptions}
              defaultValue={employmentOptions.find(o => o.value === (experience?.employment_type ?? "Full-time"))}
              unstyled
              classNames={{
                control: ({ isFocused }) =>
                  `w-full rounded-lg border bg-navy-950 px-1 py-0.5 text-sm text-slate-200 transition-colors ${
                    isFocused ? "border-forest-700 ring-1 ring-forest-700/30" : "border-navy-800"
                  }`,
                menu: () => "mt-1 rounded-lg border border-navy-800 bg-navy-950 text-sm shadow-xl z-50 overflow-hidden",
                option: ({ isFocused, isSelected }) =>
                  `px-3.5 py-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-forest-700 text-white"
                      : isFocused
                      ? "bg-forest-700/20 text-forest-200"
                      : "text-slate-300 hover:bg-forest-700/10"
                  }`,
                singleValue: () => "text-slate-200",
                indicatorSeparator: () => "hidden",
                dropdownIndicator: () => "text-slate-400 hover:text-slate-200 px-2",
                valueContainer: () => "px-2",
                input: () => "text-slate-200",
                placeholder: () => "text-slate-600",
              }}
            />
          </div>


          <div>
            <Label htmlFor="description">Deskripsi Pekerjaan</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={experience?.description ?? ""}
              rows={4}
              placeholder="Ceritakan secara singkat apa yang kamu kerjakan, tanggung jawab, atau pencapaian..."
              className={textareaClass}
            />
          </div>
        </div>
      </div>

      {/* ── Bagian Tambahan: Skills ───────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="🛠️"
          title="Skill yang Digunakan"
          subtitle="Teknologi atau keahlian yang dipakai pada posisi ini."
        />

        <div className="flex gap-2 mb-3">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addSkill(); }
            }}
            placeholder="Ketik skill lalu Enter atau klik Tambah..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={addSkill}
            className="cursor-pointer shrink-0 rounded-lg border border-forest-700 px-4 py-2 text-sm text-forest-200 hover:bg-forest-700/10 transition-colors"
          >
            + Tambah
          </button>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 rounded-full border border-forest-700/40 bg-forest-700/10 pl-3 pr-2 py-1 text-xs text-forest-200"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="cursor-pointer flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">Belum ada skill ditambahkan.</p>
        )}
      </div>

      {/* ── Bagian 2: Periode Kerja ─────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="📅"
          title="Periode Kerja"
          subtitle="Kapan kamu mulai dan selesai bekerja di sini."
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="period_start" required>Mulai</Label>
              <input
                id="period_start"
                name="period_start"
                defaultValue={experience?.period_start}
                required
                placeholder="Contoh: Jan 2023"
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="period_end">Selesai</Label>
              <input
                id="period_end"
                name="period_end"
                defaultValue={experience?.period_end ?? ""}
                disabled={isCurrent}
                placeholder={isCurrent ? "Sampai sekarang" : "Contoh: Des 2024"}
                className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Toggle Posisi Saat Ini */}
          <div className="flex items-center gap-4 rounded-lg border border-navy-800 bg-navy-950 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  name="is_current"
                  id="is_current"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full border border-navy-700 bg-navy-900 peer-checked:border-forest-700 peer-checked:bg-forest-700/30 transition-all" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-600 peer-checked:translate-x-4 peer-checked:bg-forest-200 transition-all" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Posisi Saat Ini</p>
                <p className="text-xs text-slate-500">Aktifkan jika kamu masih bekerja di sini</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Bagian 3: Pengaturan ─────────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader icon="⚙️" title="Pengaturan Tampil" />
        <div>
          <Label htmlFor="sort_order" required>Urutan Tampil</Label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={experience?.sort_order ?? 0}
            min={0}
            className="w-28 rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-forest-700 focus:outline-none text-center"
          />
          <p className="mt-1 text-[11px] text-slate-600">Angka kecil muncul lebih dulu di timeline</p>
        </div>
      </div>

      {/* ── Aksi ─────────────────────────── */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Menyimpan..." : experience ? "Simpan Perubahan" : "Tambah Pengalaman"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/experiences")}
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
