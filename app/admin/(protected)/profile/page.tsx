import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import ProfileForm from "./ProfileForm";

async function saveProfile(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  const supabase = await createSupabaseServerClient();
  let cvUrl = formData.get("existing_cv_url") as string | null;
  let photoUrl = formData.get("existing_photo_url") as string | null;

  const cvFile = formData.get("cv_file") as File | null;
  const photoFile = formData.get("photo_file") as File | null;

  // Handle Photo Upload
  if (photoFile && photoFile.size > 0) {
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `photo-${Date.now()}.${fileExt}`;
    const buffer = await photoFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("portfolio_images")
      .upload(`profile/${fileName}`, buffer, { contentType: photoFile.type });

    if (!uploadError) {
      const { data } = supabase.storage.from("portfolio_images").getPublicUrl(`profile/${fileName}`);
      photoUrl = data.publicUrl;
    }
  }

  // Handle CV Upload
  if (cvFile && cvFile.size > 0) {
    const fileExt = cvFile.name.split('.').pop();
    const fileName = `cv-${Date.now()}.${fileExt}`;
    const buffer = await cvFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("portfolio_images")
      .upload(`profile/${fileName}`, buffer, { contentType: cvFile.type });

    if (!uploadError) {
      const { data } = supabase.storage.from("portfolio_images").getPublicUrl(`profile/${fileName}`);
      cvUrl = data.publicUrl;
    }
  }

  const payload = {
    id: 1, // Singleton
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    location: formData.get("location") as string,
    short_bio: formData.get("short_bio") as string,
    about_text: formData.get("about_text") as string,
    cv_url: cvUrl,
    photo_url: photoUrl,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: 'id' });
  
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export default async function ProfileAdminPage() {
  const supabase = await createSupabaseServerClient();
  // Fetch existing profile (if any)
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", 1).single();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Profil & CV</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola identitas utama, ringkasan profil, dan file CV yang bisa diunduh.</p>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 p-6">
        <ProfileForm profile={profile} onSave={saveProfile} />
      </div>
    </div>
  );
}
