#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";

const args = parseArgs(process.argv.slice(2));
const input = args.input ?? args.i;
const outDir = args.out ?? "src/content/blog";
const redirectsPath = args.redirects ?? "public/_redirects";
const mappingPath = args.mapping ?? "redirects.mapping.json";

if (!input) {
  console.error("Usage: npm run migrate:blogger -- --input blogger-export.xml [--out src/content/blog]");
  process.exit(1);
}

const xml = await fs.readFile(input, "utf8");
const doc = new DOMParser().parseFromString(xml, "application/xml");
const entries = [...nodes(doc, "entry")];
const posts = entries
  .map(readEntry)
  .filter((entry) => entry.kind === "post" && entry.title && entry.content);

await fs.mkdir(outDir, { recursive: true });

const redirects = [];
for (const post of posts) {
  const datePrefix = post.date.slice(0, 10);
  const slug = post.slug || slugify(post.title);
  const fileName = `${datePrefix}-${slug}.md`;
  const destination = `/blog/${slug}/`;
  const markdown = toMarkdown(post, slug);

  await fs.writeFile(path.join(outDir, fileName), markdown, "utf8");

  if (post.originalUrl) {
    const oldPath = new URL(post.originalUrl).pathname;
    redirects.push({ from: oldPath, to: destination, status: 301, title: post.title });
  }
}

await fs.writeFile(
  mappingPath,
  `${JSON.stringify(redirects, null, 2)}\n`,
  "utf8"
);

if (redirects.length > 0) {
  const existing = await fs.readFile(redirectsPath, "utf8").catch(() => "");
  const generatedStart = "# BEGIN BLOGGER MIGRATION REDIRECTS";
  const generatedEnd = "# END BLOGGER MIGRATION REDIRECTS";
  const generated = [
    generatedStart,
    ...redirects.map((redirect) => `${redirect.from}  ${redirect.to}  ${redirect.status}`),
    generatedEnd
  ].join("\n");
  const next = existing.includes(generatedStart)
    ? existing.replace(new RegExp(`${generatedStart}[\\s\\S]*${generatedEnd}`), generated)
    : `${existing.trim()}\n\n${generated}\n`;
  await fs.writeFile(redirectsPath, next.trimStart(), "utf8");
}

console.log(`Migrated ${posts.length} posts to ${outDir}`);
console.log(`Wrote ${redirects.length} redirects to ${mappingPath}`);

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=");
    parsed[key] = inlineValue ?? rawArgs[index + 1];
    if (!inlineValue) index += 1;
  }
  return parsed;
}

function readEntry(entry) {
  const title = text(entry, "title").trim();
  const content = text(entry, "content").trim();
  const published = text(entry, "published") || text(entry, "updated");
  const metaDescription = text(entry, "blogger:metaDescription").trim();
  const type = text(entry, "blogger:type").trim().toUpperCase();
  const bloggerStatus = text(entry, "blogger:status").trim().toUpperCase();
  const bloggerFilename = text(entry, "blogger:filename").trim();
  const labels = [...nodes(entry, "category")]
    .map((node) => node.getAttribute("term"))
    .filter(Boolean)
    .filter((term) => !term.includes("#"));
  const alternate = [...nodes(entry, "link")].find((link) => link.getAttribute("rel") === "alternate");
  const alternateUrl = alternate?.getAttribute("href") ?? "";
  const originalUrl = alternateUrl || (bloggerFilename ? `https://www.thetechteacher.co.za${bloggerFilename}` : "");
  const status = text(entry, "app:draft") === "yes" || bloggerStatus === "DRAFT" ? "draft" : "published";
  const kind = type === "POST" || [...nodes(entry, "category")].some((node) => node.getAttribute("term")?.includes("#post"))
    ? "post"
    : "other";

  return {
    kind,
    title,
    content,
    date: published ? new Date(published).toISOString() : new Date().toISOString(),
    tags: labels,
    description: metaDescription || excerpt(stripHtml(content)),
    draft: status === "draft",
    originalUrl,
    slug: slugFromUrl(originalUrl)
  };
}

function toMarkdown(post, slug) {
  const frontmatter = [
    "---",
    `title: ${yamlString(post.title)}`,
    `date: ${post.date.slice(0, 10)}`,
    `slug: ${yamlString(slug)}`,
    `category: ${yamlString(inferCategory(post))}`,
    `tags: ${yamlArray(post.tags)}`,
    `description: ${yamlString(post.description)}`,
    `draft: ${post.draft}`,
    post.originalUrl ? `originalUrl: ${yamlString(post.originalUrl)}` : "",
    "---"
  ].filter(Boolean);

  return `${frontmatter.join("\n")}\n\n${htmlToMarkdown(post.content).trim()}\n`;
}

function nodes(parent, tagName) {
  return Array.from(parent.getElementsByTagName(tagName));
}

function text(parent, tagName) {
  return parent.getElementsByTagName(tagName)[0]?.textContent ?? "";
}

function slugFromUrl(url) {
  if (!url) return "";
  const base = path.basename(new URL(url).pathname).replace(/\.html?$/, "");
  return slugify(base);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function stripHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value) {
  if (value.length <= 155) return value;
  return `${value.slice(0, 152).trim()}...`;
}

function htmlToMarkdown(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<h2[^>]*>/gi, "## ")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<h3[^>]*>/gi, "### ")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gis, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gis, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gis, "_$1_")
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis, "[$2]($1)")
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gis, "\n\n![]($1)\n\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function yamlString(value) {
  return JSON.stringify(value ?? "");
}

function yamlArray(values) {
  if (!values.length) return "[]";
  return `\n${values.map((value) => `  - ${yamlString(value)}`).join("\n")}`;
}

function inferCategory(post) {
  const titleAndTags = ` ${post.title} ${post.tags.join(" ")} `.toLowerCase();
  const haystack = `${titleAndTags} ${stripHtml(post.content)}`.toLowerCase();
  if (matches(haystack, ["chatgpt", " ai ", "artificial intelligence", "generative ai", "ai literacy", "ai policy"])) {
    return "AI";
  }
  if (matches(haystack, ["leadership", "training", "change", "school strategy", "professional development", "staff buy-in", "digital transformation"])) {
    return "Leadership";
  }
  if (matches(titleAndTags, ["parents", "parent", "social media", "online safety", "digital wellbeing", "children and devices", "kids and tech", "little kids and tech"])) {
    return "Parents";
  }
  if (matches(haystack, ["edtech", "tech", "apple", "google", "ipad", "apps", "notebooklm", "copilot", "classroom", "device"])) {
    return "Technology";
  }
  return "Technology";
}

function matches(value, terms) {
  return terms.some((term) => value.includes(term));
}
