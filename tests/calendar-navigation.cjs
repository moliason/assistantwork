const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    try {
        for (const account of ['demo', 'fresh']) {
            const context = await browser.newContext({viewport: {width: 1440, height: 1000}, timezoneId: 'Asia/Shanghai'});
            const page = await context.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.clock.install({time: new Date('2026-09-23T10:00:00+08:00')});
            await page.route('https://api.open-meteo.com/**', route => route.abort());
            await page.goto(process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../web.html')).href);
            await page.evaluate(account => localStorage.setItem('xujianActiveAccount', account), account);
            await page.reload();
            await page.locator('[data-view="calendar"]:visible').click();
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarPeriodTitle').textContent(), '2026年 10月');
            await page.locator('[data-calendar-date="2026-10-15"]').click();
            assert.equal(await page.locator('#eventForm [name="date"]').inputValue(), '2026-10-15');
            await page.locator('#eventForm [name="title"]').fill('下个月的日程');
            await page.locator('#saveEvent').click();
            await page.waitForFunction(() => !document.querySelector('#newDialog').open);
            assert.match(await page.locator('#monthGrid').textContent(), /下个月的日程/);
            await page.locator('#calendarDatePicker').fill('2027-12-31');
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2028-01-31');
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2028-02-29');
            assert.equal(await page.locator('.calendar-add-date').count(), 29);
            await page.locator('#calendar [data-create="schedule"]').click();
            assert.equal(await page.locator('#eventForm [name="date"]').inputValue(), '2028-02-29');
            await page.locator('#eventForm [name="title"]').fill('未来闰年日程');
            await page.locator('#saveEvent').click();
            await page.waitForFunction(() => !document.querySelector('#newDialog').open);
            await page.locator('[data-calendar-mode="day"]').click();
            assert.match(await page.locator('#monthGrid').textContent(), /未来闰年日程/);
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2028-03-01');
            await page.locator('#calendarPrev').click();
            await page.locator('[data-calendar-mode="week"]').click();
            assert.match(await page.locator('#monthGrid').textContent(), /未来闰年日程/);
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2028-03-07');
            await page.locator('#calendarPrev').click();
            await page.clock.setSystemTime(new Date('2026-09-24T00:00:00+08:00'));
            await page.clock.runFor(1100);
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2028-02-29');
            await page.locator('#calendarToday').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2026-09-24');
            await page.locator('[data-calendar-mode="month"]').click();
            await page.locator('#calendarDatePicker').fill('2027-01-31');
            await page.locator('#calendarNext').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2027-02-28');
            await page.locator('#calendarDatePicker').fill('2027-01-01');
            await page.locator('#calendarPrev').click();
            assert.equal(await page.locator('#calendarDatePicker').inputValue(), '2026-12-01');
            for (const width of [320, 390, 768, 1440]) {
                await page.setViewportSize({width, height: 844});
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
                for (const selector of ['#calendarPrev', '#calendarNext', '#calendarToday', '#calendarDatePicker', '.calendar-add-date:first-child']) {
                    const control = page.locator(selector).first();
                    await control.scrollIntoViewIfNeeded();
                    await control.click({trial: true});
                }
            }
            await page.reload();
            await page.locator('[data-view="calendar"]:visible').click();
            await page.locator('#calendarDatePicker').fill('2028-02-29');
            assert.match(await page.locator('#monthGrid').textContent(), /未来闰年日程/);
            await page.locator('#calendarDatePicker').fill('2026-10-15');
            assert.match(await page.locator('#monthGrid').textContent(), /下个月的日程/);
            assert.deepEqual(errors, []);
            console.log(`PASS ${account}: next month, selected-date creation, year/month boundaries, leap years, day/week navigation, midnight, reload and 320–1440px controls`);
            await context.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
