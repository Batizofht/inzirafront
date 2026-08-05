/**
 * Tells search engines the site changed, at the end of every deploy.
 *
 * A sitemap only gets re-read when a crawler decides to come back. IndexNow
 * inverts that: it pushes the changed URLs and Bing/Yandex/Seznam/Naver fetch
 * them within minutes. Google does not consume IndexNow, so for Google this
 * leans on the freshly written lastmod values plus whatever crawl rate the
 * domain has earned — it is the honest limit on how fast new listings appear
 * there.
 *
 * Never fails a build: search engines being down is not a deploy problem.
 */
const fs = require('fs/promises');
const path = require('path');

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://inzira.co').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'd7b376321cac9800bf70b293f66279a5';
const HOST = new URL(SITE_URL).host;

// IndexNow is a shared protocol — submitting to one endpoint propagates to the
// other participating engines, but hitting two adds redundancy for free.
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
];

const MAX_URLS_PER_REQUEST = 10000;

async function readSitemapUrls() {
  const sitemapPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
  const xml = await fs.readFile(sitemapPath, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

async function verifyKeyFile() {
  const keyUrl = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
  try {
    const response = await fetch(keyUrl);
    if (!response.ok) {
      console.warn(`  ! key file not reachable yet (${response.status}): ${keyUrl}`);
      console.warn('    IndexNow will reject submissions until this deploy is live.');
      return false;
    }
    const body = (await response.text()).trim();
    if (body !== INDEXNOW_KEY) {
      console.warn(`  ! key file contents do not match INDEXNOW_KEY: ${keyUrl}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`  ! could not verify key file: ${error.message}`);
    return false;
  }
}

async function submitToIndexNow(urls) {
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, MAX_URLS_PER_REQUEST),
  };

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });
      // 200 accepted, 202 accepted but key still validating.
      console.log(`  ${endpoint} -> ${response.status}`);
    } catch (error) {
      console.warn(`  ${endpoint} -> failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log('Notifying search engines...');

  let urls;
  try {
    urls = await readSitemapUrls();
  } catch (error) {
    console.warn(`  ! no sitemap to submit: ${error.message}`);
    return;
  }

  if (urls.length === 0) {
    console.warn('  ! sitemap contained no URLs, nothing to submit');
    return;
  }

  console.log(`  ${urls.length} URLs from dist/sitemap.xml`);
  await verifyKeyFile();
  await submitToIndexNow(urls);
  console.log('Done.');
}

main().catch((error) => {
  console.warn('Search engine ping failed (ignored):', error.message);
});
