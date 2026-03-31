"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (errorParam === "not_configured") {
      toast.error("Supabase belum dikonfigurasi. Isi file .env.local terlebih dahulu.");
    }
  }, [errorParam]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      toast.error(
        authError.message === "Invalid login credentials"
          ? "Email atau password salah."
          : authError.message
      );
      setLoading(false);
      return;
    }

    toast.success("Berhasil masuk!");
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-mono text-sm font-semibold text-slate-200">
            arif<span className="text-forest-200">.</span>jagad
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            Admin Panel
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-navy-800 bg-navy-900 p-8">
          <h1 className="mb-1 text-lg font-bold text-slate-200">Masuk</h1>
          <p className="mb-6 text-sm text-slate-500">
            Gunakan akun Supabase yang kamu miliki.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-email"
                className="font-mono text-xs text-slate-500 uppercase tracking-wider"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="rounded-lg border border-navy-800 bg-navy-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-forest-700 focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="admin-password"
                className="font-mono text-xs text-slate-500 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-lg border border-navy-800 bg-navy-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-forest-700 focus:ring-2 focus:ring-forest-700/20"
              />
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              disabled={loading}
              className="cursor-pointer mt-2 w-full rounded-lg bg-forest-200 py-2.5 text-sm font-semibold text-navy-950 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(149,213,178,0.1)" }}
            >
              {loading ? "Masuk..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center font-mono text-xs text-slate-500">
          Hanya untuk admin.{" "}
          <a href="/" className="text-forest-200 hover:underline">
            ← Kembali ke portfolio
          </a>
        </p>
      </div>
    </div>
  );
}
