"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Project, ProjectDetail } from "@/lib/supabase";

type Props = {
  project?: Project & { project_details?: ProjectDetail };
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
};

// Label component dengan tanda opsional/wajib
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
    <label
      htmlFor={htmlFor}
      className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400"
    >
      {children}
      {required ? (
        <span className="text-forest-200 text-xs">*</span>
      ) : (
        <span className="text-slate-600 text-[10px] font-normal">(opsional)</span>
      )}
    </label>
  );
}

// Input style reusable
const inputClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30";

const textareaClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30 resize-none";

// Section header
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

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function ProjectForm({ project, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [titleValue, setTitleValue] = useState(project?.title ?? "");
  const [slugValue, setSlugValue] = useState(project?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!project?.slug);
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>(project?.tech_stack ?? []);

  function addTech() {
    const trimmed = techInput.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setTechInput("");
    }
  }

  function removeTech(t: string) {
    setTechStack(techStack.filter((x) => x !== t));
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitleValue(val);
    if (!slugEdited) {
      setSlugValue(toSlug(val));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlugValue(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("tech_stack");
    fd.append("tech_stack", JSON.stringify(techStack));

    startTransition(async () => {
      const result = await onSave(fd);
      if (result?.error) {
        const { toast } = await import("sonner");
        toast.error(result.error);
      } else {
        const { toast } = await import("sonner");
        toast.success(isEdit ? "Project berhasil diperbarui" : "Project berhasil ditambahkan", {
          description: isEdit ? "Perubahan telah disimpan." : "Project baru telah ditambahkan ke portfolio.",
        });
        router.push("/admin/projects");
        router.refresh();
      }
    });
  }

  const isEdit = !!project;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── BAGIAN 1: Informasi Utama ───────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="📋"
          title="Informasi Utama"
          subtitle="Data dasar project yang tampil di homepage."
        />

        <div className="space-y-4">
          {/* Judul & Slug */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title" required>Judul Project</Label>
              <input
                id="title"
                name="title"
                value={titleValue}
                onChange={handleTitleChange}
                required
                placeholder="Contoh: Topup Gaming App"
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="slug" required>Slug URL</Label>
              <input
                id="slug"
                name="slug"
                value={slugValue}
                onChange={handleSlugChange}
                required
                placeholder="topup-gaming-app"
                className={`${inputClass} font-mono`}
              />
              <p className="mt-1 text-[11px] text-slate-600">
                Digunakan di URL: /projects/<span className="text-slate-500">slug</span>
              </p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <Label htmlFor="tagline" required>Tagline</Label>
            <input
              id="tagline"
              name="tagline"
              defaultValue={project?.tagline}
              required
              placeholder="Satu kalimat yang menggambarkan project ini"
              className={inputClass}
            />
          </div>

          {/* Deskripsi */}
          <div>
            <Label htmlFor="description" required>Deskripsi</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={project?.description}
              required
              rows={3}
              placeholder="Penjelasan singkat tentang project ini (tampil di card homepage)"
              className={textareaClass}
            />
          </div>
        </div>
      </div>

      {/* ── BAGIAN 2: Tech Stack ────────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="🛠️"
          title="Tech Stack"
          subtitle="Teknologi yang digunakan dalam project ini."
        />

        <div className="flex gap-2 mb-3">
          <input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTech(); }
            }}
            placeholder="Ketik teknologi lalu Enter atau klik Tambah..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={addTech}
            className="cursor-pointer shrink-0 rounded-lg border border-forest-700 px-4 py-2 text-sm text-forest-200 hover:bg-forest-700/10 transition-colors"
          >
            + Tambah
          </button>
        </div>

        {techStack.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {techStack.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 rounded-full border border-forest-700/40 bg-forest-700/10 pl-3 pr-2 py-1 text-xs text-forest-200"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTech(t)}
                  className="cursor-pointer flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">Belum ada tech stack ditambahkan.</p>
        )}
      </div>

      {/* ── BAGIAN 3: Link & Media ──────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="🔗"
          title="Link & Media"
          subtitle="URL project live, GitHub, dan gambar cover."
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="link_website">Link Website</Label>
              <input
                id="link_website"
                name="link_website"
                defaultValue={project?.link_website ?? ""}
                type="url"
                placeholder="https://contoh.com"
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="link_github">Link GitHub</Label>
              <input
                id="link_github"
                name="link_github"
                defaultValue={project?.link_github ?? ""}
                type="url"
                placeholder="https://github.com/username/repo"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="image">Upload Gambar Cover</Label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-forest-700/20 file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-forest-200 hover:file:bg-forest-700/30 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30"
            />
            {project?.image_url && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Gambar Saat Ini</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={project.image_url} alt="Cover Preview" className="h-32 w-auto rounded-xl border border-navy-800 bg-navy-950 object-cover" />
              </div>
            )}
            <input type="hidden" name="existing_image_url" value={project?.image_url ?? ""} />
          </div>
        </div>
      </div>

      {/* ── BAGIAN 4: Pengaturan ────────────────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="⚙️"
          title="Pengaturan Tampil"
        />

        <div className="flex items-center gap-8">
          <div>
            <Label htmlFor="sort_order" required>Urutan Tampil</Label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={project?.sort_order ?? 0}
              min={0}
              className="w-24 rounded-lg border border-navy-800 bg-navy-950 px-3 py-2.5 text-sm text-slate-200 focus:border-forest-700 focus:outline-none text-center"
            />
            <p className="mt-1 text-[11px] text-slate-600">Angka kecil = tampil lebih dulu</p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs font-medium text-slate-400">Featured</p>
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  name="is_featured"
                  id="is_featured"
                  defaultChecked={project?.is_featured ?? false}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full border border-navy-700 bg-navy-950 peer-checked:border-forest-700 peer-checked:bg-forest-700/30 transition-all" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-600 peer-checked:translate-x-4 peer-checked:bg-forest-200 transition-all" />
              </div>
              <span className="text-sm text-slate-400 peer-has-[:checked]:text-slate-200">
                Tampilkan sebagai highlight
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── BAGIAN 5: Case Study (Opsional) ─────────────────── */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <SectionHeader
          icon="📖"
          title="Detail Case Study"
          subtitle="Isi bagian ini jika ingin ada halaman detail /projects/[slug]."
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="duration">Durasi Project</Label>
              <input
                id="duration"
                name="duration"
                defaultValue={project?.project_details?.duration ?? ""}
                placeholder="Contoh: 2 bulan"
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="role">Role Kamu</Label>
              <input
                id="role"
                name="role"
                defaultValue={project?.project_details?.role ?? ""}
                placeholder="Contoh: Fullstack Developer"
                className={inputClass}
              />
            </div>
          </div>

          {[
            { id: "problem", label: "Problem", placeholder: "Masalah apa yang dihadapi klien atau user?" },
            { id: "solution", label: "Solution", placeholder: "Bagaimana kamu menyelesaikan masalah tersebut?" },
            { id: "result", label: "Result", placeholder: "Apa dampak / hasil yang dicapai?" },
          ].map(({ id, label, placeholder }) => (
            <div key={id}>
              <Label htmlFor={id}>{label}</Label>
              <textarea
                id={id}
                name={id}
                defaultValue={(project?.project_details as Record<string, string> | undefined)?.[id] ?? ""}
                rows={3}
                placeholder={placeholder}
                className={textareaClass}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── AKSI ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer rounded-lg bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Project"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
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
