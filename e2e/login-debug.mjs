import { chromium } from 'playwright';
const [SITE, EMAIL, PASSWORD] = [process.argv[2], process.argv[3], process.argv[4]];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text().slice(0, 200)); });
p.on('request', r => {
  if (r.url().includes('/api/v1/auth/login')) console.log('REQUEST URL:', r.url(), 'BODY:', r.postData());
});
p.on('response', async r => {
  if (r.url().includes('/api/v1/auth/login')) {
    console.log('LOGIN RESPONSE', r.status(), (await r.text().catch(() => '')).slice(0, 200));
  }
});
await p.goto(SITE + '/auth/login-form', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.getElementById('inzira-boot'), { timeout: 25000 }).catch(() => {});
await p.waitForTimeout(2500);

const inputs = p.locator('input');
console.log('inputs found:', await inputs.count());
for (let i = 0; i < await inputs.count(); i++) {
  const t = await inputs.nth(i).getAttribute('type');
  if (t === 'password') await inputs.nth(i).fill(PASSWORD);
  else if (i === 0) await inputs.nth(i).fill(EMAIL);
}

for (let i = 0; i < await inputs.count(); i++) {
  console.log('input', i, 'type=', await inputs.nth(i).getAttribute('type'), 'value=', JSON.stringify(await inputs.nth(i).inputValue()));
}

const cands = p.getByText(/^(sign in|log in|login)$/i);
const n = await cands.count();
console.log('login-text candidates:', n);
for (let i = 0; i < n; i++) {
  const box = await cands.nth(i).boundingBox().catch(() => null);
  console.log('  candidate', i, JSON.stringify(box));
}
// Both matches are the same width (the header title and the button label), so
// pick the one lowest on the page - the submit button sits below the fields.
let best = null, by = -1;
for (let i = 0; i < n; i++) {
  const box = await cands.nth(i).boundingBox().catch(() => null);
  if (box && box.y > by) { by = box.y; best = cands.nth(i); }
}
console.log('clicking lowest, y', by);
await best.click().catch(e => console.log('click failed', String(e).slice(0, 120)));
await p.waitForTimeout(7000);
console.log('url after:', p.url());
const storage = await p.evaluate(() => JSON.stringify(Object.keys(localStorage)));
console.log('localStorage keys:', storage);
await p.screenshot({ path: 'C:/Bonfis/shots/login-debug.png' });
await b.close();
