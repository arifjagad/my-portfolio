import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import ProjectForm from "../ProjectForm";

async function createProject(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();

  const techStackRaw = formData.get("tech_stack") as string;
  const techStack = techStackRaw ? JSON.parse(techStackRaw) : [];

  let imageUrl = formData.get("existing_image_url") as string | null;
  const imageFile = formData.get("image") as File | null;

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const buffer = await imageFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("portfolio_images")
      .upload(`projects/${fileName}`, buffer, {
        contentType: imageFile.type,
      });

    if (uploadError) return { error: `Gagal upload gambar: ${uploadError.message}` };

    const { data: publicUrlData } = supabase.storage
      .from("portfolio_images")
      .getPublicUrl(`projects/${fileName}`);

    imageUrl = publicUrlData.publicUrl;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title: formData.get("title"),
      slug: formData.get("slug"),
      tagline: formData.get("tagline"),
      description: formData.get("description"),
      tech_stack: techStack,
      link_website: formData.get("link_website") || null,
      link_github: formData.get("link_github") || null,
      image_url: imageUrl,
      sort_order: Number(formData.get("sort_order")) || 0,
      is_featured: formData.get("is_featured") === "on",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Simpan project_details jika ada
  const problem = formData.get("problem") as string;
  const solution = formData.get("solution") as string;
  const result = formData.get("result") as string;

  if (problem || solution || result) {
    await supabase.from("project_details").insert({
      project_id: project.id,
      problem: problem || "",
      solution: solution || "",
      result: result || "",
      duration: formData.get("duration") || null,
      role: formData.get("role") || null,
      images: [],
    });
  }

  revalidatePath("/admin/projects");
  revalidatePath("/");
  return { success: true };
}

export default function NewProjectPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Tambah Project</h1>
        <p className="mt-1 text-sm text-slate-500">Isi detail project baru kamu.</p>
      </div>
      <ProjectForm onSave={createProject} />
    </div>
  );
}
