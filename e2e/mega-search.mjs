/**
 * Regression guard for the hero "mega search" (components/hero-section.tsx).
 *
 * This is the one piece of layout that must not be disturbed. It is fragile in
 * specific ways: it renders null below 768px, it only mounts after hydration
 * supplies a real viewport width, and its Brand/Model/Mileage dropdowns are
 * rendered through createPortal into document.body and positioned from
 * getBoundingClientRect - so any ancestor that clips or creates a stacking
 * context above it breaks them.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8081';
const b = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
  if (!ok) failures++;
};

const waitReady = async (p) => {
  await p.waitForFunction(() => !document.getElementById('inzira-boot'), { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(2500);
};

// --- Desktop: the mega search must be there and interactive ---
for (const width of [1280, 1920]) {
  const p = await b.newPage({ viewport: { width, height: 900 } });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await waitReady(p);

  const heroH1 = await p.locator('h1').first().textContent().catch(() => null);
  check(`[${width}] desktop hero renders`, !!heroH1 && /Inzira/i.test(heroH1), JSON.stringify(heroH1));

  // The three fields carry these labels; find them by accessible text.
  const brand = p.getByText(/^Brand$/i).first();
  const model = p.getByText(/^Model$/i).first();
  const mileage = p.getByText(/mileage/i).first();
  check(`[${width}] Brand field present`, await brand.count() > 0);
  check(`[${width}] Model field present`, await model.count() > 0);
  check(`[${width}] Mileage field present`, await mileage.count() > 0);

  // Open the Brand dropdown - this exercises the createPortal + rect path.
  const before = await p.evaluate(() => document.body.children.length);
  await brand.click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(900);
  const after = await p.evaluate(() => document.body.children.length);
  const portalOpened = after > before;
  check(`[${width}] Brand dropdown portals into body`, portalOpened, `body children ${before} -> ${after}`);

  // Whatever opened must be on-screen, not clipped to zero.
  if (portalOpened) {
    const vis = await p.evaluate(() => {
      const last = document.body.lastElementChild;
      const r = last.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), visible: r.width > 40 && r.height > 20 };
    });
    check(`[${width}] dropdown is visible, not clipped`, vis.visible, JSON.stringify(vis));
  }

  await p.keyboard.press('Escape').catch(() => {});
  await p.close();
}

// --- Mobile: the mega search must NOT render ---
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await waitReady(p);
  const brandCount = await p.getByText(/^Brand$/i).count();
  check('[390] mega search correctly absent on mobile', brandCount === 0, `found ${brandCount}`);
  await p.close();
}

await b.close();
console.log(failures === 0 ? '\nMega search intact.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
