/**
 * Drives account recovery entirely through the UI, the way a locked-out user
 * would: Login -> "Forgot password?" -> receive code -> set a new password ->
 * land signed in. Then proves the new password works on a fresh login and the
 * old one no longer does.
 *
 * The emailed code is read straight from the DB, since there is no mailbox here.
 *
 * Usage: node e2e/forgot-password-flow.mjs <siteBase> <email> <oldPassword> <newPassword> <outDir>
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// `pg` is a backend dependency; resolve it from there rather than adding a
// database driver to the app's package.json just for a test.
const backendRequire = createRequire('C:/Bonfis/carsellbackend/package.json');
const pg = backendRequire('pg');

const [SITE, EMAIL, OLD_PASSWORD, NEW_PASSWORD, OUT] = [
  process.argv[2] || 'http://localhost:8081',
  process.argv[3],
  process.argv[4],
  process.argv[5],
  process.argv[6] || 'C:/Bonfis/shots/after',
];
const API = 'http://localhost:4002/api/v1';

const db = new pg.Client({
  user: 'INZIRA_DB', password: 'Inzira-AKDHKADHKH',
  database: 'INZIRA_DB', host: '127.0.0.1', port: 5433,
});

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  :: ' + detail : ''}`);
};

const run = async () => {
  await db.connect();
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
      await p.waitForTimeout(1800);
    };
    const shot = async (n) => { await p.screenshot({ path: path.join(dir, n + '.png') }); console.log('  captured ' + n); };

    // Reset the account back to the old password so the run is repeatable.
    await fetch(API + '/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    const seedOtp = (await db.query('SELECT otp FROM marketplace_users WHERE email=$1', [EMAIL])).rows[0].otp;
    await fetch(API + '/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, otp: seedOtp, newPassword: OLD_PASSWORD }),
    });

    // 1. The link must be reachable from the login screen.
    await p.goto(SITE + '/auth/login-form', { waitUntil: 'domcontentloaded' });
    await ready();
    const link = p.getByText(/forgot password/i).locator('visible=true').first();
    check(`[${vp.name}] "Forgot password?" link exists on login`, (await link.count()) > 0);
    await shot('17-login-with-forgot-link');

    await link.click().catch(() => {});
    await p.waitForTimeout(2500);
    check(`[${vp.name}] navigates to the reset screen`, /forgot-password/.test(p.url()), p.url());
    await shot('18-forgot-password-step1');

    // 2. Request the code.
    const emailInput = p.locator('input:visible').first();
    await emailInput.fill(EMAIL);
    const sendBtn = p.getByText(/send reset code/i).locator('visible=true').first();
    check(`[${vp.name}] send-code button present`, (await sendBtn.count()) > 0);
    await sendBtn.click().catch(() => {});
    await p.waitForTimeout(3500);
    await shot('19-forgot-password-step2');

    const otp = (await db.query('SELECT otp FROM marketplace_users WHERE email=$1', [EMAIL])).rows[0].otp;
    check(`[${vp.name}] a reset code was issued`, !!otp, otp ? 'code present' : 'NO CODE');

    // 3. Enter the code + new password.
    const inputs = p.locator('input:visible');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const type = await inputs.nth(i).getAttribute('type');
      if (type === 'password') await inputs.nth(i).fill(NEW_PASSWORD);
      else await inputs.nth(i).fill(otp);
    }
    await shot('20-forgot-password-filled');

    const resetBtn = p.getByText(/^reset password$/i).locator('visible=true').last();
    await resetBtn.click().catch(() => {});
    await p.waitForTimeout(6000);
    await shot('21-after-reset');

    const signedIn = await p.evaluate(() => !!localStorage.getItem('@auth_token'));
    check(`[${vp.name}] reset signs the user straight in`, signedIn, 'url=' + p.url());

    // 4. The new password really works, the old one does not.
    const newLogin = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: NEW_PASSWORD }),
    });
    check(`[${vp.name}] new password logs in`, newLogin.status === 200, 'http ' + newLogin.status);

    const oldLogin = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: OLD_PASSWORD }),
    });
    check(`[${vp.name}] old password is rejected`, oldLogin.status !== 200, 'http ' + oldLogin.status);

    await ctx.close();
  }

  await b.close();
  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
};

run().catch(async (e) => { console.error(e); try { await db.end(); } catch {} process.exit(1); });
