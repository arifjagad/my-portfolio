import { createSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import ProjectForm from "../../ProjectForm";

type Props = { params: Promise<{ id: string }> };

async function updateProject(id: string, formData: FormData): Promise<{ error?: string; success?: boolean }> {
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
        upsert: true,
      });

    if (uploadError) return { error: `Gagal upload gambar: ${uploadError.message}` };

    const { data: publicUrlData } = supabase.storage
      .from("portfolio_images")
      .getPublicUrl(`projects/${fileName}`);

    imageUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from("projects")
    .update({
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
    .eq("id", id);

  if (error) return { error: error.message };

  // Upsert project_details
  const problem = formData.get("problem") as string;
  const solution = formData.get("solution") as string;
  const result = formData.get("result") as string;

  const { data: existing } = await supabase
    .from("project_details")
    .select("id")
    .eq("project_id", id)
    .single();

  if (existing) {
    await supabase.from("project_details").update({
      problem: problem || "",
      solution: solution || "",
      result: result || "",
      duration: formData.get("duration") || null,
      role: formData.get("role") || null,
    }).eq("project_id", id);
  } else if (problem || solution || result) {
    await supabase.from("project_details").insert({
      project_id: id,
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

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, project_details(*)")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const boundUpdate = updateProject.bind(null, id);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Project</h1>
        <p className="mt-1 text-sm text-slate-500">Ubah detail project &ldquo;{project.title}&rdquo;.</p>
      </div>
      <ProjectForm project={project} onSave={boundUpdate} />
    </div>
  );
}
