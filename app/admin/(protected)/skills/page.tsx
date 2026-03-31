import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TechStack } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import DeleteButton from "../../components/DeleteButton";
import { deleteSkill } from "./actions";

export default async function SkillsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: skills } = await supabase
    .from("tech_stacks")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Tech Stack</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola logo teknologi dan skill yang dipajang di web.</p>
        </div>
        <Link
          href="/admin/skills/new"
          className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-500 transition-colors"
        >
          + Tambah Logo
        </Link>
      </div>

      <div className="rounded-xl border border-navy-800 bg-navy-900 overflow-hidden">
        {skills && skills.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
            {skills.map((skill: TechStack) => (
              <div key={skill.id} className="group relative flex flex-col items-center justify-center rounded-xl border border-navy-800 bg-navy-950 p-4 hover:border-forest-700 transition-colors">
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Link
                    href={`/admin/skills/${skill.id}/edit`}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-800 text-xs text-slate-400 hover:text-white"
                    title="Edit"
                  >
                    ✎
                  </Link>
                  <DeleteButton id={skill.id} label={skill.name} action={deleteSkill} isIconOnly={true} />
                </div>

                {/* Badge visibilitas */}
                {!skill.is_visible && (
                  <span className="absolute top-2 left-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">Hidden</span>
                )}

                {/* Logo & Info */}
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-navy-900 border border-navy-800 p-2">
                  {skill.image_url ? (
                    <Image src={skill.image_url} alt={skill.name} width={40} height={40} className="object-contain" />
                  ) : (
                    <span className="text-2xl text-slate-600">?</span>
                  )}
                </div>
                <p className="text-center text-xs font-semibold text-slate-300 truncate w-full">{skill.name}</p>
                <p className="mt-1 text-center text-[10px] text-slate-500">Urutan: {skill.sort_order}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-sm">
            Belum ada tech stack yang ditambahkan.
          </div>
        )}
      </div>
    </div>
  );
}
