import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateBlogTag } from "../../../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogTagPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: tag } = await supabase
    .from("blog_tags")
    .select("id,name,slug")
    .eq("id", id)
    .single();

  if (!tag) notFound();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Tag</h1>
        <p className="mt-1 text-sm text-slate-500">Perbarui data tag blog.</p>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <form action={updateBlogTag} className="space-y-4">
          <input type="hidden" name="id" value={tag.id} />

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Nama Tag</label>
            <input
              required
              name="name"
              defaultValue={tag.name}
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Slug</label>
            <input
              name="slug"
              defaultValue={tag.slug}
              className="w-full rounded-lg border border-navy-800 bg-navy-950 px-3 py-2 font-mono text-sm text-slate-200"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500"
            >
              Simpan Tag
            </button>
            <Link
              href="/admin/blog/tags"
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
