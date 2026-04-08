import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import DeleteButton from "../../../components/DeleteButton";
import { createBlogCategory, deleteBlogCategory } from "../actions";

export default async function AdminBlogCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id,name,slug,description,is_visible,sort_order")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Kategori Blog</h1>
        <p className="mt-1 text-sm text-slate-500">
          Atur kategori untuk struktur konten yang rapi.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-navy-800 bg-navy-900 p-5">
        <form action={createBlogCategory} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            required
            name="name"
            placeholder="Nama kategori"
            className="rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200 md:col-span-2"
          />
          <input
            name="slug"
            placeholder="slug-opsional"
            className="rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
          />
          <input
            name="description"
            placeholder="Deskripsi singkat"
            className="rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="sort_order"
              placeholder="0"
              defaultValue={0}
              className="w-20 rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
            />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" name="is_visible" defaultChecked />
              Visible
            </label>
          </div>

          <button
            type="submit"
            className="md:col-span-5 w-fit rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500"
          >
            + Tambah Kategori
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-800 text-left">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Nama</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Slug</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Visible</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800">
            {(categories ?? []).map((category) => (
              <tr key={category.id} className="hover:bg-navy-950">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-200">{category.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{category.description || "-"}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{category.slug}</td>
                <td className="px-5 py-4 text-slate-400">{category.is_visible ? "Ya" : "Tidak"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/blog/categories/${category.id}/edit`}
                      className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-forest-700 hover:text-slate-200"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={category.id} label={category.name} action={deleteBlogCategory} />
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
