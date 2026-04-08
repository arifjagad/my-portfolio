"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import BlogDatePicker from "./BlogDatePicker";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";

const WordPressShortcuts = Extension.create({
  name: "wordpressShortcuts",
  addKeyboardShortcuts() {
    const applyAlign = (align: "left" | "center" | "right" | "justify") => () => {
      const chain = this.editor.chain().focus() as unknown as {
        setTextAlign?: (value: string) => { run: () => boolean };
        updateAttributes: (type: string, attrs: Record<string, unknown>) => { run: () => boolean };
      };

      if (typeof chain.setTextAlign === "function") {
        return chain.setTextAlign(align).run();
      }

      const paragraphChanged = this.editor
        .chain()
        .focus()
        .updateAttributes("paragraph", { textAlign: align })
        .run();

      const headingChanged = this.editor
        .chain()
        .focus()
        .updateAttributes("heading", { textAlign: align })
        .run();

      return paragraphChanged || headingChanged;
    };

    const exec = (cb: () => boolean) => () => cb();

    return {
      "Alt-Shift-l": exec(applyAlign("left")),
      "Alt-Shift-c": exec(applyAlign("center")),
      "Alt-Shift-r": exec(applyAlign("right")),
      "Alt-Shift-j": exec(applyAlign("justify")),
      "Mod-Shift-l": exec(applyAlign("left")),
      "Mod-Shift-e": exec(applyAlign("center")),
      "Mod-Shift-r": exec(applyAlign("right")),
      "Mod-Shift-j": exec(applyAlign("justify")),
      "Alt-Shift-q": exec(() => this.editor.chain().focus().toggleBlockquote().run()),
      "Alt-Shift-7": exec(() => this.editor.chain().focus().toggleOrderedList().run()),
      "Alt-Shift-8": exec(() => this.editor.chain().focus().toggleBulletList().run()),
    };
  },
});

type BlogCategory = {
  id: string;
  name: string;
};

type BlogTag = {
  id: string;
  name: string;
  slug: string;
};

type BlogImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  caption: string | null;
};

type BlogPostLike = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  category_id: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  published_at: string | null;
  scheduled_at: string | null;
  author_name: string | null;
  featured_image_path: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  blog_post_tags?: { tag_id: string }[];
  blog_post_images?: BlogImage[];
};

