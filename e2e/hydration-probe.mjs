/** Capture the full text of hydration/runtime errors on a route. */
import { chromium } from 'playwright';
const url = process.argv[2] || 'https://inzira.co/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('pageerror', e => errs.push({ type: 'pageerror', msg: String(e.message).slice(0, 700), stack: String(e.stack || '').slice(0, 800) }));
p.on('console', m => { if (m.type() === 'error') errs.push({ type: 'console', text: m.text().slice(0, 900) }); });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(9000);
console.log(`${errs.length} error(s) on ${url}\n`);
errs.forEach((e, i) => console.log(`--- [${i}] ${e.type} ---\n${e.msg || e.text}\n${e.stack || ''}`));
await b.close();
