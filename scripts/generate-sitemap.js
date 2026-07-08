const fs = require('fs/promises');
const path = require('path');

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://inzira.co').replace(/\/$/, '');
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://api.inzira.co/api/v1').replace(/\/$/, '');

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/explore', changefreq: 'hourly', priority: '0.9' },
  { path: '/search', changefreq: 'daily', priority: '0.8' },
  { path: '/sell', changefreq: 'weekly', priority: '0.8' },
  { path: '/services', changefreq: 'monthly', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/auth/login', changefreq: 'yearly', priority: '0.3' },
  { path: '/auth/register', changefreq: 'yearly', priority: '0.3' },
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrlNode({ loc, changefreq, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${xmlEscape(lastmod)}</lastmod>` : null,
    `    <changefreq>${xmlEscape(changefreq)}</changefreq>`,
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
  const staticNodes = STATIC_ROUTES.map((route) =>
    buildUrlNode({
      loc: `${SITE_URL}${route.path}`,
      changefreq: route.changefreq,
      priority: route.priority,
    })
  );

  const [vehicles, categories] = await Promise.all([fetchActiveVehicles(), fetchActiveCategories()]);

  const vehicleNodes = vehicles
    .filter((vehicle) => vehicle?.id)
    .map((vehicle) => {
      const lastmodRaw = vehicle.updatedAt || vehicle.createdAt;
      const lastmod = lastmodRaw ? new Date(lastmodRaw).toISOString() : undefined;
      return buildUrlNode({
        loc: `${SITE_URL}/vehicle/${vehicle.id}`,
        lastmod,
        changefreq: 'daily',
        priority: '0.8',
      });
    });

  const categoryNodes = categories
    .filter((category) => category?.slug)
    .map((category) => {
      const lastmodRaw = category.updatedAt || category.createdAt;
      const lastmod = lastmodRaw ? new Date(lastmodRaw).toISOString() : undefined;
      return buildUrlNode({
        loc: `${SITE_URL}/category/${category.slug}`,
        lastmod,
        changefreq: 'weekly',
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

  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  await fs.writeFile(outputPath, xml, 'utf8');

  console.log(`Sitemap written: ${outputPath}`);
  console.log(`Static URLs: ${staticNodes.length}, Vehicle URLs: ${vehicleNodes.length}, Category URLs: ${categoryNodes.length}`);
}

generateSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