type Props = {
  post?: BlogPostLike;
  categories: BlogCategory[];
  tags: BlogTag[];
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const inputClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30";

const textareaClass =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30 resize-y";

const toolbarButtonBase =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors";

function toolbarButtonClass(active = false) {
  return `${toolbarButtonBase} ${
    active
      ? "border-forest-500 bg-forest-700/30 text-forest-100"
      : "border-navy-700 bg-navy-900 text-slate-300 hover:border-forest-700 hover:text-slate-100"
  }`;
}

function ToolbarIconButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`${toolbarButtonClass(Boolean(active))} ${disabled ? "opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function trimForPreview(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function toLocalDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

export default function BlogPostForm({ post, categories, tags, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [titleValue, setTitleValue] = useState(post?.title ?? "");
  const [slugValue, setSlugValue] = useState(post?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [publishedDateValue, setPublishedDateValue] = useState(toLocalDateInput(post?.published_at));
  const [scheduledDateValue, setScheduledDateValue] = useState(toLocalDateInput(post?.scheduled_at));
  const [excerptValue, setExcerptValue] = useState(post?.excerpt ?? "");
  const [focusKeywordValue, setFocusKeywordValue] = useState(post?.focus_keyword ?? "");
  const [seoTitleValue, setSeoTitleValue] = useState(post?.seo_title ?? "");
  const [seoDescriptionValue, setSeoDescriptionValue] = useState(post?.seo_description ?? "");
  const [canonicalUrlValue, setCanonicalUrlValue] = useState(post?.canonical_url ?? "");
  const [contentWordCount, setContentWordCount] = useState(0);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertFilter, setInsertFilter] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const isEdit = Boolean(post?.id);

  const initialTagIds = useMemo(
    () => new Set((post?.blog_post_tags ?? []).map((item) => item.tag_id)),
    [post?.blog_post_tags]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Typography,
      WordPressShortcuts,
      Placeholder.configure({
        placeholder: "Tulis isi artikel di sini...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[420px] px-5 py-4 text-[15px] leading-7 text-slate-200 focus:outline-none",
      },
    },
    content: post?.content_html || "<p></p>",
    onCreate({ editor: instance }) {
      const count = instance.getText().trim().split(/\s+/).filter(Boolean).length;
      setContentWordCount(count);
    },
    onUpdate({ editor: instance }) {
      const count = instance.getText().trim().split(/\s+/).filter(Boolean).length;
      setContentWordCount(count);
    },
  });

  const seoChecks = useMemo(() => {
    const keyword = focusKeywordValue.trim().toLowerCase();
    const title = titleValue.trim().toLowerCase();
    const excerpt = excerptValue.trim().toLowerCase();
    const seoDesc = seoDescriptionValue.trim().toLowerCase();
    const seoTitleLength = seoTitleValue.trim().length;
    const seoDescriptionLength = seoDescriptionValue.trim().length;

    const checks = [
      {
        label: "Focus keyword terisi",
        passed: keyword.length >= 3,
      },
      {
        label: "Focus keyword muncul di judul",
        passed: keyword.length >= 3 && title.includes(keyword),
      },
      {
        label: "Focus keyword muncul di excerpt / meta description",
        passed:
          keyword.length >= 3 &&
          (excerpt.includes(keyword) || seoDesc.includes(keyword)),
      },
      {
        label: "SEO title ideal (30-60 karakter)",
        passed: seoTitleLength >= 30 && seoTitleLength <= 60,
      },
      {
        label: "SEO description ideal (120-160 karakter)",
        passed: seoDescriptionLength >= 120 && seoDescriptionLength <= 160,
      },
      {
        label: "Panjang konten minimal 300 kata",
        passed: contentWordCount >= 300,
      },
      {
        label: "Canonical URL terisi",
        passed: canonicalUrlValue.trim().length > 0,
      },
    ];

    const passedCount = checks.filter((item) => item.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    const tone = score >= 80 ? "green" : score >= 55 ? "yellow" : "red";

    return { checks, score, tone };
  }, [
    canonicalUrlValue,
    contentWordCount,
    excerptValue,
    focusKeywordValue,
    seoDescriptionValue,
    seoTitleValue,
    titleValue,
  ]);

  const slugNormalized = toSlug(slugValue || titleValue || "");
  const focusKeywordSlug = toSlug(focusKeywordValue || "");
  const missingKeywordInSlug =
    focusKeywordSlug.length > 0 && !slugNormalized.includes(focusKeywordSlug);

  const previewTitleRaw = seoTitleValue.trim() || titleValue.trim() || "Judul artikel kamu akan tampil di sini";
  const previewUrlRaw =
    canonicalUrlValue.trim() ||
    `https://arifjagad.my.id/blog/${slugNormalized || "judul-artikel"}`;
  const previewDescriptionRaw =
    seoDescriptionValue.trim() ||
    excerptValue.trim() ||
    "Meta description artikel akan tampil di sini. Buat ringkas, jelas, dan mengandung keyword utama.";

  const previewTitle = trimForPreview(previewTitleRaw, 60);
  const previewDescription = trimForPreview(previewDescriptionRaw, 160);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTitleValue(next);
    if (!slugEdited) setSlugValue(toSlug(next));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugEdited(true);
    setSlugValue(e.target.value);
  }

  function addLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Masukkan URL:", previousUrl);
    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertBlock(type: string) {
    if (!editor) return;

    if (type === "paragraph") editor.chain().focus().setParagraph().run();
    if (type === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (type === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
    if (type === "bullet") editor.chain().focus().toggleBulletList().run();
    if (type === "ordered") editor.chain().focus().toggleOrderedList().run();
    if (type === "task") editor.chain().focus().toggleTaskList().run();
    if (type === "quote") editor.chain().focus().toggleBlockquote().run();
    if (type === "code") editor.chain().focus().toggleCodeBlock().run();
    if (type === "divider") editor.chain().focus().setHorizontalRule().run();

    setShowInsertMenu(false);
    setInsertFilter("");
    setShowSlashMenu(false);
    setSlashFilter("");
  }

  function openSlashMenu() {
    if (!editor) return;
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    setSlashPosition({ top: coords.bottom + 8, left: coords.left });
    setShowSlashMenu(true);
    setSlashFilter("");
  }

  async function uploadInlineImage(file: File) {
    if (!editor || !file || file.size <= 0) return;

    setIsUploadingInlineImage(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() || "webp";
      const random = Math.random().toString(36).slice(2, 8);
      const path = `editor-inline/${Date.now()}-${random}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("article-image")
        .upload(path, file, {
          contentType: file.type || "image/webp",
          upsert: true,
        });

      if (uploadError) {
        const { toast } = await import("sonner");
        toast.error(`Gagal upload image: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from("article-image").getPublicUrl(path);

      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
      const { toast } = await import("sonner");
      toast.success("Image berhasil ditambahkan ke artikel");
    } finally {
      setIsUploadingInlineImage(false);
    }
  }

  async function onInlineImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadInlineImage(file);
    e.target.value = "";
  }

  function addImageByUrl() {
    if (!editor) return;
    const url = window.prompt("Masukkan URL image:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setShowSlashMenu(false);
    setSlashFilter("");
  }

  function applyTextAlign(align: "left" | "center" | "right" | "justify") {
    if (!editor) return;

    const chain = editor.chain().focus() as unknown as {
      setTextAlign?: (value: string) => { run: () => boolean };
      updateAttributes: (type: string, attrs: Record<string, unknown>) => { run: () => boolean };
    };

    const supportsTextAlign =
      typeof (editor.commands as { setTextAlign?: unknown }).setTextAlign === "function";

    if (supportsTextAlign && typeof chain.setTextAlign === "function") {
      chain.setTextAlign(align).run();
      return;
    }

    editor.chain().focus().updateAttributes("paragraph", { textAlign: align }).run();
    editor.chain().focus().updateAttributes("heading", { textAlign: align }).run();
  }

  const insertOptions = [
    { key: "paragraph", label: "Text" },
    { key: "h2", label: "Heading H2" },
    { key: "h3", label: "Heading H3" },
    { key: "bullet", label: "Unordered List" },
    { key: "ordered", label: "Ordered List" },
    { key: "task", label: "Checklist" },
    { key: "quote", label: "Quote" },
    { key: "code", label: "Code Block" },
    { key: "divider", label: "Divider" },
  ].filter((item) =>
    item.label.toLowerCase().includes(insertFilter.trim().toLowerCase())
  );

  const slashOptions = [
    { key: "paragraph", label: "Text", hint: "Paragraf biasa" },
    { key: "h2", label: "Heading 2", hint: "Judul section" },
    { key: "h3", label: "Heading 3", hint: "Sub judul" },
    { key: "quote", label: "Quote", hint: "Kutipan" },
    { key: "bullet", label: "Bullet List", hint: "List poin" },
    { key: "ordered", label: "Numbered List", hint: "List angka" },
    { key: "task", label: "Checklist", hint: "Task list" },
    { key: "code", label: "Code Block", hint: "Blok kode" },
    { key: "divider", label: "Divider", hint: "Garis pemisah" },
    { key: "image_upload", label: "Image Upload", hint: "Upload gambar" },
    { key: "image_url", label: "Image URL", hint: "Masukkan URL gambar" },
  ].filter((item) => {
    const needle = slashFilter.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.label.toLowerCase().includes(needle) ||
      item.hint.toLowerCase().includes(needle)
    );
  });

  function runSlashCommand(key: string) {
    if (key === "image_upload") {
      document.getElementById("inline-editor-image-input")?.click();
      setShowSlashMenu(false);
      return;
    }

    if (key === "image_url") {
      addImageByUrl();
      return;
    }

    insertBlock(key);
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openSlashMenu();
      return;
    }

    if (showSlashMenu && e.key === "Escape") {
      e.preventDefault();
      setShowSlashMenu(false);
      return;
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    fd.set("slug", toSlug(slugValue));
    fd.set("content_html", editor?.getHTML() || "<p></p>");
    fd.set("content_json", JSON.stringify(editor?.getJSON() || {}));

    startTransition(async () => {
      const result = await onSave(fd);
      const { toast } = await import("sonner");
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Artikel diperbarui" : "Artikel dibuat", {
        description: isEdit
          ? "Perubahan artikel sudah tersimpan."
          : "Draft artikel baru sudah tersimpan.",
      });
      router.push("/admin/blog");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
            <SectionHeader title="Editor Artikel" subtitle="Layout dibuat lebih mirip workflow WordPress." />

            <div className="space-y-4">
              <input
                name="title"
                required
                value={titleValue}
                onChange={handleTitleChange}
                placeholder="Add title"
                className="w-full rounded-lg border border-navy-800 bg-navy-950 px-4 py-3 text-xl font-semibold text-slate-100 placeholder-slate-600 transition-colors focus:border-forest-700 focus:outline-none focus:ring-1 focus:ring-forest-700/30"
              />

              <input
                name="slug"
                required
                value={slugValue}
                onChange={handleSlugChange}
                placeholder="slug-artikel"
                className={`${inputClass} font-mono`}
              />

              {missingKeywordInSlug ? (
                <p className="-mt-2 text-xs text-red-300">
                  Focus keyword belum masuk ke slug. Disarankan slug mengandung
                  <span className="font-mono text-red-200"> {focusKeywordSlug}</span>.
                </p>
              ) : null}

              <textarea
                name="excerpt"
                rows={3}
                value={excerptValue}
                onChange={(e) => setExcerptValue(e.target.value)}
                placeholder="Enter excerpt here..."
                className={textareaClass}
              />

              <div className="mb-1 border-b border-navy-800 pb-3">
                <div className="mb-2 rounded-xl border border-navy-800 bg-navy-950 p-2">
                  <div className="flex flex-wrap items-center gap-2 border-b border-navy-800 pb-2">
                    <ToolbarIconButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
                      <span className="text-sm">↶</span>
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
                      <span className="text-sm">↷</span>
                    </ToolbarIconButton>

                    <div className="mx-1 h-6 w-px bg-navy-700" />

                    <ToolbarIconButton
                      label="Paragraph"
                      onClick={() => editor?.chain().focus().setParagraph().run()}
                      active={editor?.isActive("paragraph") ?? false}
                    >
                      ¶
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      label="Heading 2"
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                      active={editor?.isActive("heading", { level: 2 }) ?? false}
                    >
                      H2
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      label="Heading 3"
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                      active={editor?.isActive("heading", { level: 3 }) ?? false}
                    >
                      H3
                    </ToolbarIconButton>

                    <div className="mx-1 h-6 w-px bg-navy-700" />

                    <ToolbarIconButton label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold") ?? false}>B</ToolbarIconButton>
                    <ToolbarIconButton label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic") ?? false}><span className="italic">I</span></ToolbarIconButton>
                    <ToolbarIconButton label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline") ?? false}><span className="underline">U</span></ToolbarIconButton>
                    <ToolbarIconButton label="Strikethrough" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike") ?? false}><span className="line-through">S</span></ToolbarIconButton>
                    <ToolbarIconButton label="Inline Code" onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code") ?? false}>{"</>"}</ToolbarIconButton>
                    <ToolbarIconButton label="Subscript" onClick={() => editor?.chain().focus().toggleSubscript().run()} active={editor?.isActive("subscript") ?? false}><span className="text-[11px]">x₂</span></ToolbarIconButton>
                    <ToolbarIconButton label="Superscript" onClick={() => editor?.chain().focus().toggleSuperscript().run()} active={editor?.isActive("superscript") ?? false}><span className="text-[11px]">x²</span></ToolbarIconButton>
                    <ToolbarIconButton label="Highlight" onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight") ?? false}>🖍</ToolbarIconButton>

                    <div className="mx-1 h-6 w-px bg-navy-700" />

                    <ToolbarIconButton label="Bullet List" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList") ?? false}>••</ToolbarIconButton>
                    <ToolbarIconButton label="Ordered List" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList") ?? false}>1.</ToolbarIconButton>
                    <ToolbarIconButton label="Checklist" onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive("taskList") ?? false}>☑</ToolbarIconButton>
                    <ToolbarIconButton label="Blockquote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote") ?? false}>❝</ToolbarIconButton>
                    <ToolbarIconButton label="Code Block" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock") ?? false}>{"{ }"}</ToolbarIconButton>

                    <div className="mx-1 h-6 w-px bg-navy-700" />

                    <ToolbarIconButton label="Align Left" onClick={() => applyTextAlign("left")} active={editor?.isActive({ textAlign: "left" }) ?? false}>≡</ToolbarIconButton>
                    <ToolbarIconButton label="Align Center" onClick={() => applyTextAlign("center")} active={editor?.isActive({ textAlign: "center" }) ?? false}>≣</ToolbarIconButton>
                    <ToolbarIconButton label="Align Right" onClick={() => applyTextAlign("right")} active={editor?.isActive({ textAlign: "right" }) ?? false}>≡</ToolbarIconButton>
                    <ToolbarIconButton label="Justify" onClick={() => applyTextAlign("justify")} active={editor?.isActive({ textAlign: "justify" }) ?? false}>☰</ToolbarIconButton>

                    <div className="mx-1 h-6 w-px bg-navy-700" />

                    <ToolbarIconButton label="Link" onClick={addLink} active={editor?.isActive("link") ?? false}>🔗</ToolbarIconButton>
                    <ToolbarIconButton
                      label={isUploadingInlineImage ? "Uploading image" : "Upload image"}
                      onClick={() => document.getElementById("inline-editor-image-input")?.click()}
                      disabled={isUploadingInlineImage}
                    >
                      🖼
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Image URL" onClick={addImageByUrl}>🌐</ToolbarIconButton>
                    <ToolbarIconButton label="Reset formatting" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>⟲</ToolbarIconButton>
                  </div>

                  <div className="relative mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInsertMenu((v) => !v)}
                      className="rounded-lg border border-forest-700/50 bg-forest-700/10 px-3 py-1.5 text-xs font-medium text-forest-200 hover:bg-forest-700/20"
                    >
                      + Add Block
                    </button>

                    <p className="text-[11px] text-slate-500">
                      Shortcut: ketik <span className="text-slate-300">/</span> untuk slash command •
                      Ctrl+Shift+L/E/R/J (align) • Ctrl+, / Ctrl+. (sub/sup) • Ctrl+Shift+7/8/9 (list)
                    </p>

                    {showInsertMenu ? (
                      <div className="absolute left-0 top-10 z-30 w-72 rounded-xl border border-navy-700 bg-navy-950 p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)]">
                        <input
                          type="text"
                          value={insertFilter}
                          onChange={(e) => setInsertFilter(e.target.value)}
                          placeholder="Cari block..."
                          className="mb-2 w-full rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-xs text-slate-200"
                        />

                        <div className="max-h-56 overflow-auto space-y-1">
                          {insertOptions.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => insertBlock(option.key)}
                              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-slate-300 hover:bg-navy-800"
                            >
                              <span>{option.label}</span>
                              <span className="text-[10px] uppercase tracking-wide text-slate-500">Block</span>
                            </button>
                          ))}
                          {insertOptions.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-slate-500">Tidak ada block yang cocok.</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {showSlashMenu ? (
                  <div
                    className="fixed z-[70] w-80 rounded-xl border border-navy-700 bg-navy-950 p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)]"
                    style={{ top: slashPosition.top, left: Math.max(16, slashPosition.left - 8) }}
                  >
                    <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Slash Command</p>
                    <input
                      autoFocus
                      type="text"
                      value={slashFilter}
                      onChange={(e) => setSlashFilter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setShowSlashMenu(false);
                        }
                        if (e.key === "Enter" && slashOptions.length > 0) {
                          e.preventDefault();
                          runSlashCommand(slashOptions[0].key);
                        }
                      }}
                      placeholder="Cari command..."
                      className="mb-2 w-full rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-xs text-slate-200"
                    />
                    <div className="max-h-56 overflow-auto space-y-1">
                      {slashOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => runSlashCommand(option.key)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-slate-300 hover:bg-navy-800"
                        >
                          <span>{option.label}</span>
                          <span className="text-[10px] text-slate-500">{option.hint}</span>
                        </button>
                      ))}
                      {slashOptions.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-slate-500">Command tidak ditemukan.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <input
                  id="inline-editor-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onInlineImageInputChange}
                />
              </div>

              <div
                className="min-h-[420px] rounded-xl border border-navy-800 bg-gradient-to-b from-navy-950 to-[#14283b] text-sm text-slate-200 shadow-[0_18px_50px_-34px_rgba(5,12,20,0.9)] [&_.ProseMirror]:min-h-[380px] [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:mt-8 [&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:mt-6 [&_.tiptap_h3]:text-xl [&_.tiptap_p]:mb-4 [&_.tiptap_ul]:mb-4 [&_.tiptap_ul]:ml-6 [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:mb-4 [&_.tiptap_ol]:ml-6 [&_.tiptap_ol]:list-decimal [&_.tiptap_li]:mb-1 [&_.tiptap_blockquote]:my-4 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-forest-700 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:text-slate-300 [&_.tiptap_pre]:my-4 [&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:border [&_.tiptap_pre]:border-navy-800 [&_.tiptap_pre]:bg-[#0b1623] [&_.tiptap_pre]:p-4 [&_.tiptap_code]:rounded [&_.tiptap_code]:bg-navy-900 [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_hr]:my-7 [&_.tiptap_hr]:border-navy-700 [&_.tiptap_img]:my-4 [&_.tiptap_img]:rounded-xl [&_.tiptap_img]:border [&_.tiptap_img]:border-navy-800"
                onKeyDown={handleEditorKeyDown}
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            <input type="hidden" name="content_html" defaultValue="" />
            <input type="hidden" name="content_json" defaultValue="{}" />
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-5">
            <div className="mb-3 flex items-center justify-between border-b border-navy-800 pb-3">
              <p className="text-sm font-semibold text-slate-100">Yoast SEO</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="rounded-full border border-navy-700 px-2 py-0.5">SEO</span>
                <span className="rounded-full border border-navy-700 px-2 py-0.5">Readability</span>
                <span className="rounded-full border border-navy-700 px-2 py-0.5">Schema</span>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-navy-800 bg-navy-950 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Google Snippet Preview
              </p>
              <p className="line-clamp-2 text-[19px] leading-snug text-blue-300">{previewTitle}</p>
              <p className="mt-1 text-xs text-emerald-300/90">{previewUrlRaw}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{previewDescription}</p>
            </div>

            <div
              className={`mb-4 rounded-lg border p-4 ${
                seoChecks.tone === "green"
                  ? "border-forest-700/60 bg-forest-700/10"
                  : seoChecks.tone === "yellow"
                  ? "border-amber-700/60 bg-amber-700/10"
                  : "border-red-800/60 bg-red-900/20"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">SEO Score</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    seoChecks.tone === "green"
                      ? "bg-forest-700/30 text-forest-200"
                      : seoChecks.tone === "yellow"
                      ? "bg-amber-700/25 text-amber-200"
                      : "bg-red-800/40 text-red-200"
                  }`}
                >
                  {seoChecks.score}/100
                </span>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-navy-950">
                <div
                  className={`h-full transition-all duration-300 ${
                    seoChecks.tone === "green"
                      ? "bg-forest-500"
                      : seoChecks.tone === "yellow"
                      ? "bg-amber-400"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${seoChecks.score}%` }}
                />
              </div>

              <ul className="grid grid-cols-1 gap-1 text-xs text-slate-300 md:grid-cols-2">
                {seoChecks.checks.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span className={item.passed ? "text-forest-300" : "text-red-300"}>
                      {item.passed ? "✓" : "✗"}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Focus Keyword</label>
                <input
                  name="focus_keyword"
                  value={focusKeywordValue}
                  onChange={(e) => setFocusKeywordValue(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">SEO Keywords (pisah koma)</label>
                <input
                  name="seo_keywords"
                  defaultValue={(post?.seo_keywords ?? []).join(", ")}
                  placeholder="jasa website medan, jasa seo medan"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-400">SEO Title</label>
                <input
                  name="seo_title"
                  value={seoTitleValue}
                  onChange={(e) => setSeoTitleValue(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-400">SEO Description</label>
                <textarea
                  name="seo_description"
                  rows={3}
                  value={seoDescriptionValue}
                  onChange={(e) => setSeoDescriptionValue(e.target.value)}
                  className={textareaClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-400">Canonical URL</label>
                <input
                  name="canonical_url"
                  value={canonicalUrlValue}
                  onChange={(e) => setCanonicalUrlValue(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">OG Title</label>
                <input name="og_title" defaultValue={post?.og_title ?? ""} className={inputClass} />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">OG Image URL</label>
                <input name="og_image_url" defaultValue={post?.og_image_url ?? ""} className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-400">OG Description</label>
                <textarea
                  name="og_description"
                  rows={2}
                  defaultValue={post?.og_description ?? ""}
                  className={textareaClass}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="robots_index"
                  defaultChecked={post?.robots_index ?? true}
                  className="h-4 w-4 rounded border-navy-700 bg-navy-900 text-forest-500 focus:ring-forest-700"
                />
                Index halaman ini
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="robots_follow"
                  defaultChecked={post?.robots_follow ?? true}
                  className="h-4 w-4 rounded border-navy-700 bg-navy-900 text-forest-500 focus:ring-forest-700"
                />
                Follow link di halaman ini
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">Publish</p>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Status</label>
                <select
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <BlogDatePicker
                label="Publish Date"
                name="published_at"
                value={publishedDateValue}
                onChange={setPublishedDateValue}
              />

              <BlogDatePicker
                label="Schedule Date"
                name="scheduled_at"
                value={scheduledDateValue}
                onChange={setScheduledDateValue}
              />

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Penulis</label>
                <input
                  name="author_name"
                  defaultValue={post?.author_name ?? "Arif Jagad"}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 border-t border-navy-800 pt-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-lg bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : isEdit ? "Update" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin/blog")}
                  className="w-full rounded-lg border border-navy-700 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:border-navy-600 hover:text-slate-200"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">Taxonomies</p>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Kategori</label>
                <select name="category_id" defaultValue={post?.category_id ?? ""} className={inputClass}>
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">Tag</label>
                <div className="max-h-44 overflow-auto rounded-lg border border-navy-800 bg-navy-950 p-2">
                  {tags.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-slate-500">Belum ada tag.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {tags.map((tag) => (
                        <label key={tag.id} className="flex items-center gap-2 px-1 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            name="tag_ids"
                            value={tag.id}
                            defaultChecked={initialTagIds.has(tag.id)}
                            className="h-3.5 w-3.5 rounded border-navy-700 bg-navy-900 text-forest-500 focus:ring-forest-700"
                          />
                          <span>{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">Featured Image</p>

            <div className="space-y-3">
              <input name="featured_image" type="file" accept="image/*" className={inputClass} />
              <input type="hidden" name="existing_featured_image_path" value={post?.featured_image_path ?? ""} />
              <input type="hidden" name="existing_featured_image_url" value={post?.featured_image_url ?? ""} />

              {post?.featured_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.featured_image_url} alt="Featured" className="h-36 w-full rounded-lg border border-navy-800 object-cover" />
              ) : null}

              <input
                name="featured_image_alt"
                defaultValue={post?.featured_image_alt ?? ""}
                placeholder="Alt image"
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">Gallery</p>

            <div className="space-y-3">
              <input name="gallery_images" type="file" accept="image/*" multiple className={inputClass} />
              <p className="text-xs text-slate-600">Opsional: alt/caption untuk 3 file pertama.</p>

              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2 rounded-lg border border-navy-800 bg-navy-950 p-2">
                  <p className="text-[11px] font-medium text-slate-500">Gallery #{index + 1}</p>
                  <input name="gallery_alt" placeholder="Alt text" className={inputClass} />
                  <input name="gallery_caption" placeholder="Caption" className={inputClass} />
                </div>
              ))}

              {(post?.blog_post_images?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {post?.blog_post_images?.map((image) => (
                    <label key={image.id} className="block overflow-hidden rounded-lg border border-navy-800 bg-navy-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.image_url} alt={image.alt_text || "Gallery"} className="h-24 w-full object-cover" />
                      <div className="space-y-1 px-2 py-2">
                        <p className="truncate text-[10px] text-slate-500">{image.alt_text || "Tanpa alt"}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-300">
                          <input type="checkbox" name="delete_gallery_ids" value={image.id} />
                          Hapus image ini
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
