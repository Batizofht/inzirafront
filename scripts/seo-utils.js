/**
 * Shared URL rules for the SEO build steps.
 *
 * Category slugs come from the API as display names ("Petrol Car", "Diessel
 * Car"), which produced sitemap entries containing a raw space — not a valid
 * URL at all. Netlify additionally lowercases paths, so even the encoded form
 * 301'd. Every category URL in the submitted sitemap was unreachable.
 */

/** "Electric Motorcycle" -> "electric-motorcycle" */
function toUrlSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** True for the dynamic route templates, which are never real content. */
function isRouteTemplate(name) {
  return /\[|%5B/i.test(name);
}

module.exports = { toUrlSlug, isRouteTemplate };
