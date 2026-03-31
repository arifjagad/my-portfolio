import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

import ExperienceForm from "../ExperienceForm";

async function createExperience(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("experiences").insert({
    company: formData.get("company"),
    position: formData.get("position"),
    description: formData.get("description") || null,
    period_start: formData.get("period_start"),
    period_end: formData.get("is_current") === "on" ? null : formData.get("period_end") || null,
    employment_type: formData.get("employment_type") || "Full-time",
    skills: JSON.parse((formData.get("skills") as string) || "[]"),
    is_current: formData.get("is_current") === "on",
    sort_order: Number(formData.get("sort_order")) || 0,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/experiences");
  revalidatePath("/");
  return { success: true };
}

export default function NewExperiencePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Tambah Pengalaman</h1>
        <p className="mt-1 text-sm text-slate-500">Tambah riwayat kerja ke timeline kamu.</p>
      </div>
      <ExperienceForm onSave={createExperience} />
    </div>
  );
}
