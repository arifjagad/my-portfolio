import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DeleteButton from "../../components/DeleteButton";
import { deleteBlogPost } from "./actions";

export default async function AdminBlogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("id,title,slug,status,published_at,updated_at,focus_keyword")
    .order("updated_at", { ascending: false });

  const postList = posts ?? [];
  const total = postList.length;
  const published = postList.filter((item) => item.status === "published").length;
  const draft = postList.filter((item) => item.status === "draft").length;

  function statusBadge(status: string) {
    if (status === "published") return "bg-forest-700/20 text-forest-200 border border-forest-700/40";
    if (status === "scheduled") return "bg-blue-900/30 text-blue-300 border border-blue-800/50";
    if (status === "archived") return "bg-slate-800 text-slate-300 border border-slate-700";
    return "bg-navy-950 text-slate-400 border border-navy-800";
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Artikel Blog</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola artikel SEO, publish schedule, dan metadata.</p>
        </div>

        <Link
          href="/admin/blog/new"
          className="cursor-pointer rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-500"
        >
          + Tulis Artikel
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
          <p className="text-3xl font-bold text-slate-100">{total}</p>
          <p className="mt-1 text-sm text-slate-400">Total artikel</p>
        </div>
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
          <p className="text-3xl font-bold text-forest-200">{published}</p>
          <p className="mt-1 text-sm text-slate-400">Published</p>
        </div>
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
          <p className="text-3xl font-bold text-slate-200">{draft}</p>
          <p className="mt-1 text-sm text-slate-400">Draft</p>
        </div>
      </div>

      {postList.length === 0 ? (
        <div className="rounded-xl border border-navy-800 bg-navy-900 px-6 py-16 text-center text-sm text-slate-500">
          Belum ada artikel. Klik &quot;+ Tulis Artikel&quot; untuk mulai.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-800 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Judul</th>
                <th className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Focus Keyword</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">Published</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800">
              {postList.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-navy-950">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-200">{post.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">/{post.slug}</p>
                  </td>
                  <td className="hidden px-5 py-4 text-slate-400 md:table-cell">{post.focus_keyword || "-"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(post.status)}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 text-slate-400 sm:table-cell">{formatDate(post.published_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-forest-700 hover:text-slate-200"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={post.id} label={post.title} action={deleteBlogPost} />
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
