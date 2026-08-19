/**
 * Captures the specific screens the user reported as broken, signed out and
 * signed in, at mobile and desktop widths.
 *
 * Logs in through the real login form rather than injecting a token, so the
 * auth UI is exercised too.
 *
 * Usage: node e2e/ui-evidence.mjs <siteBase> <apiBase> <email> <password> <outDir>
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SITE = process.argv[2] || 'http://localhost:8081';
const OUT = process.argv[5] || 'C:/Bonfis/shots/after';
const EMAIL = process.argv[3];
const PASSWORD = process.argv[4];

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const waitReady = async (p) => {
  await p.waitForFunction(() => !document.getElementById('inzira-boot'), { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(2000);
};

const shot = async (p, dir, name) => {
  await p.screenshot({ path: path.join(dir, name + '.png'), fullPage: false });
  await p.screenshot({ path: path.join(dir, name + '__full.png'), fullPage: true }).catch(() => {});
  console.log('  captured', name);
};

const run = async () => {
  const b = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const dir = path.join(OUT, vp.name);
    await mkdir(dir, { recursive: true });
    console.log('\n=== ' + vp.name + ' ===');

    // ---------- signed out ----------
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height } });
    const p = await ctx.newPage();

    await p.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
    // Deliberately captured before the overlay lifts: this is the window that
    // used to show the mobile layout, unstyled and empty, on a desktop monitor.
    await p.screenshot({ path: path.join(dir, '01-home-boot-overlay.png') });
    console.log('  captured 01-home-boot-overlay');
    await waitReady(p);
    await shot(p, dir, '02-home-ready');

    await p.goto(SITE + '/order', { waitUntil: 'domcontentloaded' });
    await waitReady(p);
    await shot(p, dir, '03-orders-signed-out');

    await p.goto(SITE + '/messages', { waitUntil: 'domcontentloaded' });
    await waitReady(p);
    await shot(p, dir, '04-messages-signed-out');

    await p.goto(SITE + '/explore', { waitUntil: 'domcontentloaded' });
    await waitReady(p);
    await shot(p, dir, '05-explore');

    // ---------- signed in ----------
    if (EMAIL && PASSWORD) {
      await p.goto(SITE + '/auth/login-form', { waitUntil: 'domcontentloaded' });
      await waitReady(p);
      await shot(p, dir, '06-login-form');

      const inputs = p.locator('input');
      const n = await inputs.count();
      // The form is email then password; find them positionally since RN Web
      // does not emit name attributes.
      for (let i = 0; i < n; i++) {
        const type = await inputs.nth(i).getAttribute('type');
        if (type === 'password') await inputs.nth(i).fill(PASSWORD);
        else if (i === 0) await inputs.nth(i).fill(EMAIL);
      }
      await p.waitForTimeout(400);
      await shot(p, dir, '07-login-filled');

      // "Login" also appears as the page title, and both labels measure the
      // same width, so pick the match lowest on the page - the submit button
      // sits below the fields.
      const candidates = p.getByText(/^(sign in|log in|login)$/i);
      const count = await candidates.count();
      let best = null;
      let bestY = -1;
      for (let i = 0; i < count; i++) {
        const box = await candidates.nth(i).boundingBox().catch(() => null);
        if (box && box.y > bestY) { bestY = box.y; best = candidates.nth(i); }
      }
      if (best) await best.click().catch(() => {});
      await p.waitForTimeout(6000);
      await shot(p, dir, '08-after-login');

      await p.goto(SITE + '/order', { waitUntil: 'domcontentloaded' });
      await waitReady(p);
      await shot(p, dir, '09-orders-signed-in');

      await p.goto(SITE + '/messages', { waitUntil: 'domcontentloaded' });
      await waitReady(p);
      await shot(p, dir, '10-messages-signed-in');

      await p.goto(SITE + '/profile', { waitUntil: 'domcontentloaded' });
      await waitReady(p);
      await shot(p, dir, '11-profile');

      // The become-seller sheet - the confirm button the user called out.
      const become = p.getByText(/become a seller|switch to buyer/i).first();
      if (await become.count()) {
        await become.scrollIntoViewIfNeeded().catch(() => {});
        await become.click().catch(() => {});
        await p.waitForTimeout(1200);
        await shot(p, dir, '12-role-switch-modal');
      } else {
        console.log('  (role switch entry not found on this account)');
      }
    }

    await ctx.close();
  }

  await b.close();
  console.log('\nEvidence written to ' + OUT);
};

run().catch((e) => { console.error(e); process.exit(1); });
