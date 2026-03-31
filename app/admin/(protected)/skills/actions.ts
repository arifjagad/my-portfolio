"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function deleteSkill(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();
  await supabase.from("tech_stacks").delete().eq("id", id);
  revalidatePath("/admin/skills");
  revalidatePath("/");
}
