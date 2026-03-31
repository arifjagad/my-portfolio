import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Project } from "@/lib/supabase";
import Link from "next/link";
import DeleteButton from "../../components/DeleteButton";
import { deleteProject } from "./actions";

export default async function AdminProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola project portfolio kamu.</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="cursor-pointer rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500 transition-colors"
        >
          + Tambah Project
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-xl border border-navy-800 bg-navy-900 px-6 py-16 text-center text-sm text-slate-500">
          Belum ada project. Klik &quot;+ Tambah Project&quot; untuk memulai.
        </div>
      ) : (
        <div className="rounded-xl border border-navy-800 bg-navy-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Judul</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tech Stack</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Featured</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {(projects as Project[]).map((p) => (
                <tr key={p.id} className="hover:bg-navy-950 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-200">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.tagline}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.tech_stack?.slice(0, 3).map((t: string) => (
                        <span key={t} className="rounded px-1.5 py-0.5 text-xs bg-navy-950 text-forest-500 border border-navy-800">
                          {t}
                        </span>
                      ))}
                      {p.tech_stack?.length > 3 && (
                        <span className="text-xs text-slate-500">+{p.tech_stack.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_featured ? "bg-forest-700/20 text-forest-200 border border-forest-700/40" : "bg-navy-950 text-slate-500 border border-navy-800"}`}>
                      {p.is_featured ? "Ya" : "Tidak"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/projects/${p.id}/edit`}
                        className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 hover:border-forest-700 hover:text-slate-200 transition-all"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={p.id} label={p.title} action={deleteProject} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
