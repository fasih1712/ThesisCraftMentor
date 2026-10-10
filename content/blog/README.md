# Blog posts

Each post is two things:

1. An entry in `posts.json` with `slug`, `title`, `seoTitle`, `description`, `excerpt`, `tag`, `date` (YYYY-MM-DD) and `readTime` (minutes). Add new entries at the end.
2. `content/blog/<slug>.html`: the article body only, starting at the lede paragraph. The page shell, title, date line, breadcrumbs and "More from the blog" list are added by the build. Use the existing posts as the pattern: `.lede`, `.toc`, `h2` with ids, `.note`, `.table-wrap` tables, a FAQ section and a closing `.cta` section.

Then run:

```
node scripts/build-blog.mjs
```

This writes `blog/<slug>/index.html` for every post whose date has arrived (Pakistan time), removes pages for posts dated in the future, and regenerates `blog/index.html`, the three latest cards on the homepage and `sitemap.xml`. Commit the content and the generated files together.

## Scheduling

Posts go out on Mondays and Thursdays, one per day: the build refuses a future date that falls on any other day. A post dated in the future stays hidden. The deploy workflow runs every day at 05:30 Pakistan time and redeploys when a post is dated that day, so it goes live automatically.

Only link to posts that are already published, or the link will 404 until the other post's date.
