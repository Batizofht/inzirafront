const fs = require('fs/promises');
const path = require('path');
const { toUrlSlug } = require('./seo-utils');

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://inzira.co').replace(/\/$/, '');
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://api.inzira.co/api/v1').replace(/\/$/, '');

// Every URL is declared daily. lastmod is what Google actually weighs when
// deciding how often to come back, and it is set from real content timestamps
// below, but a uniform daily changefreq keeps the recrawl hint consistent
// across the whole site.
const CHANGEFREQ = 'daily';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0' },
  { path: '/explore', priority: '0.9' },
  { path: '/search', priority: '0.8' },
  // '/sell' is intentionally absent: it is a gated form that prerenders empty,
  // and scripts/finalize-web-build.js marks it noindex.
  { path: '/brands', priority: '0.7' },
  { path: '/services', priority: '0.7' },
  { path: '/about', priority: '0.6' },
  { path: '/contact', priority: '0.6' },
  { path: '/verification-process', priority: '0.5' },
  { path: '/buyer-protection', priority: '0.5' },
  { path: '/how-we-verify', priority: '0.5' },
  { path: '/insurance', priority: '0.5' },
  { path: '/safety', priority: '0.4' },
  { path: '/help', priority: '0.4' },
  { path: '/guidelines', priority: '0.3' },
  { path: '/careers', priority: '0.3' },
  { path: '/press', priority: '0.3' },
  { path: '/accessibility', priority: '0.2' },
  { path: '/privacy', priority: '0.2' },
  { path: '/terms', priority: '0.2' },
  { path: '/cookies', priority: '0.2' },
  // '/auth/*' is intentionally absent for the same reason as '/sell'.
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlNode({ loc, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${xmlEscape(lastmod)}</lastmod>` : null,
    `    <changefreq>${CHANGEFREQ}</changefreq>`,
    `    <priority>${xmlEscape(priority)}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function fetchActiveVehicles() {
  try {
    const response = await fetch(`${API_BASE}/vehicles?status=active`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const vehicles = payload?.data?.vehicles;
    return Array.isArray(vehicles) ? vehicles : [];
  } catch {
    return [];
  }
}

async function fetchActiveCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const categories = payload?.data?.categories;
    return Array.isArray(categories) ? categories.filter((c) => c.isActive !== false && c.slug) : [];
  } catch {
    return [];
  }
}

async function generateSitemap() {
  const [vehicles, categories] = await Promise.all([fetchActiveVehicles(), fetchActiveCategories()]);

  function toIso(value) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  // The newest listing timestamp is what makes the browse pages "change".
  // Without it Google has no signal that /, /explore or /search are worth
  // recrawling, no matter what changefreq claims.
  const newestListing = vehicles
    .map((vehicle) => toIso(vehicle?.updatedAt || vehicle?.createdAt))
    .filter(Boolean)
    .sort()
    .pop();

  const buildTime = new Date().toISOString();
  const LISTING_DRIVEN = new Set(['/', '/explore', '/search', '/brands']);

  const staticNodes = STATIC_ROUTES.map((route) =>
    buildUrlNode({
      loc: `${SITE_URL}${route.path}`,
      lastmod: LISTING_DRIVEN.has(route.path) ? newestListing || buildTime : buildTime,
      priority: route.priority,
    })
  );

  const vehicleNodes = vehicles
    .filter((vehicle) => vehicle?.id)
    .map((vehicle) => {
      return buildUrlNode({
        loc: `${SITE_URL}/vehicle/${vehicle.id}`,
        lastmod: toIso(vehicle.updatedAt || vehicle.createdAt) || buildTime,
        priority: '0.8',
      });
    });

  const categoryNodes = categories
    .filter((category) => category?.slug && toUrlSlug(category.slug))
    .map((category) => {
      return buildUrlNode({
        // Kebab slug, not the raw display name: the raw form contained a
        // space and was not a fetchable URL.
        loc: `${SITE_URL}/category/${toUrlSlug(category.slug)}`,
        lastmod: newestListing || toIso(category.updatedAt || category.createdAt) || buildTime,
        priority: '0.7',
      });
    });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticNodes,
    ...vehicleNodes,
    ...categoryNodes,
    '</urlset>',
    '',
  ].join('\n');

  // This runs after `expo export`, so writing only to public/ would ship the
  // previous build's sitemap — write straight into dist/ as well so the
  // deployed sitemap matches the pages that were actually just prerendered.
  const outputPaths = [
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'dist', 'sitemap.xml'),
  ];

  for (const outputPath of outputPaths) {
    try {
      await fs.writeFile(outputPath, xml, 'utf8');
      console.log(`Sitemap written: ${outputPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.warn(`Skipped (directory missing): ${outputPath}`);
    }
  }

  console.log(`Static URLs: ${staticNodes.length}, Vehicle URLs: ${vehicleNodes.length}, Category URLs: ${categoryNodes.length}`);
}

generateSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
