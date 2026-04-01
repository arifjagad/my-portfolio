export const SITE_NAME = "Arif Jagad";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://arifjagad.my.id";

export function absoluteUrl(path: string = "/"): string {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}
