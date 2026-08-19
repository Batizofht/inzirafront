/** Finds where the server markup and the hydrated DOM diverge on a route. */
import { chromium } from 'playwright';
const url = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(url, { waitUntil: 'domcontentloaded' });
const before = await p.evaluate(() => document.getElementById('root').innerHTML);
await p.waitForTimeout(6000);
const after = await p.evaluate(() => document.getElementById('root').innerHTML);
console.log('server html length:', before.length, ' hydrated length:', after.length);
let i = 0;
while (i < before.length && i < after.length && before[i] === after[i]) i++;
console.log('first divergence at char', i);
console.log('\n--- SERVER around divergence ---\n' + before.slice(Math.max(0, i - 400), i + 400));
console.log('\n--- CLIENT around divergence ---\n' + after.slice(Math.max(0, i - 400), i + 400));
await b.close();
