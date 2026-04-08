import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateBlogCategory } from "../../../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogCategoryPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: category } = await supabase
    .from("blog_categories")
    .select("id,name,slug,description,is_visible,sort_order")
    .eq("id", id)
    .single();

  if (!category) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Kategori</h1>
        <p className="mt-1 text-sm text-slate-500">Perbarui data kategori blog.</p>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <form action={updateBlogCategory} className="space-y-4">
          <input type="hidden" name="id" value={category.id} />

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Nama Kategori</label>
            <input
              required
              name="name"
              defaultValue={category.name}
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Slug</label>
            <input
              name="slug"
              defaultValue={category.slug}
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 font-mono text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Deskripsi</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={category.description || ""}
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">Sort Order</label>
              <input
                type="number"
                name="sort_order"
                defaultValue={category.sort_order}
                className="w-24 rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <label className="mt-6 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_visible" defaultChecked={category.is_visible} />
              Visible
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500"
            >
              Simpan Kategori
            </button>
            <Link
              href="/admin/blog/categories"
              className="rounded-lg border border-navy-700 px-4 py-2 text-sm text-slate-300 hover:border-navy-600"
            >
              Kembali
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
