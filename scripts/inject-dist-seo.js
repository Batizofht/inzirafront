const fs = require('fs/promises');
const path = require('path');

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || 'https://inzira.co').replace(/\/$/, '');
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://api.inzira.co/api/v1').replace(/\/$/, '');
const DIST_DIR = path.join(process.cwd(), 'dist');
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const DEFAULT_META = {
  title: "Inzira - Rwanda's #1 Verified Car Marketplace",
  description:
    'Buy and sell cars, motorcycles, and vehicles in Rwanda. Browse verified listings from trusted sellers. Find your dream vehicle today!',
  keywords:
    'cars rwanda, buy car rwanda, sell car rwanda, vehicle marketplace, used cars, new cars, motorcycles, car dealer',
  author: 'Inzira',
  type: 'website',
  robots: 'index, follow',
  image: DEFAULT_IMAGE,
};

const ROUTE_OVERRIDES = {
  '/': {
    title: "Inzira - Rwanda's #1 Verified Car Marketplace",
    description:
      'Buy and sell cars, motorcycles, and vehicles in Rwanda. Browse verified listings from trusted sellers. Find your dream vehicle today!',
    keywords:
      'cars rwanda, buy car rwanda, sell car rwanda, vehicle marketplace, used cars, new cars, motorcycles, car dealer, Kigali',
  },
  '/explore': {
    title: 'Explore Vehicles - Browse Cars, Motorcycles & More | Inzira',
    description:
      'Explore thousands of verified vehicle listings in Rwanda. Filter by category, price, brand, and location to find your perfect match.',
    keywords: 'browse cars, vehicle listings, cars for sale, motorcycles rwanda, vehicle search',
  },
  '/about': {
    title: "About Us - Rwanda's Premier Vehicle Marketplace | Inzira",
    description:
      "Learn about Inzira, Rwanda's #1 Verified Car Marketplace. Our mission is to revolutionize buying and selling vehicles with trust and transparency.",
    keywords: 'about inzira, vehicle marketplace rwanda, car company, about us',
  },
  '/contact': {
    title: 'Contact Us - Get in Touch with Inzira',
    description:
      "Contact Inzira for support, partnerships, or inquiries. We're here to help with your vehicle buying and selling needs in Rwanda.",
    keywords: 'contact inzira, support, help, customer service',
  },
  '/services': {
    title: 'Our Services - Vehicle Marketplace Solutions | Inzira',
    description:
      'Discover Inzira services for buyers and sellers. Vehicle verification, featured listings, premium subscriptions, and secure transactions.',
    keywords: 'vehicle marketplace services, car verification, featured listings, premium services',
  },
  '/verification-process': {
    title: 'Verification Process - Inzira Trust Marketplace',
    description:
      'Understand how Inzira verifies sellers and listings: identity checks, ownership documents, phone confirmation, and review workflows.',
    keywords: 'verification process, seller verification rwanda, trusted listing marketplace',
  },
  '/buyer-protection': {
    title: 'Buyer Protection - Safe Car Buying on Inzira',
    description:
      'Learn how Inzira protects buyers with verified sellers, fraud reporting, and practical safety steps for vehicle transactions in Rwanda.',
    keywords: 'buyer protection rwanda, car purchase safety, scam prevention',
  },
  '/how-we-verify': {
    title: 'How We Verify Sellers - Inzira',
    description:
      'See how Inzira validates seller identity, listing legitimacy, and platform trust signals before buyers engage.',
    keywords: 'how inzira verifies, verified seller, trust marketplace',
  },
  '/sell': {
    title: 'Sell Your Vehicle - Free Listing on Inzira',
    description:
      'Sell your car, motorcycle, or vehicle in Rwanda. Create a free listing and reach thousands of potential buyers. Get the best price for your vehicle.',
    keywords: 'sell car rwanda, sell motorcycle, vehicle listing, car seller, sell my car',
  },
  '/search': {
    title: 'Search Vehicles in Rwanda | Inzira',
    description:
      'Search cars, motorcycles, and vehicles across Rwanda with smart filters for brand, model, location, and budget.',
    keywords: 'search cars rwanda, find vehicle rwanda, car search, motorcycle search',
  },
  '/category/[slug]': {
    title: 'Vehicle Category Listings in Rwanda | Inzira',
    description:
      'Browse vehicle category listings in Rwanda. Discover verified sellers and compare listings by type, brand, and price.',
    keywords: 'category vehicles rwanda, browse vehicle type, vehicle category listings',
  },
  '/auth/login': {
    title: 'Login to Inzira Account',
    description: 'Sign in to your Inzira account to continue buying, selling, and managing vehicles in Rwanda.',
    keywords: 'inzira login, sign in, account login',
  },
  '/auth/login-form': {
    title: 'Sign In Form | Inzira',
    description: 'Enter your credentials to access your Inzira account securely.',
    keywords: 'inzira sign in form, login account',
  },
  '/auth/register': {
    title: 'Create Your Inzira Account',
    description: 'Join Inzira and start buying or selling vehicles in Rwanda with verified listings and trusted sellers.',
    keywords: 'register inzira, create account, join vehicle marketplace',
  },
  '/auth/verify-otp': {
    title: 'Verify Account OTP | Inzira',
    description: 'Verify your account using the one-time code sent to your email to complete sign up securely.',
    keywords: 'verify otp, account verification, inzira auth',
  },
  '/order': {
    title: 'Vehicle Orders | Inzira',
    description: 'Review your vehicle orders and purchase history on Inzira.',
    keywords: 'vehicle orders, car purchase history, inzira orders',
  },
  '/favorites': {
    title: 'Saved Vehicles | Inzira',
    description: 'View vehicles you saved and compare your favorite listings in one place.',
    keywords: 'saved cars, favorite vehicles, wishlist cars',
  },
  '/profile': {
    title: 'My Profile | Inzira',
    description: 'Manage your Inzira profile details and account preferences.',
    keywords: 'user profile, inzira account, profile settings',
  },
  '/listings': {
    title: 'My Listings | Inzira',
    description: 'Manage your active and draft vehicle listings on Inzira.',
    keywords: 'my listings, seller dashboard, manage vehicle ads',
  },
  '/history': {
    title: 'Account History | Inzira',
    description: 'Review your recent account activity and interactions on Inzira.',
    keywords: 'account history, user activity, inzira timeline',
  },
  '/subscription': {
    title: 'Subscription Plans | Inzira',
    description: 'Choose and manage subscription plans to unlock premium Inzira marketplace features.',
    keywords: 'subscription plans, premium account, inzira subscription',
  },
  '/report': {
    title: 'Report an Issue | Inzira',
    description: 'Report a listing, account, or platform issue to the Inzira team for fast review.',
    keywords: 'report listing, report issue, support ticket',
  },
};

