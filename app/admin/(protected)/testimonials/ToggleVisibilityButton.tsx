"use client";

import { useTransition } from "react";
import { toast } from "sonner";

type Props = {
  id: string;
  isVisible: boolean;
  action: (formData: FormData) => Promise<void>;
};

export default function ToggleVisibilityButton({ id, isVisible, action }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        fd.append("is_visible", String(isVisible));
        await action(fd);
        toast.success(isVisible ? "Testimoni disembunyikan" : "Testimoni ditampilkan", {
          description: isVisible
            ? "Tidak akan tampil di halaman portfolio."
            : "Sekarang terlihat di halaman portfolio.",
        });
      } catch {
        toast.error("Gagal mengubah visibilitas", {
          description: "Terjadi kesalahan. Silakan coba lagi.",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="cursor-pointer flex-1 rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 hover:border-forest-700 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {isPending ? "..." : isVisible ? "Sembunyikan" : "Tampilkan"}
    </button>
  );
}
