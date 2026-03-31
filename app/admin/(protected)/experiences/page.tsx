import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Experience } from "@/lib/supabase";
import Link from "next/link";
import DeleteButton from "../../components/DeleteButton";
import { deleteExperience } from "./actions";

export default async function AdminExperiencesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: experiences } = await supabase
    .from("experiences")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Pengalaman Kerja</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola timeline karir kamu.</p>
        </div>
        <Link
          href="/admin/experiences/new"
          className="cursor-pointer rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500 transition-colors"
        >
          + Tambah Pengalaman
        </Link>
      </div>

      {!experiences || experiences.length === 0 ? (
        <div className="rounded-xl border border-navy-800 bg-navy-900 px-6 py-16 text-center text-sm text-slate-500">
          Belum ada data pengalaman. Klik &quot;+ Tambah Pengalaman&quot; untuk memulai.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(experiences as Experience[]).map((exp) => (
            <div
              key={exp.id}
              className="flex items-start justify-between rounded-xl border border-navy-800 bg-navy-900 p-5 hover:border-navy-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-200">{exp.position}</p>
                  {exp.is_current && (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-forest-700/20 text-forest-200 border border-forest-700/40">
                      Saat ini
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-forest-500">{exp.company}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {exp.period_start} — {exp.is_current ? "Sekarang" : exp.period_end}
                </p>
                {exp.description && (
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{exp.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Link
                  href={`/admin/experiences/${exp.id}/edit`}
                  className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 hover:border-forest-700 hover:text-slate-200 transition-all"
                >
                  Edit
                </Link>
                <DeleteButton
                  id={exp.id}
                  label={`${exp.position} di ${exp.company}`}
                  action={deleteExperience}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
