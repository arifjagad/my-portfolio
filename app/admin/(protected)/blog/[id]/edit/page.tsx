import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BlogPostForm from "../../BlogPostForm";
import { saveBlogPost } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: post }, { data: categories }, { data: tags }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("*, blog_post_tags(tag_id), blog_post_images(id,image_url,alt_text,caption)")
      .eq("id", id)
      .single(),
    supabase.from("blog_categories").select("id,name").order("sort_order", { ascending: true }),
    supabase.from("blog_tags").select("id,name,slug").order("name", { ascending: true }),
  ]);

  if (!post) notFound();

  async function updatePost(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    "use server";
    return saveBlogPost(formData, id);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Edit Artikel</h1>
        <p className="mt-1 text-sm text-slate-500">Update konten, SEO, dan image artikel.</p>
      </div>

      <BlogPostForm
        post={post as never}
        categories={(categories ?? []) as Array<{ id: string; name: string }>}
        tags={(tags ?? []) as Array<{ id: string; name: string; slug: string }>}
        onSave={updatePost}
      />
    </div>
  );
}
