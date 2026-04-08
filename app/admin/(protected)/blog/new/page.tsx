import { createSupabaseServerClient } from "@/lib/supabase-server";
import BlogPostForm from "../BlogPostForm";
import { saveBlogPost } from "../actions";

async function createPost(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  "use server";
  return saveBlogPost(formData);
}

export default function AdminBlogNewPage() {
  return <NewBlogPageServer />;
}

async function NewBlogPageServer() {
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("blog_categories").select("id,name").order("sort_order", { ascending: true }),
    supabase.from("blog_tags").select("id,name,slug").order("name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-200">Buat Artikel Baru</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tulis artikel dengan editor rich text, atur SEO, lalu publish.
        </p>
      </div>

      <BlogPostForm
        categories={(categories ?? []) as Array<{ id: string; name: string }>}
        tags={(tags ?? []) as Array<{ id: string; name: string; slug: string }>}
        onSave={createPost}
      />
    </div>
  );
}
