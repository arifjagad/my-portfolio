import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  // Ambil summary data (opsional — bisa null saat Supabase belum penuh dikonfigurasi)
  const [{ count: totalBusiness }, { count: generated }, { count: deal }] =
    await Promise.all([
      supabase.from("demo_businesses").select("*", { count: "exact", head: true }),
      supabase.from("demo_businesses").select("*", { count: "exact", head: true }).not("generated_html", "is", null),
      supabase.from("demo_businesses").select("*", { count: "exact", head: true }).eq("status_pitch", "deal"),
    ]).catch(() => [
      { count: null }, { count: null }, { count: null },
    ]) as [{ count: number | null }, { count: number | null }, { count: number | null }];

  const stats = [
    { label: "Total Bisnis Target", value: totalBusiness ?? "—", sub: "dari scraping GMaps" },
    { label: "Sudah Di-generate", value: generated ?? "—", sub: "demo page aktif" },
    { label: "Deal / Tertarik", value: deal ?? "—", sub: "status pitch" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas demo page generator.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-navy-800 bg-navy-900 p-5"
          >
            <p className="text-3xl font-bold text-slate-200">{s.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-200">{s.label}</p>
            <p className="text-xs text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/businesses"
            id="admin-action-bisnis"
            className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-slate-500 hover:bg-navy-950 hover:text-slate-200 hover:border-forest-700 transition-all"
          >
            Kelola Bisnis →
          </a>
          <a
            href="/"
            id="admin-action-portfolio"
            target="_blank"
            className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-slate-500 hover:bg-navy-950 hover:text-slate-200 hover:border-forest-700 transition-all"
          >
            Lihat Portfolio ↗
          </a>
        </div>
      </div>
    </div>
  );
}
