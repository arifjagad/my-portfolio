"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function toSlug(value: string) {
  return slugify(value, { lower: true, strict: true, trim: true });
}

function parseCsvKeywords(input: string | null): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function estimateReadingTimeMinutes(html: string | null): number {
  if (!html) return 1;
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

async function uploadSingleImage(
  pathPrefix: string,
  file: File
): Promise<{ path: string; url: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const ext = file.name.split(".").pop() || "webp";
  const random = Math.random().toString(36).slice(2, 8);
  const filePath = `${pathPrefix}/${Date.now()}-${random}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("article-image")
    .upload(filePath, buffer, {
      contentType: file.type || "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from("article-image").getPublicUrl(filePath);

  return {
    path: filePath,
    url: data.publicUrl,
  };
}

export async function deleteBlogPost(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();

  const [{ data: post }, { data: gallery }] = await Promise.all([
    supabase.from("blog_posts").select("featured_image_path, slug").eq("id", id).single(),
    supabase.from("blog_post_images").select("storage_path").eq("post_id", id),
  ]);

  const pathsToDelete = [
    post?.featured_image_path,
    ...(gallery ?? []).map((item) => item.storage_path),
  ].filter((item): item is string => Boolean(item));

  if (pathsToDelete.length > 0) {
    await supabase.storage.from("article-image").remove(pathsToDelete);
  }

  await supabase.from("blog_posts").delete().eq("id", id);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (post?.slug) {
    revalidatePath(`/blog/${post.slug}`);
  }
}

export async function deleteBlogCategory(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();

  await supabase.from("blog_categories").delete().eq("id", id);

  revalidatePath("/admin/blog/categories");
}

export async function deleteBlogTag(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createSupabaseServerClient();

  await supabase.from("blog_tags").delete().eq("id", id);

  revalidatePath("/admin/blog/tags");
}

export async function createBlogCategory(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = toSlug(slugInput || name);

  await supabase.from("blog_categories").insert({
    name,
    slug,
    description: ((formData.get("description") as string) || "").trim() || null,
    sort_order: Number(formData.get("sort_order") || 0),
    is_visible: formData.get("is_visible") === "on",
  });

  revalidatePath("/admin/blog/categories");
}

export async function updateBlogCategory(formData: FormData) {
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;

  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = toSlug(slugInput || name);

  await supabase
    .from("blog_categories")
    .update({
      name,
      slug,
      description: ((formData.get("description") as string) || "").trim() || null,
      sort_order: Number(formData.get("sort_order") || 0),
      is_visible: formData.get("is_visible") === "on",
    })
    .eq("id", id);

  revalidatePath("/admin/blog/categories");
  revalidatePath(`/admin/blog/categories/${id}/edit`);
}

export async function createBlogTag(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = toSlug(slugInput || name);

  await supabase.from("blog_tags").insert({ name, slug });

  revalidatePath("/admin/blog/tags");
}

export async function updateBlogTag(formData: FormData) {
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;

  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = toSlug(slugInput || name);

  await supabase.from("blog_tags").update({ name, slug }).eq("id", id);

  revalidatePath("/admin/blog/tags");
  revalidatePath(`/admin/blog/tags/${id}/edit`);
}

export async function saveBlogPost(
  formData: FormData,
  postId?: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createSupabaseServerClient();

  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    return { error: "Judul artikel wajib diisi." };
  }

  const slugInput = (formData.get("slug") as string)?.trim();
  const slug = toSlug(slugInput || title);
  const contentHtml = (formData.get("content_html") as string) || "";
  const contentJsonRaw = (formData.get("content_json") as string) || "{}";

  let contentJson: unknown = {};
  try {
    contentJson = JSON.parse(contentJsonRaw);
  } catch {
    contentJson = {};
  }

  const selectedTagIds = formData.getAll("tag_ids").map(String).filter(Boolean);
  const galleryAltText = formData.getAll("gallery_alt").map((v) => String(v).trim());
  const galleryCaption = formData.getAll("gallery_caption").map((v) => String(v).trim());

  const rawStatus = (formData.get("status") as string) || "draft";
  const validStatuses = new Set(["draft", "scheduled", "published", "archived"]);
  const status = validStatuses.has(rawStatus) ? rawStatus : "draft";

  const publishedAtRaw = (formData.get("published_at") as string)?.trim();
  const scheduledAtRaw = (formData.get("scheduled_at") as string)?.trim();

  let publishedAt: string | null = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;
  let scheduledAt: string | null = scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : null;

  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }
  if (status !== "scheduled") {
    scheduledAt = null;
  }

  const payload = {
    title,
    slug,
    excerpt: ((formData.get("excerpt") as string) || "").trim() || null,
    content_json: contentJson,
    content_html: contentHtml,
    category_id: ((formData.get("category_id") as string) || "").trim() || null,
    status,
    published_at: publishedAt,
    scheduled_at: scheduledAt,
    author_name: ((formData.get("author_name") as string) || "").trim() || "Arif Jagad",
    featured_image_path: ((formData.get("existing_featured_image_path") as string) || "").trim() || null,
    featured_image_url: ((formData.get("existing_featured_image_url") as string) || "").trim() || null,
    featured_image_alt: ((formData.get("featured_image_alt") as string) || "").trim() || null,
    seo_title: ((formData.get("seo_title") as string) || "").trim() || null,
    seo_description: ((formData.get("seo_description") as string) || "").trim() || null,
    focus_keyword: ((formData.get("focus_keyword") as string) || "").trim() || null,
    seo_keywords: parseCsvKeywords((formData.get("seo_keywords") as string) || ""),
    canonical_url: ((formData.get("canonical_url") as string) || "").trim() || null,
    robots_index: formData.get("robots_index") === "on",
    robots_follow: formData.get("robots_follow") === "on",
    og_title: ((formData.get("og_title") as string) || "").trim() || null,
    og_description: ((formData.get("og_description") as string) || "").trim() || null,
    og_image_url: ((formData.get("og_image_url") as string) || "").trim() || null,
    reading_time_minutes: estimateReadingTimeMinutes(contentHtml),
  };

  const featuredImage = formData.get("featured_image") as File | null;
  if (featuredImage && featuredImage.size > 0) {
    const prefix = `posts/${slug || "draft"}`;
    const uploaded = await uploadSingleImage(prefix, featuredImage);
    if ("error" in uploaded) {
      return { error: `Gagal upload featured image: ${uploaded.error}` };
    }

    payload.featured_image_path = uploaded.path;
    payload.featured_image_url = uploaded.url;
  }

  let id = postId;

  if (postId) {
    const { error } = await supabase.from("blog_posts").update(payload).eq("id", postId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
    if (error) return { error: error.message };
    id = data.id;
  }

  if (!id) {
    return { error: "Gagal menyimpan artikel." };
  }

  await supabase.from("blog_post_tags").delete().eq("post_id", id);

  if (selectedTagIds.length > 0) {
    const rows = selectedTagIds.map((tagId) => ({ post_id: id, tag_id: tagId }));
    await supabase.from("blog_post_tags").insert(rows);
  }

  const deletedGalleryIds = formData.getAll("delete_gallery_ids").map(String).filter(Boolean);
  if (deletedGalleryIds.length > 0) {
    const { data: imagesToDelete } = await supabase
      .from("blog_post_images")
      .select("id, storage_path")
      .in("id", deletedGalleryIds)
      .eq("post_id", id);

    if (imagesToDelete && imagesToDelete.length > 0) {
      const paths = imagesToDelete.map((item) => item.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("article-image").remove(paths);
      }

      await supabase.from("blog_post_images").delete().in("id", deletedGalleryIds).eq("post_id", id);
    }
  }

  const galleryFiles = formData.getAll("gallery_images") as File[];
  const galleryRows: Array<{
    post_id: string;
    storage_path: string;
    image_url: string;
    alt_text: string | null;
    caption: string | null;
    sort_order: number;
  }> = [];

  for (let i = 0; i < galleryFiles.length; i += 1) {
    const file = galleryFiles[i];
    if (!file || file.size <= 0) continue;

    const uploaded = await uploadSingleImage(`posts/${slug || "draft"}/gallery`, file);
    if ("error" in uploaded) {
      return { error: `Gagal upload gallery image: ${uploaded.error}` };
    }

    galleryRows.push({
      post_id: id,
      storage_path: uploaded.path,
      image_url: uploaded.url,
      alt_text: galleryAltText[i] || null,
      caption: galleryCaption[i] || null,
      sort_order: i,
    });
  }

  if (galleryRows.length > 0) {
    await supabase.from("blog_post_images").insert(galleryRows);
  }

  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/new");
  revalidatePath(`/admin/blog/${id}/edit`);
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/blog/tags");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  return { success: true };
}
