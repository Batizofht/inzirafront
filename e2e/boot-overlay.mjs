/**
 * Verifies the boot overlay contract against a locally served build:
 *  - it covers the pre-hydration paint (the mobile-layout-on-desktop window)
 *  - it is gone once the app is ready
 *  - the pre-rendered content underneath is never hidden from crawlers
 *  - a page whose bundle never loads still becomes usable via the failsafe
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8081';
const b = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
  if (!ok) failures++;
};

// --- 1. Normal load, desktop ---
{
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const early = await p.evaluate(() => {
    const el = document.getElementById('inzira-boot');
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    return { present: true, opacity: cs.opacity, position: cs.position, zIndex: cs.zIndex };
  });
  check('overlay covers the pre-hydration paint', early.present && early.opacity === '1', JSON.stringify(early));

  // Content must still be in the DOM underneath, not hidden.
  const seo = await p.evaluate(() => {
    const root = document.getElementById('root');
    return { rootEls: root ? root.querySelectorAll('*').length : 0, bodyText: document.body.innerText.length };
  });
  check('pre-rendered content present underneath', seo.rootEls > 50, JSON.stringify(seo));

  await p.waitForFunction(() => !document.getElementById('inzira-boot'), { timeout: 20000 }).catch(() => {});
  const gone = await p.evaluate(() => !document.getElementById('inzira-boot'));
  check('overlay removed once app is ready', gone);

  const desktop = await p.evaluate(() => ({
    w: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  check('no horizontal overflow at 1920', !desktop.overflow, JSON.stringify(desktop));
  await p.close();
}

// --- 2. Failsafe: bundle blocked entirely ---
{
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route('**/_expo/static/js/**', (r) => r.abort());
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  await p.waitForFunction(() => {
    const el = document.getElementById('inzira-boot');
    return !el || getComputedStyle(el).opacity === '0';
  }, { timeout: 15000 }).catch(() => {});
  const elapsed = Date.now() - t0;
  const usable = await p.evaluate(() => {
    const el = document.getElementById('inzira-boot');
    return { overlayGone: !el || getComputedStyle(el).opacity === '0', textVisible: document.body.innerText.length };
  });
  check('failsafe reveals content when bundle never loads', usable.overlayGone, `after ${elapsed}ms, ${usable.textVisible} chars visible`);
  await p.close();
}

// --- 3. No-JS crawler view ---
{
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const hidden = await p.evaluate(() => null).catch(() => null);
  const html = await p.content();
  const noscriptGuard = /<noscript><style>#inzira-boot\{display:none!important\}<\/style><\/noscript>/.test(html);
  check('noscript hides overlay for JS-less crawlers', noscriptGuard);
  const visibleText = await p.locator('body').innerText();
  check('crawler still sees page content', visibleText.length > 200, `${visibleText.length} chars`);
  await ctx.close();
}

await b.close();
console.log(failures === 0 ? '\nAll boot-overlay checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
