import { Toaster } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1B2838",
            border: "1px solid #1e3a4a",
            color: "#e2e8f0",
            fontFamily: "inherit",
            fontSize: "0.875rem",
          },
          classNames: {
            error: "!border-red-800/60",
            success: "!border-[#2D6A4F]/60",
            title: "!text-slate-100",
            description: "!text-slate-200",
            actionButton: "!bg-red-900 !text-red-200 hover:!bg-red-800 !text-xs !font-medium",
            cancelButton: "!bg-navy-800 !text-slate-400 hover:!bg-navy-700 !text-xs",
          },
        }}
      />
    </>
  );
}
