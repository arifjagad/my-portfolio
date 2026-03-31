import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import ExperienceForm from "../../ExperienceForm";

type Props = { params: Promise<{ id: string }> };

async function updateExperience(id: string, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("experiences").update({
    company: formData.get("company"),
    position: formData.get("position"),
    description: formData.get("description") || null,
    period_start: formData.get("period_start"),
    period_end: formData.get("is_current") === "on" ? null : formData.get("period_end") || null,
    employment_type: formData.get("employment_type") || "Full-time",
    skills: JSON.parse((formData.get("skills") as string) || "[]"),
    is_current: formData.get("is_current") === "on",
    sort_order: Number(formData.get("sort_order")) || 0,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/experiences");
  revalidatePath("/");
  return { success: true };
}

export default async function EditExperiencePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: exp } = await supabase.from("experiences").select("*").eq("id", id).single();
  if (!exp) notFound();

  const boundUpdate = updateExperience.bind(null, id);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Pengalaman</h1>
        <p className="mt-1 text-sm text-slate-500">{exp.position} di {exp.company}</p>
      </div>
      <ExperienceForm experience={exp} onSave={boundUpdate} />
    </div>
  );
}
