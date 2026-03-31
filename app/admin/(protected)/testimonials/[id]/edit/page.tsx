import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import TestimonialForm from "../../TestimonialForm";

type Props = { params: Promise<{ id: string }> };

async function updateTestimonial(id: string, formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();
  let finalAvatarUrl = formData.get("existing_avatar_url") as string | null;
  const imageFile = formData.get("avatar_url") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `testimonial-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const buffer = await imageFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("portfolio_images")
      .upload(`testimonials/${fileName}`, buffer, {
        contentType: imageFile.type,
      });

    if (uploadError) return { error: `Gagal upload gambar: ${uploadError.message}` };

    const { data: publicUrlData } = supabase.storage
      .from("portfolio_images")
      .getPublicUrl(`testimonials/${fileName}`);

    finalAvatarUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("testimonials").update({
    name: formData.get("name"),
    role: formData.get("role"),
    content: formData.get("content"),
    avatar_url: finalAvatarUrl || null,
    is_visible: formData.get("is_visible") === "on",
    sort_order: Number(formData.get("sort_order")) || 0,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true };
}

export default async function EditTestimonialPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: t } = await supabase.from("testimonials").select("*").eq("id", id).single();
  if (!t) notFound();

  const boundUpdate = updateTestimonial.bind(null, id);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Testimoni</h1>
        <p className="mt-1 text-sm text-slate-500">Testimoni dari {t.name}</p>
      </div>
      <TestimonialForm testimonial={t} onSave={boundUpdate} />
    </div>
  );
}
