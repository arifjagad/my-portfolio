"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

type Props = {
  id: string;
  label: string;
  action: (formData: FormData) => Promise<void>;
  isIconOnly?: boolean;
};

export default function DeleteButton({ id, label, action, isIconOnly }: Props) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", id);
        await action(fd);
        setOpen(false);
        toast.success("Berhasil dihapus", {
          description: `"${label}" telah dihapus permanen.`,
        });
      } catch {
        setOpen(false);
        toast.error("Gagal menghapus", {
          description: "Terjadi kesalahan. Silakan coba lagi.",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Hapus"
        className={
          isIconOnly
            ? "flex h-7 w-7 items-center justify-center rounded-md bg-red-900/30 text-xs text-red-500 hover:bg-red-900 hover:text-white transition-all"
            : "cursor-pointer rounded-lg border border-navy-800 px-3 py-1.5 text-xs text-slate-400 hover:border-red-800 hover:text-red-400 transition-all"
        }
      >
        {isIconOnly ? "×" : "Hapus"}
      </button>

      <ConfirmModal
        isOpen={open}
        title="Hapus Item"
        description={`Hapus "${label}"? Tindakan ini tidak bisa dibatalkan dan data akan hilang permanen.`}
        confirmLabel="Hapus Permanen"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        isPending={isPending}
      />
    </>
  );
}
