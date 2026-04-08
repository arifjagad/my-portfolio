import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import DeleteButton from "../../../components/DeleteButton";
import { createBlogTag, deleteBlogTag } from "../actions";

export default async function AdminBlogTagsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: tags } = await supabase
    .from("blog_tags")
    .select("id,name,slug")
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Tag Blog</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola tag pendukung keyword turunan (short/middle/long-tail).
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-navy-800 bg-navy-900 p-5">
        <form action={createBlogTag} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            required
            name="name"
            placeholder="Nama tag"
            className="rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200 md:col-span-2"
          />
          <input
            name="slug"
            placeholder="slug-opsional"
            className="rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500"
          >
            + Tambah Tag
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-left">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Slug</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {(tags ?? []).map((tag) => (
              <tr key={tag.id} className="hover:bg-navy-950">
                <td className="px-5 py-4 font-medium text-slate-200">{tag.name}</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{tag.slug}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/blog/tags/${tag.id}/edit`}
                      className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-forest-700 hover:text-slate-200"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={tag.id} label={tag.name} action={deleteBlogTag} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
