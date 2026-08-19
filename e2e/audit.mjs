/**
 * Full-site audit sweep.
 *
 * Walks every exported route at four widths and records what a real visitor
 * actually gets: the pre-hydration paint, the post-hydration paint, timings,
 * console errors, failed requests, and layout defects (horizontal overflow,
 * squeezed content columns, the desktop/mobile layout swap).
 *
 * Usage: node e2e/audit.mjs [--base https://inzira.co] [--out audit-report]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROUTES, VIEWPORTS } from './routes.mjs';

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (arg('--base', 'https://inzira.co')).replace(/\/$/, '');
const OUT = arg('--out', 'audit-report');
const ONLY = arg('--only', null);           // substring filter for a quick run
const NAV_TIMEOUT = Number(arg('--timeout', 45000));

const routes = ONLY ? ROUTES.filter((r) => r.includes(ONLY)) : ROUTES;

/** Read layout facts out of the live DOM. */
const probe = () => {
  const de = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');
  const boot = document.getElementById('inzira-boot');

  // Widest element that overflows the viewport - the cause of a horizontal scrollbar.
  let widest = null;
  if (de.scrollWidth > de.clientWidth + 1) {
    let max = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > max) { max = r.right; widest = el.tagName + '.' + (el.className || '').toString().slice(0, 60); }
    }
  }

  // Font families actually in use on rendered text, by element count. `body`
  // itself is never styled by RN Web, so reading it only ever reports the
  // browser default and tells us nothing.
  const fontTally = {};
  let serifLeakCount = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasOwnText) continue;
    const ff = getComputedStyle(el).fontFamily;
    fontTally[ff] = (fontTally[ff] || 0) + 1;
    // A serif default means the element never received an RN Web text class.
    if (/^(Times|serif)/i.test(ff)) serifLeakCount++;
  }

  return {
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    horizontalOverflow: de.scrollWidth > de.clientWidth + 1,
    widestOverflowingEl: widest,
    bodyOverflowHidden: getComputedStyle(body).overflow === 'hidden',
    rootChildCount: root ? root.querySelectorAll('*').length : 0,
    linkCount: document.querySelectorAll('a[href]').length,
    // The desktop hero is the only place this h1 is rendered; on the mobile
    // layout it is absent entirely. This is the layout-swap signal.
    heroH1: (() => {
      const h = document.querySelector('h1');
      return h ? h.textContent.trim().slice(0, 60) : null;
    })(),
    bootOverlayPresent: !!boot,
    bootOverlayVisible: boot
      ? getComputedStyle(boot).display !== 'none' && getComputedStyle(boot).opacity !== '0'
      : false,
    // Narrowest tall text column - catches the paddingHorizontal:400 squeeze.
    narrowestTextColumn: (() => {
      let min = Infinity;
      for (const el of document.querySelectorAll('div,section,main')) {
        const r = el.getBoundingClientRect();
        if (r.height > 120 && r.width > 0 && r.width < min && el.textContent.trim().length > 40) min = r.width;
      }
      return Number.isFinite(min) ? Math.round(min) : null;
    })(),
    fontFamilies: Object.entries(fontTally).sort((a, b) => b[1] - a[1]).slice(0, 4),
    serifLeakCount,
    // Icon glyphs render from a private-use codepoint; if the font never
    // arrives they show as tofu. Count elements asking for Material Icons.
    materialIconEls: [...document.querySelectorAll('body *')]
      .filter((el) => /Material Icons/.test(getComputedStyle(el).fontFamily)).length,
  };
};

const run = async () => {
  const browser = await chromium.launch();
  const results = [];
  const shotDir = path.join(OUT, 'screenshots');
  await mkdir(shotDir, { recursive: true });

  // One context per viewport, all four sweeping concurrently - the run is
  // entirely network-bound, so serialising it wastes most of the wall clock.
  const sweepViewport = async (vp) => {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      // Deny geolocation so the first-paint permission prompt never blocks the run.
      permissions: [],
    });

    for (const route of routes) {
      const url = BASE + route;
      const page = await ctx.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      const pageErrors = [];

      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
      page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
      page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 160)} :: ${r.failure()?.errorText}`));

      const rec = { route, viewport: vp.name, width: vp.width, url };
      const t0 = Date.now();

      try {
        // Stage 1: the paint a visitor gets BEFORE the bundle hydrates.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
        rec.domContentLoadedMs = Date.now() - t0;
        rec.preHydration = await page.evaluate(probe);
        const slug = `${route.replace(/[^a-z0-9]+/gi, '_') || 'root'}__${vp.name}`;
        await page.screenshot({ path: path.join(shotDir, `${slug}__1-prehydration.png`), fullPage: false });

        // Stage 2: settled.
        // Several screens poll on a 4s interval, so networkidle may never fire.
        // Cap the wait rather than burning the full navigation timeout on them.
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(1500); // let post-hydration data land
        rec.settledMs = Date.now() - t0;
        rec.postHydration = await page.evaluate(probe);
        await page.screenshot({ path: path.join(shotDir, `${slug}__2-settled.png`), fullPage: false });
        await page.screenshot({ path: path.join(shotDir, `${slug}__3-full.png`), fullPage: true }).catch(() => {});

        rec.perf = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          const transfer = performance.getEntriesByType('resource')
            .reduce((sum, r) => sum + (r.transferSize || 0), 0);
          return {
            ttfbMs: nav ? Math.round(nav.responseStart) : null,
            domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
            loadMs: nav ? Math.round(nav.loadEventEnd) : null,
            firstContentfulPaintMs: fcp ? Math.round(fcp.startTime) : null,
            resourceCount: performance.getEntriesByType('resource').length,
            transferBytes: transfer,
          };
        });

        // The headline defect: desktop viewport served the mobile layout at first paint.
        // Desktop viewport that had no hero at first paint but grew one after
        // hydration was served the mobile layout and swapped late.
        rec.mobileLayoutOnDesktop =
          vp.width >= 768 && !rec.preHydration.heroH1 && !!rec.postHydration.heroH1;
        rec.hydrationElementDelta =
          rec.postHydration.rootChildCount - rec.preHydration.rootChildCount;
        rec.status = 'ok';
      } catch (err) {
        rec.status = 'error';
        rec.error = String(err).slice(0, 400);
      }

      rec.consoleErrors = consoleErrors;
      rec.pageErrors = pageErrors;
      rec.failedRequests = failedRequests;
      results.push(rec);
      console.log(
        `[${vp.name}] ${route.padEnd(28)} ${rec.status}` +
        (rec.perf ? ` fcp=${rec.perf.firstContentfulPaintMs}ms load=${rec.perf.loadMs}ms ${(rec.perf.transferBytes / 1024).toFixed(0)}KB` : '') +
        (rec.mobileLayoutOnDesktop ? '  ⚠ MOBILE-LAYOUT-ON-DESKTOP' : '') +
        (rec.postHydration?.horizontalOverflow ? '  ⚠ H-OVERFLOW' : '') +
        (consoleErrors.length ? `  ⚠ ${consoleErrors.length} console errors` : '')
      );
      await page.close();
    }
    await ctx.close();
  };

  await Promise.all(VIEWPORTS.map(sweepViewport));

  await browser.close();
  await writeFile(path.join(OUT, 'audit.json'), JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${results.length} records to ${OUT}/audit.json`);
};

run().catch((e) => { console.error(e); process.exit(1); });
