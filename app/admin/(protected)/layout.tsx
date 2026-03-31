import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminSidebar from "../components/AdminSidebar";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambil email user untuk sidebar (middleware sudah jamin user pasti login sampai sini)
  let userEmail = "";
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? "";
  } catch {
    // ignored
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      <AdminSidebar userEmail={userEmail} />
      <main className="flex-1 min-w-0 p-8">
        {children}
      </main>
    </div>
  );
}
