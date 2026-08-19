/**
 * Captures the Become a Seller sheet at desktop and mobile widths.
 *
 * It lives behind the Preferences tab on the profile screen, so this drives:
 * login -> /profile -> Preferences -> Become a Seller -> screenshot the sheet.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [SITE, EMAIL, PASSWORD, OUT] = [
  process.argv[2] || 'http://localhost:8081',
  process.argv[3],
  process.argv[4],
  process.argv[5] || 'C:/Bonfis/shots/after',
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

  // Log in.
  await p.goto(SITE + '/auth/login-form', { waitUntil: 'domcontentloaded' });
  await ready();
  const inputs = p.locator('input');
  for (let i = 0; i < (await inputs.count()); i++) {
    const t = await inputs.nth(i).getAttribute('type');
    if (t === 'password') await inputs.nth(i).fill(PASSWORD);
    else if (i === 0) await inputs.nth(i).fill(EMAIL);
  }
  const cands = p.getByText(/^(sign in|log in|login)$/i);
  let best = null;
  let bestY = -1;
  for (let i = 0; i < (await cands.count()); i++) {
    const box = await cands.nth(i).boundingBox().catch(() => null);
    if (box && box.y > bestY) { bestY = box.y; best = cands.nth(i); }
  }
  if (best) await best.click().catch(() => {});
  await p.waitForTimeout(6000);

  await p.goto(SITE + '/profile', { waitUntil: 'domcontentloaded' });
  await ready();

  // The switch entry sits under the Preferences tab, not Activity.
  const prefs = p.getByText(/^preferences$/i).first();
  if (await prefs.count()) {
    await prefs.click().catch(() => {});
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(dir, '12-profile-preferences.png') });
    console.log('  captured 12-profile-preferences');
  }

  const become = p.getByText(/become a seller|switch to buyer|start selling/i).first();
  if (await become.count()) {
    await become.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(400);
    await become.click().catch(() => {});
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.join(dir, '13-role-switch-modal.png') });
    console.log('  captured 13-role-switch-modal');

    // Select Dealer to show the picker in its chosen state.
    const dealer = p.getByText(/^dealer$/i).first();
    if (await dealer.count()) {
      await dealer.click().catch(() => {});
      await p.waitForTimeout(800);
      await p.screenshot({ path: path.join(dir, '14-role-switch-dealer-selected.png') });
      console.log('  captured 14-role-switch-dealer-selected');
    }
  } else {
    console.log('  become-seller entry still not found');
    await p.screenshot({ path: path.join(dir, '12-profile-preferences-nomatch.png') });
  }

  await ctx.close();
}

await b.close();
console.log('\ndone');
