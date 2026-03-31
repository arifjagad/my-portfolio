import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — tidak crash saat env belum diisi
let _server: SupabaseClient | null = null;
let _client: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (!_server) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!url || !key || url.includes("xxxx")) {
      throw new Error(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY belum diisi di .env.local"
      );
    }
    _server = createClient(url, key);
  }
  return _server;
}

function getClientClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!url || !key || url.includes("xxxx")) {
      throw new Error(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY belum diisi di .env.local"
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Export sebagai getter property agar tidak inisialisasi saat module load
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return Reflect.get(getServerClient(), prop);
  },
});

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return Reflect.get(getClientClient(), prop);
  },
});

// Check apakah Supabase sudah dikonfigurasi
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!(url && !url.includes("xxxx") && !url.includes("placeholder"));
}

// Types
export type Project = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  tech_stack: string[];
  image_url: string | null;
  link_website: string | null;
  link_github: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  project_details?: ProjectDetail;
};

export type ProjectDetail = {
  id: string;
  project_id: string;
  problem: string;
  solution: string;
  result: string;
  images: string[];
  duration: string | null;
  role: string | null;
  created_at: string;
};

export type Experience = {
  id: string;
  company: string;
  position: string;
  description: string | null;
  period_start: string;
  period_end: string | null;
  employment_type: string | null;
  skills: string[];
  is_current: boolean;
  sort_order: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  project_id: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
};

export type TechStack = {
  id: string;
  name: string;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
};

export type Profile = {
  id: number;
  name: string;
  role: string;
  location: string;
  short_bio: string;
  about_text: string | null;
  cv_url: string | null;
  photo_url: string | null;
  status_text: string | null;
  updated_at: string;
};
