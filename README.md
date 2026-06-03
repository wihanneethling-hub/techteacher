# The Tech Teacher

Modern static rebuild of `thetechteacher.co.za` using Astro and Markdown content.

## What is included

- Astro static site with MDX support
- Markdown blog collection in `src/content/blog`
- Home, category, archive, post, about, search, and contact sections
- Responsive education technology design
- Blogger XML migration script
- Cloudflare Pages and Netlify-friendly redirects via `public/_redirects`

## Local setup

```bash
npm install
npm run dev
```

Astro will print a local URL, usually `http://localhost:4321`.

## Add or edit posts

Create Markdown or MDX files in `src/content/blog`.

```md
---
title: "Post title"
date: 2026-06-03
category: "Technology"
description: "Short summary for archives and SEO."
tags:
  - Education Technology
draft: false
originalUrl: "https://www.thetechteacher.co.za/old-url.html"
---

Write the post here.
```

`category` must be one of:

- `AI`
- `Technology`
- `Leadership`
- `Parents`

Tags can still be specific and descriptive. They are used for search and small post filters, not as the main public navigation.

Set `draft: true` to keep a post out of production pages.

To re-run category inference across existing imported posts:

```bash
npm run assign:categories
```

## Migrate from Blogger XML

Place your Blogger export file anywhere inside the project, for example:

```bash
mkdir -p work/migration
cp ~/Downloads/blog-export.xml work/migration/blogger-export.xml
```

Run:

```bash
npm run migrate:blogger -- --input work/migration/blogger-export.xml
```

The script will:

- Convert Blogger posts into Markdown files in `src/content/blog`
- Preserve title, date, tags, description, draft status, original URL, and inferred category
- Create `redirects.mapping.json`
- Update `public/_redirects` with old Blogger paths mapped to new `/blog/.../` URLs

After migration, review a few posts manually. Blogger exports can contain old widgets, image markup, and formatting quirks that are worth tidying by hand.

## Build

```bash
npm run build
```

The production site is generated in `dist`.

## Deploy to Cloudflare Pages

1. Push this project to GitHub or GitLab.
2. Create a Cloudflare Pages project from the repo.
3. Use these settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20` or newer
4. Add the custom domain `thetechteacher.co.za` in Cloudflare Pages.

Cloudflare Pages reads `public/_redirects` during the build.

## Deploy to Netlify

1. Push this project to GitHub or GitLab.
2. Create a Netlify site from the repo.
3. Netlify will read `netlify.toml`, or use:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20` or newer
4. Add the custom domain `thetechteacher.co.za`.

Netlify also supports the generated `public/_redirects` file.
