/**
 * Audits the LIVE site the way a crawler sees it, and exits non-zero on failure.
 *
 * Every problem this catches was live on inzira.co for two weeks without any
 * visible symptom: pages returned 200, the sitemap was submitted, and nothing
 * indexed. Run it after every deploy.
 *
 *   npm run verify:seo
 *   npm run verify:seo -- https://deploy-preview-12--inzira.netlify.app
 *
 * Checks, per sitemap URL:
 *   - 200 with no redirect (a sitemap URL that redirects is not indexable as-is)
 *   - self-referencing canonical (a canonical pointing elsewhere de-indexes it)
 *   - no noindex on a URL we are actively submitting
 *   - enough rendered text that it is not a soft-404
 *   - exactly one <h1>
 */
const fs = require('fs/promises');
const path = require('path');

const SITE_URL = (process.argv[2] || process.env.EXPO_PUBLIC_SITE_URL || 'https://inzira.co').replace(/\/$/, '');

// Below this, Google treats a page as thin or as a soft 404. Browse pages that
// are legitimately short still clear it once the listing index is injected.
const MIN_TEXT_CHARS = 150;
const CONCURRENCY = 6;

function visibleText(html) {
  const body = html.split(/<\/head>/i)[1] || html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(html, re) {
  const match = html.match(re);
  return match ? match[1].trim() : null;
}

async function checkUrl(url) {
  const problems = [];

  let response;
  try {
    response = await fetch(url, { redirect: 'manual' });
  } catch (error) {
    return { url, problems: [`request failed: ${error.message}`] };
  }

  if (response.status >= 300 && response.status < 400) {
    const target = response.headers.get('location');
    problems.push(`sitemap URL redirects (${response.status} -> ${target})`);
    return { url, problems };
  }

  if (response.status !== 200) {
    problems.push(`status ${response.status}`);
    return { url, problems };
  }

  const robotsHeader = response.headers.get('x-robots-tag');
  if (robotsHeader && /noindex/i.test(robotsHeader)) {
    problems.push(`X-Robots-Tag: ${robotsHeader}`);
  }

  const html = await response.text();
  const head = html.split(/<\/head>/i)[0] || '';

  const robotsMeta = attr(head, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    problems.push(`noindex on a submitted URL (robots: ${robotsMeta})`);
  }

  const canonical = attr(head, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonical) {
    problems.push('no canonical tag');
  } else if (canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
    problems.push(`canonical points elsewhere: ${canonical}`);
  }

  const title = attr(head, /<title>([\s\S]*?)<\/title>/i);
  if (!title) problems.push('no <title>');

  const text = visibleText(html);
  if (text.length < MIN_TEXT_CHARS) {
    problems.push(`only ${text.length} chars of rendered text (crawlers see a blank page)`);
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) problems.push('no <h1>');
  else if (h1Count > 1) problems.push(`${h1Count} <h1> tags`);

  return { url, problems, text: text.length, title };
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  console.log(`Auditing ${sitemapUrl}\n`);

  let xml;
  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) throw new Error(`status ${response.status}`);
    xml = await response.text();
  } catch (error) {
    // Fall back to the local build so this is usable before the first deploy.
    console.warn(`  live sitemap unavailable (${error.message}), using dist/sitemap.xml\n`);
    xml = await fs.readFile(path.join(process.cwd(), 'dist', 'sitemap.xml'), 'utf8');
  }

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) {
    console.error('Sitemap contained no URLs.');
    process.exit(1);
  }

  const results = await mapLimit(urls, CONCURRENCY, checkUrl);
  const failed = results.filter((r) => r.problems.length > 0);

  for (const result of results) {
    if (result.problems.length === 0) {
      console.log(`  OK    ${result.url}  (${result.text} chars)`);
    } else {
      console.log(`  FAIL  ${result.url}`);
      for (const problem of result.problems) console.log(`          - ${problem}`);
    }
  }

  console.log(`\n${results.length - failed.length}/${results.length} URLs indexable.`);

  if (failed.length > 0) {
    console.error(`${failed.length} URL(s) would not be indexed. Fix before submitting to Search Console.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Audit failed:', error);
  process.exit(1);
});