const NO_INDEX_ROUTE_PREFIXES = [
  '/auth/',
  '/settings/',
  '/messages',
  '/notifications',
  '/verify/',
  '/order',
  '/history',
  '/report',
  '/subscription',
  '/profile',
  '/favorites',
  '/listings',
];

const NO_INDEX_ROUTES = new Set(['/+not-found', '/modal', '/_sitemap']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchActiveCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    if (!response.ok) return [];
    const payload = await response.json();
    const categories = payload?.data?.categories;
    return Array.isArray(categories) ? categories : [];
  } catch {
    return [];
  }
}

function toAbsoluteImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function parsePrice(price) {
  if (typeof price === 'number') return Number.isFinite(price) ? price : 0;
  const numeric = Number(String(price || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatUsd(price) {
  return `$${Number(price || 0).toLocaleString('en-US')}`;
}

function normalizeRouteFromDistPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');

  if (normalized.startsWith('(tabs)/')) {
    return normalizeRouteFromDistPath(normalized.replace(/^\(tabs\)\//, ''));
  }

  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    return `/${normalized.slice(0, -'/index.html'.length)}`;
  }
  if (normalized.endsWith('.html')) {
    return `/${normalized.slice(0, -'.html'.length)}`;
  }
  return `/${normalized}`;
}

function shouldNoIndex(route) {
  if (route.includes('[') || route.includes(']')) {
    return true;
  }

  return NO_INDEX_ROUTES.has(route) || NO_INDEX_ROUTE_PREFIXES.some((prefix) => route.startsWith(prefix));
}

function humanizeSegment(segment) {
  return String(segment || '')
    .replace(/\[[^\]]+\]/g, 'Listing')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildCategorySeoFromRoute(route, categoryBySlug = new Map()) {
  const slug = route.replace('/category/', '').trim();
  const categoryFromApi = categoryBySlug.get(slug);
  const categoryLabel = String(categoryFromApi || humanizeSegment(slug) || 'Vehicle Category').trim();

  return {
    title: `${categoryLabel} for Sale in Rwanda | Inzira`,
    description: `Browse ${categoryLabel.toLowerCase()} listings in Rwanda. Compare verified listings, prices, and sellers on Inzira.`,
    keywords: `${categoryLabel.toLowerCase()} rwanda, buy ${categoryLabel.toLowerCase()}, ${slug.toLowerCase()} listings, vehicle marketplace`,
  };
}

function buildAdaptiveFallback(route) {
  const cleaned = route.replace(/^\/+/, '').trim();
  if (!cleaned) return null;

  const parts = cleaned
    .split('/')
    .filter(Boolean)
    .map((part) => humanizeSegment(part));

  const primary = parts.join(' - ') || 'Marketplace';
  return {
    title: `${primary} | Inzira`,
    description: `View ${primary.toLowerCase()} on Inzira, Rwanda's trusted vehicle marketplace.`,
    keywords: `inzira, ${parts.join(', ').toLowerCase()}, vehicle marketplace rwanda`,
  };
}

function buildVehicleSeo(vehicle, route) {
  const year = vehicle?.year || '';
  const brand = vehicle?.brand || 'Vehicle';
  const model = vehicle?.model || 'Listing';
  const titleBase = year ? `${year} ${brand} ${model}` : `${brand} ${model}`;
  const listingTitle = String(vehicle?.title || '').trim() || titleBase;
  const priceNumber = parsePrice(vehicle?.price);
  const image = toAbsoluteImageUrl(vehicle?.images?.[0]);
  const descriptionRaw = String(vehicle?.description || '').trim();
  const description =
    descriptionRaw ||
    `Buy ${listingTitle} for ${formatUsd(priceNumber)}. Verified listing on Inzira - Rwanda's #1 Verified Car Marketplace.`;

  const canonicalUrl = `${SITE_URL}${route}`;

  const seo = {
    title: `${listingTitle} - ${formatUsd(priceNumber)} | Inzira`,
    description: description.slice(0, 160),
    keywords: `${brand} ${model}, ${year} ${brand}, buy ${brand} rwanda, ${brand} for sale, used ${brand}, car listing`,
    author: 'Inzira',
    type: 'product',
    robots: 'index, follow',
    image,
    canonicalUrl,
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: listingTitle,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    model,
    vehicleModelDate: year,
    offers: {
      '@type': 'Offer',
      price: priceNumber,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
    image,
    description: seo.description,
    fuelType: vehicle?.fuelType,
    mileageFromOdometer: vehicle?.mileage
      ? {
          '@type': 'QuantitativeValue',
          value: String(vehicle.mileage).replace(/\D/g, ''),
          unitCode: 'KMT',
        }
      : undefined,
    areaServed: vehicle?.location
      ? {
          '@type': 'Place',
          name: vehicle.location,
        }
      : undefined,
  };

  return { seo, structuredData };
}

function buildRouteSeo(route, categoryBySlug = new Map()) {
  let override = ROUTE_OVERRIDES[route] || {};

  if (route.startsWith('/category/')) {
    override = { ...override, ...buildCategorySeoFromRoute(route, categoryBySlug) };
  }

  if (!override.title || !override.description || !override.keywords) {
    const adaptive = buildAdaptiveFallback(route);
    if (adaptive) {
      override = {
        title: override.title || adaptive.title,
        description: override.description || adaptive.description,
        keywords: override.keywords || adaptive.keywords,
      };
    }
  }

  const canonicalUrl = `${SITE_URL}${route === '/' ? '/' : route}`;
  const robots = shouldNoIndex(route) ? 'noindex, nofollow' : DEFAULT_META.robots;

  return {
    title: override.title || DEFAULT_META.title,
    description: override.description || DEFAULT_META.description,
    keywords: override.keywords || DEFAULT_META.keywords,
    author: DEFAULT_META.author,
    type: DEFAULT_META.type,
    robots,
    image: DEFAULT_META.image,
    canonicalUrl,
  };
}

function buildSeoTagBlock(meta, jsonLdObject) {
  const lines = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="title" content="${escapeHtml(meta.title)}"/>`,
    `<meta name="description" content="${escapeHtml(meta.description)}"/>`,
    `<meta name="keywords" content="${escapeHtml(meta.keywords)}"/>`,
    `<meta name="author" content="${escapeHtml(meta.author)}"/>`,
    `<meta name="robots" content="${escapeHtml(meta.robots)}"/>`,
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}"/>`,
    `<meta property="og:type" content="${escapeHtml(meta.type)}"/>`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}"/>`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}"/>`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}"/>`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}"/>`,
    '<meta property="og:site_name" content="Inzira"/>',
    '<meta property="og:locale" content="en_RW"/>',
    '<meta property="twitter:card" content="summary_large_image"/>',
    `<meta property="twitter:url" content="${escapeHtml(meta.canonicalUrl)}"/>`,
    `<meta property="twitter:title" content="${escapeHtml(meta.title)}"/>`,
    `<meta property="twitter:description" content="${escapeHtml(meta.description)}"/>`,
    `<meta property="twitter:image" content="${escapeHtml(meta.image)}"/>`,
    '<meta property="twitter:site" content="@inzirarw"/>',
    '<meta property="twitter:creator" content="@inzirarw"/>',
  ];

  if (jsonLdObject) {
    const jsonLd = JSON.stringify(jsonLdObject).replace(/<\//g, '<\\/');
    lines.push(
      `<script type="application/ld+json">${jsonLd}</script>`
    );
  }

  return lines.join('');
}

function stripExistingSeo(headContent) {
  return headContent
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:title|description|keywords|author|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
}

async function listHtmlFiles(rootDir) {
  const out = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        out.push(full);
      }
    }
  }

  await walk(rootDir);
  return out;
}

