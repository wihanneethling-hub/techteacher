#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const postsDir = process.argv[2] ?? "src/content/blog";
const files = (await fs.readdir(postsDir))
  .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
  .sort();

const counts = new Map();
for (const file of files) {
  const fullPath = path.join(postsDir, file);
  const source = await fs.readFile(fullPath, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) continue;

  const frontmatter = match[1];
  const body = source.slice(match[0].length);
  const category = inferCategory(frontmatter, body);
  const nextFrontmatter = frontmatter.includes("\ncategory:")
    ? frontmatter.replace(/\ncategory:\s*"?[^"\n]+"?/, `\ncategory: "${category}"`)
    : insertCategory(frontmatter, category);

  await fs.writeFile(fullPath, `---\n${nextFrontmatter}\n---\n\n${body.trimStart()}`, "utf8");
  counts.set(category, (counts.get(category) ?? 0) + 1);
}

console.log(`Assigned categories for ${files.length} posts.`);
for (const [category, count] of [...counts.entries()].sort()) {
  console.log(`${category}: ${count}`);
}

function insertCategory(frontmatter, category) {
  if (frontmatter.includes("\nslug:")) {
    return frontmatter.replace(/(\nslug:.*)/, `$1\ncategory: "${category}"`);
  }
  if (frontmatter.includes("\ndate:")) {
    return frontmatter.replace(/(\ndate:.*)/, `$1\ncategory: "${category}"`);
  }
  return `${frontmatter}\ncategory: "${category}"`;
}

function inferCategory(frontmatter, body) {
  const title = readScalar(frontmatter, "title");
  const tags = readTags(frontmatter);
  const titleAndTags = ` ${title} ${tags.join(" ")} `.toLowerCase();
  const haystack = `${titleAndTags} ${body.replace(/<[^>]*>/g, " ")} `.toLowerCase();

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

function readScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].replace(/^["']|["']$/g, "") : "";
}

function readTags(frontmatter) {
  const match = frontmatter.match(/^tags:\s*(?:\n([\s\S]*?))?(?=\n[a-zA-Z][\w-]*:|$)/m);
  if (!match) return [];
  return (match[1] ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

function matches(value, terms) {
  return terms.some((term) => value.includes(term));
}
