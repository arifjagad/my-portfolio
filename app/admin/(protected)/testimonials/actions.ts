"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function deleteTestimonial(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function toggleTestimonialVisibility(formData: FormData) {
  const id = formData.get("id") as string;
  const is_visible = formData.get("is_visible") === "true";
  const supabase = await createSupabaseServerClient();
  await supabase.from("testimonials").update({ is_visible: !is_visible }).eq("id", id);
  revalidatePath("/admin/testimonials");
}