async function fetchActiveVehicles() {
  try {
    const response = await fetch(`${API_BASE}/vehicles?status=active`);
    if (!response.ok) return [];
    const payload = await response.json();
    const vehicles = payload?.data?.vehicles;
    return Array.isArray(vehicles) ? vehicles : [];
  } catch {
    return [];
  }
}

function getVehicleIdFromRoute(route) {
  if (!route.startsWith('/vehicle/')) return null;
  const id = route.replace('/vehicle/', '');
  if (!id || id.includes('[') || id === 'edit') return null;
  return id;
}

async function injectSeoIntoDist() {
  const files = await listHtmlFiles(DIST_DIR);
  const vehicles = await fetchActiveVehicles();
  const categories = await fetchActiveCategories();
  const vehicleById = new Map(vehicles.filter((v) => v?.id).map((v) => [String(v.id), v]));
  const categoryBySlug = new Map(
    categories
      .filter((category) => category?.slug)
      .map((category) => [String(category.slug), String(category.name || '')])
  );

  let updated = 0;

  for (const fullPath of files) {
    const relativePath = path.relative(DIST_DIR, fullPath);
    const route = normalizeRouteFromDistPath(relativePath);

    const original = await fs.readFile(fullPath, 'utf8');
    const headMatch = original.match(/<head>([\s\S]*?)<\/head>/i);
    if (!headMatch) continue;

    let meta = buildRouteSeo(route, categoryBySlug);
    let jsonLd = null;

    const vehicleId = getVehicleIdFromRoute(route);
    if (vehicleId) {
      const vehicle = vehicleById.get(vehicleId);
      if (vehicle) {
        const vehicleSeo = buildVehicleSeo(vehicle, route);
        meta = vehicleSeo.seo;
        jsonLd = vehicleSeo.structuredData;
      } else {
        meta = {
          ...meta,
          title: 'Vehicle Listing | Inzira',
          description: 'View vehicle details, specs, and seller information on Inzira.',
          keywords: 'vehicle listing, car details, buy cars rwanda',
          type: 'product',
        };
      }
    }

    const cleanedHead = stripExistingSeo(headMatch[1]);
    const seoTags = buildSeoTagBlock(meta, jsonLd);
    const replacementHead = `<head>${seoTags}${cleanedHead}</head>`;
    const next = original.replace(/<head>[\s\S]*?<\/head>/i, replacementHead);

    if (next !== original) {
      await fs.writeFile(fullPath, next, 'utf8');
      updated += 1;
    }
  }

  console.log(`SEO injected into ${updated}/${files.length} HTML files in dist.`);
}

injectSeoIntoDist().catch((error) => {
  console.error('Failed to inject SEO metadata into dist:', error);
  process.exit(1);
});
