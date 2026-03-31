import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import TechStackForm from "../../TechStackForm";

type Props = { params: Promise<{ id: string }> };

async function updateSkill(id: string, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();
  let finalImageUrl = formData.get("existing_image_url") as string | null;
  const imageFile = formData.get("image_url") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `tech-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const buffer = await imageFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("portfolio_images")
      .upload(`skills/${fileName}`, buffer, {
        contentType: imageFile.type,
      });

    if (uploadError) return { error: `Gagal upload gambar: ${uploadError.message}` };

    const { data: publicUrlData } = supabase.storage
      .from("portfolio_images")
      .getPublicUrl(`skills/${fileName}`);

    finalImageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("tech_stacks").update({
    name: formData.get("name"),
    image_url: finalImageUrl || null,
    is_visible: formData.get("is_visible") === "on",
    sort_order: Number(formData.get("sort_order")) || 0,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/skills");
  revalidatePath("/");
  return { success: true };
}

export default async function EditTechStackPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase.from("tech_stacks").select("*").eq("id", id).single();
  if (!s) notFound();

  const boundUpdate = updateSkill.bind(null, id);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Tech Stack</h1>
        <p className="mt-1 text-sm text-slate-500">Ubah logo atau nama teknologi.</p>
      </div>
      <TechStackForm skill={s} onSave={boundUpdate} />
    </div>
  );
}
