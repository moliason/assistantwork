const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    try {
        for (const account of ['fresh', 'demo']) {
            const context = await browser.newContext();
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('https://api.open-meteo.com/**', route => route.abort());
            await page.goto(process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../web.html')).href);
            await page.evaluate(account => localStorage.setItem('xujianActiveAccount', account), account);
            await page.reload();
            await page.locator('[data-header-create="schedule"]').click();
            await page.locator('#eventForm [name="title"]').fill('必须保留的已有行程');
            await page.locator('#saveEvent').click();
            await page.waitForFunction(() => !document.querySelector('#newDialog').open);
            const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
            for (const loginMethod of ['shortcut', 'password']) {
                // Simulate an expired session only, without modifying any saved user data.
                await page.evaluate(() => localStorage.removeItem('xujianActiveAccount'));
                await page.reload();
                if (loginMethod === 'shortcut') {
                    await page.locator(`[data-demo-login="${account}"]`).click();
                } else {
                    await page.locator('#loginAccount').fill(account);
                    await page.locator('#loginPassword').fill('123456');
                    await page.locator('#loginForm button[type="submit"]').click();
                }
                await page.waitForFunction(() => !document.querySelector('#appShell').hidden);
                assert.match(await page.locator('#timeline').textContent(), /必须保留的已有行程/);
                const after = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
                for (const [key, value] of Object.entries(saved))
                    assert.equal(after[key], value, `${account} ${loginMethod} changed ${key}`);
            }
            assert.equal(await page.locator('#logoutBtn, #logoutHeaderBtn').count(), 0);
            for (const type of ['schedule', 'task']) {
                await page.locator(`[data-header-create="${type}"]`).click();
                assert.equal(await page.locator('#resetEventDraft').count(), 0);
                await page.locator('#eventForm [name="title"]').fill('未保存草稿需要保留');
                await page.locator('#newDialog .modal-head [data-close-dialog]').click();
                await page.reload();
                await page.locator(`[data-header-create="${type}"]`).click();
                assert.equal(await page.locator('#eventForm [name="title"]').inputValue(), '未保存草稿需要保留');
                await page.locator('#newDialog .modal-head [data-close-dialog]').click();
            }
            await page.locator('[data-header-create="meeting"]').click();
            assert.equal(await page.locator('#resetMeetingDraft').count(), 0);
            await page.locator('#quickMeetingForm [name="quickTitle"]').fill('会议填写草稿保留');
            await page.locator('#quickMeetingDialog .modal-head [data-close-dialog]').click();
            await page.reload();
            await page.locator('[data-header-create="meeting"]').click();
            assert.equal(await page.locator('#quickMeetingForm [name="quickTitle"]').inputValue(), '会议填写草稿保留');
            assert.deepEqual(errors, []);
            console.log(`PASS ${account}: both login paths preserve existing storage, clearing/exit/reset controls absent, schedule/task/meeting form drafts survive close and reload`);
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
