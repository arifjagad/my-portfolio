const GITHUB_USERNAME = "arifjagad";
const BASE = "https://api.github.com";

export type PinnedRepo = {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
};

export type GithubStats = {
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  totalCommits: number;
  contributionsLastYear: number;
  pinnedRepos: PinnedRepo[];
};

export async function getGithubStats(): Promise<GithubStats> {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`${BASE}/users/${GITHUB_USERNAME}`, {
        next: { revalidate: 3600 },
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      }),
      fetch(`${BASE}/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, {
        next: { revalidate: 3600 },
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      }),
    ]);

    if (!userRes.ok || !reposRes.ok) throw new Error("GitHub API error");

    const user = await userRes.json();
    const repos: Array<{
      name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      fork: boolean;
    }> = await reposRes.json();

    // ── Total Stars ──────────────────────────────────────────
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    // ── Top Languages ────────────────────────────────────────
    const languageCounts = repos
      .map((r) => r.language)
      .filter(Boolean)
      .reduce((acc: Record<string, number>, lang) => {
        acc[lang!] = (acc[lang!] || 0) + 1;
        return acc;
      }, {});

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([lang]) => lang);

    // ── Total Commits (GitHub Search API) ───────────────────
    // Catatan: Search API membatasi tanpa token, tapi tetap berfungsi
    let totalCommits = 0;
    try {
      const commitRes = await fetch(
        `${BASE}/search/commits?q=author:${GITHUB_USERNAME}&per_page=1`,
        {
          next: { revalidate: 3600 },
          headers: {
            Accept: "application/vnd.github.cloak-preview+json",
            ...(process.env.GITHUB_TOKEN
              ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
              : {}),
          },
        }
      );
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        totalCommits = commitData.total_count ?? 0;
      }
    } catch {
      totalCommits = 0;
    }

    // ── Contributions Last Year (GitHub GraphQL) ─────────────
    // Membutuhkan GITHUB_TOKEN agar bekerja
    let contributionsLastYear = 0;
    if (process.env.GITHUB_TOKEN) {
      try {
        const gqlRes = await fetch("https://api.github.com/graphql", {
          method: "POST",
          next: { revalidate: 3600 },
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `{
              user(login: "${GITHUB_USERNAME}") {
                contributionsCollection {
                  contributionCalendar {
                    totalContributions
                  }
                }
              }
            }`,
          }),
        });
        if (gqlRes.ok) {
          const gqlData = await gqlRes.json();
          contributionsLastYear =
            gqlData?.data?.user?.contributionsCollection?.contributionCalendar
              ?.totalContributions ?? 0;
        }
      } catch {
        contributionsLastYear = 0;
      }
    }

    // ── Pinned / Featured Repos ──────────────────────────────
    // Ambil 6 repo non-fork terbaru sebagai pseudo-pinned (tanpa GraphQL token)
    // Jika ada GITHUB_TOKEN, bisa pakai GraphQL pinnedItems
    let pinnedRepos: PinnedRepo[] = [];

    if (process.env.GITHUB_TOKEN) {
      try {
        const pinnedRes = await fetch("https://api.github.com/graphql", {
          method: "POST",
          next: { revalidate: 3600 },
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `{
              user(login: "${GITHUB_USERNAME}") {
                pinnedItems(first: 3, types: REPOSITORY) {
                  nodes {
                    ... on Repository {
                      name
                      description
                      url
                      primaryLanguage { name }
                      stargazerCount
                      forkCount
                    }
                  }
                }
              }
            }`,
          }),
        });
        if (pinnedRes.ok) {
          const pinnedData = await pinnedRes.json();
          const nodes = pinnedData?.data?.user?.pinnedItems?.nodes ?? [];
          pinnedRepos = nodes.map(
            (n: {
              name: string;
              description: string | null;
              url: string;
              primaryLanguage: { name: string } | null;
              stargazerCount: number;
              forkCount: number;
            }) => ({
              name: n.name,
              description: n.description,
              url: n.url,
              language: n.primaryLanguage?.name ?? null,
              stars: n.stargazerCount,
              forks: n.forkCount,
            })
          );
        }
      } catch {
        pinnedRepos = [];
      }
    }

    // Fallback: jika tidak ada token, pakai 6 repo non-fork terbaru
    if (pinnedRepos.length === 0) {
      pinnedRepos = repos
        .filter((r) => !r.fork)
        .slice(0, 3)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.html_url,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
        }));
    }

    return {
      publicRepos: user.public_repos as number,
      followers: user.followers as number,
      totalStars,
      topLanguages,
      totalCommits,
      contributionsLastYear,
      pinnedRepos,
    };
  } catch {
    return {
      publicRepos: 0,
      followers: 0,
      totalStars: 0,
      topLanguages: ["TypeScript", "JavaScript", "PHP"],
      totalCommits: 0,
      contributionsLastYear: 0,
      pinnedRepos: [],
    };
  }
}
