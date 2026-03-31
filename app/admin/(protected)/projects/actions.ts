"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function deleteProject(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/admin/projects");
  revalidatePath("/");
}
