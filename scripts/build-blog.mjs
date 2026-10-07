// Builds the blog from content/blog/posts.json and content/blog/<slug>.html.
//
// Writes blog/<slug>/index.html for every post whose date has arrived (Pakistan time),
// deletes the folder of any post that is still scheduled, and regenerates blog/index.html,
// the latest-posts cards on the homepage and sitemap.xml.
//
//   node scripts/build-blog.mjs                    build for today
//   node scripts/build-blog.mjs --today=2026-10-12 build as if it were that date
//   node scripts/build-blog.mjs --due              print due=true if a post is scheduled for today, build nothing
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SITE = 'https://thesiscraftmentors.com';
const r = p => path.join(ROOT, p);

const arg = name => process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
const today = arg('today')?.split('=')[1]
  || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

const posts = JSON.parse(fs.readFileSync(r('content/blog/posts.json'), 'utf8'));
for (const p of posts) {
  for (const k of ['slug', 'title', 'seoTitle', 'description', 'excerpt', 'tag', 'date', 'readTime']) {
    if (!p[k]) throw new Error(`posts.json: "${p.slug || '?'}" is missing ${k}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error(`posts.json: "${p.slug}" has a bad date ${p.date}`);
  if (!fs.existsSync(r(`content/blog/${p.slug}.html`))) throw new Error(`missing content/blog/${p.slug}.html`);
}

if (arg('due')) {
  console.log(`due=${posts.some(p => p.date === today)}`);
  process.exit(0);
}

// newest first; posts sharing a date keep the newest-added first
const published = posts
  .map((p, i) => ({ ...p, i }))
  .filter(p => p.date <= today)
  .sort((a, b) => b.date.localeCompare(a.date) || b.i - a.i);
const scheduled = posts.filter(p => p.date > today);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = o => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = d => { const [y, m, day] = d.split('-'); return `${+day} ${MONTHS[m - 1]} ${y}`; };
const shortDate = d => { const [y, m, day] = d.split('-'); return `${+day} ${MONTHS[m - 1].slice(0, 3)} ${y}`; };
const daysOld = d => (Date.parse(today) - Date.parse(d)) / 864e5;
const url = slug => `${SITE}/blog/${slug}/`;

const template = fs.readFileSync(r('scripts/post-template.html'), 'utf8');
const page = vals => template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in vals)) throw new Error(`template value ${k} not provided`);
  return vals[k];
});
const org = { '@type': 'Organization', name: 'Thesis Craft Mentors', url: `${SITE}/` };
const crumbs = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
});

// post pages
for (const p of published) {
  const body = fs.readFileSync(r(`content/blog/${p.slug}.html`), 'utf8').trimEnd();
  const related = published.filter(o => o.slug !== p.slug).slice(0, 3)
    .map(o => `      <li><a href="/blog/${o.slug}/">${esc(o.title)}</a></li>`).join('\n');
  const main = `<article>
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a></nav>
  <h1>${esc(p.title)}</h1>
  <p class="meta">By Thesis Craft Mentors &middot; <time datetime="${p.date}">${longDate(p.date)}</time> &middot; ${p.readTime} min read</p>

${body}
${related ? `  <aside class="related">
    <strong>More from the blog</strong>
    <ul>
${related}
    </ul>
  </aside>
` : ''}</article>`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        image: `${SITE}/assets/logo.png`,
        datePublished: p.date,
        dateModified: p.updated || p.date,
        author: org,
        publisher: { '@type': 'Organization', name: 'Thesis Craft Mentors', logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo.png` } },
        mainEntityOfPage: url(p.slug),
      },
      crumbs([['Home', `${SITE}/`], ['Blog', `${SITE}/blog/`], [p.title, url(p.slug)]]),
    ],
  };
  fs.mkdirSync(r(`blog/${p.slug}`), { recursive: true });
  fs.writeFileSync(r(`blog/${p.slug}/index.html`), page({
    SEO_TITLE: `${esc(p.seoTitle)} | Thesis Craft Mentors`,
    DESCRIPTION: esc(p.description),
    URL: url(p.slug),
    OG_TYPE: 'article',
    TITLE: esc(p.title),
    JSONLD: json(ld),
    MAIN: main,
  }));
}

// scheduled posts must not be served before their date
for (const p of scheduled) fs.rmSync(r(`blog/${p.slug}`), { recursive: true, force: true });

// blog index
const cards = published.map(p => `    <a class="post-card" href="/blog/${p.slug}/">
      <span class="tag">${esc(p.tag)}</span>
      <h2>${esc(p.title)}${daysOld(p.date) < 7 ? '<span class="new">NEW</span>' : ''}</h2>
      <p>${esc(p.excerpt)}</p>
      <span class="post-meta"><time datetime="${p.date}">${shortDate(p.date)}</time> &middot; ${p.readTime} min read</span>
    </a>`).join('\n');
const indexDesc = 'Free, practical guides from Thesis Craft Mentors on choosing a topic, writing proposals, literature reviews, methodology, referencing and every other stage of your thesis.';
fs.writeFileSync(r('blog/index.html'), page({
  SEO_TITLE: 'Blog: Free Thesis and Dissertation Writing Guides | Thesis Craft Mentors',
  DESCRIPTION: esc(indexDesc),
  URL: `${SITE}/blog/`,
  OG_TYPE: 'website',
  TITLE: 'Free guides for thesis writers',
  JSONLD: json({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        name: 'Thesis Craft Mentors Blog',
        url: `${SITE}/blog/`,
        description: indexDesc,
        publisher: org,
        blogPost: published.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: url(p.slug), datePublished: p.date })),
      },
      crumbs([['Home', `${SITE}/`], ['Blog', `${SITE}/blog/`]]),
    ],
  }),
  MAIN: `<section class="blog-index">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / Blog</nav>
  <h1>Free guides for thesis writers</h1>
  <p>Practical, step-by-step advice from our mentors on every stage of your thesis. New guides every week.</p>
  <div class="post-list">
${cards}
  </div>
</section>`,
}));

// homepage: latest three
const homeFile = r('index.html');
const home = fs.readFileSync(homeFile, 'utf8');
const latest = published.slice(0, 3).map(p => `        <a class="post-card reveal" href="/blog/${p.slug}/">
          <span class="tag">${esc(p.tag)}</span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt)}</p>
          <span class="post-meta"><time datetime="${p.date}">${shortDate(p.date)}</time> &middot; ${p.readTime} min read</span>
          <span class="read-more">Read the guide &rarr;</span>
        </a>`).join('\n');
const start = '<!-- blog:latest:start -->\n', end = '<!-- blog:latest:end -->';
const a = home.indexOf(start), b = home.indexOf(end);
if (a < 0 || b < a) throw new Error('index.html: blog:latest markers not found');
fs.writeFileSync(homeFile, home.slice(0, a + start.length) + latest + '\n' + home.slice(b));

// sitemap
const newest = published[0]?.date || today;
const entry = (loc, lastmod) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
fs.writeFileSync(r('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[entry(`${SITE}/`, newest), entry(`${SITE}/blog/`, newest), ...published.map(p => entry(url(p.slug), p.updated || p.date))].join('\n')}
</urlset>
`);

console.log(`today ${today}: ${published.length} published, ${scheduled.length} scheduled`
  + (scheduled.length ? ` (${scheduled.map(p => `${p.slug} on ${p.date}`).join(', ')})` : ''));
