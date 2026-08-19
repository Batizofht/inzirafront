/**
 * Captures the chat detail screen, which is where the composer had to be fixed:
 * on web it sits inside the page-level ScrollView from app/_layout.tsx, so a
 * bottom-anchored bar had nothing to anchor to and scrolled away with the page.
 * It is now sticky to the bottom of the scrollport.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [SITE, EMAIL, PASSWORD, OUT] = [
  process.argv[2], process.argv[3], process.argv[4], process.argv[5] || 'C:/Bonfis/shots/after',
];

const b = await chromium.launch();

for (const vp of [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'mobile-390', width: 390, height: 844 },
]) {
  const dir = path.join(OUT, vp.name);
  await mkdir(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
  const p = await ctx.newPage();
  console.log('\n=== ' + vp.name + ' ===');

  const ready = async () => {
    await p.waitForFunction(() => !document.getElementById('inzira-boot'), { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(2000);
  };

  await p.goto(SITE + '/auth/login-form', { waitUntil: 'domcontentloaded' });
  await ready();
  const inputs = p.locator('input');
  for (let i = 0; i < (await inputs.count()); i++) {
    const t = await inputs.nth(i).getAttribute('type');
    if (t === 'password') await inputs.nth(i).fill(PASSWORD);
    else if (i === 0) await inputs.nth(i).fill(EMAIL);
  }
  const cands = p.getByText(/^(sign in|log in|login)$/i);
  let best = null, bestY = -1;
  for (let i = 0; i < (await cands.count()); i++) {
    const box = await cands.nth(i).boundingBox().catch(() => null);
    if (box && box.y > bestY) { bestY = box.y; best = cands.nth(i); }
  }
  if (best) await best.click().catch(() => {});
  await p.waitForTimeout(6000);

  await p.goto(SITE + '/messages', { waitUntil: 'domcontentloaded' });
  await ready();
  await p.screenshot({ path: path.join(dir, '15-messages-list.png') });
  console.log('  captured 15-messages-list');

  // Open the first conversation row.
  const row = p.getByText(/available|negotiable|RAV4/i).first();
  if (await row.count()) {
    await row.click().catch(() => {});
    await p.waitForTimeout(4000);
    await p.screenshot({ path: path.join(dir, '16-chat-detail.png') });
    console.log('  captured 16-chat-detail  url=' + p.url());

    // Where does the composer sit relative to the viewport?
    const geom = await p.evaluate(() => {
      const box = [...document.querySelectorAll('textarea, input')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 20)
        .sort((a, b) => b.top - a.top)[0];
      return box
        ? { inputBottom: Math.round(box.bottom), viewportH: window.innerHeight, withinViewport: box.bottom <= window.innerHeight + 4 }
        : null;
    });
    console.log('  composer geometry:', JSON.stringify(geom));
  } else {
    console.log('  no conversation row found');
  }

  await ctx.close();
}

await b.close();
console.log('\ndone');
