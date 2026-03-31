import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Testimonial } from "@/lib/supabase";
import Link from "next/link";
import DeleteButton from "../../components/DeleteButton";
import { deleteTestimonial, toggleTestimonialVisibility } from "./actions";
import ToggleVisibilityButton from "./ToggleVisibilityButton";

export default async function AdminTestimonialsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Testimoni</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola review dan testimoni klien.</p>
        </div>
        <Link
          href="/admin/testimonials/new"
          className="cursor-pointer rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-500 transition-colors"
        >
          + Tambah Testimoni
        </Link>
      </div>

      {!testimonials || testimonials.length === 0 ? (
        <div className="rounded-xl border border-navy-800 bg-navy-900 px-6 py-16 text-center text-sm text-slate-500">
          Belum ada testimoni. Klik &quot;+ Tambah Testimoni&quot; untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(testimonials as Testimonial[]).map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border bg-navy-900 p-5 transition-colors ${t.is_visible ? "border-navy-800" : "border-navy-800 opacity-60"}`}
            >
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-4">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950 border border-navy-800 text-slate-400 text-xs font-semibold shrink-0">
                  {t.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{t.name}</p>
                  <p className="text-xs text-forest-500">{t.role}</p>
                </div>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${t.is_visible ? "bg-forest-700/20 text-forest-200 border border-forest-700/40" : "bg-navy-950 text-slate-500 border border-navy-800"}`}>
                  {t.is_visible ? "Tampil" : "Disembunyikan"}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-navy-800">
                <ToggleVisibilityButton
                  id={t.id}
                  isVisible={t.is_visible}
                  action={toggleTestimonialVisibility}
                />
                <Link
                  href={`/admin/testimonials/${t.id}/edit`}
                  className="rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 hover:border-forest-700 hover:text-slate-200 transition-all"
                >
                  Edit
                </Link>
                <DeleteButton
                  id={t.id}
                  label={`testimoni dari "${t.name}"`}
                  action={deleteTestimonial}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
