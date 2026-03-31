/**
 * app/admin/(protected)/demo/[slug]/page.tsx
 * Server component: ambil data bisnis, pass ke DemoDetailClient
 */

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import DemoDetailClient from "./DemoDetailClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("demo_businesses")
    .select("nama_bisnis")
    .eq("slug", slug)
    .single();

  return { title: `${data?.nama_bisnis || slug} — Demo Admin` };
}

export default async function DemoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getServiceClient();

  const { data: biz, error } = await supabase
    .from("demo_businesses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !biz) {
    notFound();
  }

  return <DemoDetailClient biz={biz} />;
}
