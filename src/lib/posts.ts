import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export const categories = [
  {
    name: "AI",
    slug: "ai",
    description:
      "AI in education, ChatGPT, generative tools, AI literacy, policy, and classroom impact."
  },
  {
    name: "Technology",
    slug: "technology",
    description:
      "Practical classroom technology, device programmes, app workflows, and useful teacher tools."
  },
  {
    name: "Leadership",
    slug: "leadership",
    description:
      "School strategy, digital transformation, staff buy-in, professional development, and change."
  },
  {
    name: "Parents",
    slug: "parents",
    description:
      "Guidance for families on devices, social media, digital wellbeing, online safety, and AI at home."
  }
] as const;

export type CategoryName = (typeof categories)[number]["name"];

export async function getPublishedPosts() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getPostsByCategory(category: CategoryName) {
  return (await getPublishedPosts()).filter((post) => post.data.category === category);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getCategoryUrl(category: CategoryName) {
  return `/${category.toLowerCase()}/`;
}

export async function getTagCounts() {
  const counts = new Map<string, number>();
  for (const post of await getPublishedPosts()) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function getPostSlug(post: CollectionEntry<"blog">) {
  return post.id.replace(/\.(md|mdx)$/, "");
}

export function getPostUrl(post: CollectionEntry<"blog">) {
  return `/blog/${getPostSlug(post)}/`;
}

export function getTagUrl(tag: string) {
  return `/search/?tag=${encodeURIComponent(tag)}`;
}
