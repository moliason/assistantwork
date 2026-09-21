const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    try {
        for (const account of ['demo', 'fresh']) {
            const context = await browser.newContext({viewport: {width: 390, height: 844}});
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('https://api.open-meteo.com/**', route => route.abort());
            await page.goto(process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../web.html')).href);
            await page.evaluate(account => {
                localStorage.setItem('xujianActiveAccount', account);
                const records = [
                    {title: '稍晚的老板行程', owner: 'boss', time: '16:00–17:00'},
                    {title: '我的行程保留', owner: 'mine', time: '08:00–09:00'},
                    {title: '要删除的老板行程', owner: 'boss', time: '10:00–11:00'}
                ];
                localStorage.setItem(`scheduleData_${account === 'fresh' ? 'fresh_v2' : account}`, JSON.stringify(records));
            }, account);
            await page.reload();
            await page.locator('[data-view="itinerary"]:visible').click();
            await page.locator('[data-module-perspective="itinerary"][data-value="boss"]').click();
            const remove = page.getByRole('button', {name: '删除行程：要删除的老板行程', exact: true});
            for (const width of [320, 390, 768, 1440]) {
                await page.setViewportSize({width, height: 844});
                for (const end of [false, true]) {
                    await page.locator('.itinerary-scroll').evaluate((el, end) => el.scrollLeft = end ? el.scrollWidth : 0, end);
                    await remove.scrollIntoViewIfNeeded();
                    assert.ok(await remove.evaluate(el => {
                        const box = el.getBoundingClientRect();
                        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
                        return box.x >= 0 && box.right <= innerWidth && el.contains(hit);
                    }), `${account}: delete button covered at ${width}px`);
                    await remove.click({trial: true});
                }
            }
            page.once('dialog', dialog => dialog.dismiss());
            await remove.click();
            assert.equal(await remove.count(), 1);
            page.once('dialog', dialog => dialog.accept());
            await remove.click();
            assert.equal(await remove.count(), 0);
            assert.match(await page.locator('#itineraryRows').textContent(), /稍晚的老板行程/);
            await page.reload();
            await page.locator('[data-view="itinerary"]:visible').click();
            assert.equal(await remove.count(), 0);
            assert.match(await page.locator('#itineraryRows').textContent(), /我的行程保留/);
            assert.match(await page.locator('#itineraryRows').textContent(), /稍晚的老板行程/);
            for (const title of ['我的行程保留', '稍晚的老板行程']) {
                page.once('dialog', dialog => dialog.accept());
                await page.getByRole('button', {name: `删除行程：${title}`, exact: true}).click();
            }
            assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
            assert.equal(await page.locator('#itineraryRows td').getAttribute('colspan'), '11');
            await page.reload();
            await page.locator('[data-view="itinerary"]:visible').click();
            assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
            assert.deepEqual(errors, []);
            console.log(`PASS ${account}: visible/clickable at 320–1440px, cancel, sorted/filtered deletion, reload persistence, empty state`);
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
