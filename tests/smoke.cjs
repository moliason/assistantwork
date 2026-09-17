const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    const errors = [];
    try {
        const context = await browser.newContext({viewport: {width: 1440, height: 1080}, timezoneId: 'Asia/Shanghai'});
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({time: new Date('2026-09-17T15:20:00+08:00')});
        const url = pathToFileURL(path.resolve(__dirname, '../web.html')).href;
        await page.goto(url);
        await page.evaluate(() => localStorage.setItem('xujianActiveAccount', 'demo'));
        await page.reload();
        assert.match(await page.title(), /PURR PATCH/);
        assert.equal(await page.locator('.brand-logo img').count(), 3);
        assert.equal(await page.locator('.brand-logo img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth === 1280)), true);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nav').trim()), '#223c54');
        console.log('PASS original logo loads in all 3 placements and blue theme is active');
        assert.match(await page.locator('#liveDate').textContent(), /2026年9月17日星期四/);
        assert.equal(await page.locator('#calendarPeriodTitle').textContent(), '2026年 9月');
        assert.equal(await page.locator('.day:not(.head):not(.muted)').count(), 30);
        assert.equal(await page.locator('.day.today>span').textContent(), '17');
        assert.equal(await page.locator('#pageTitle').textContent(), '下午好');
        console.log('PASS current local date, greeting and 30-day calendar');

        await page.locator('[data-header-create="schedule"]').click();
        assert.equal(await page.locator('#eventForm [name="date"]').inputValue(), '2026-09-17');
        await page.locator('#eventForm [name="title"]').fill('自动更新回归日程');
        await page.locator('#eventForm [name="timeMode"]').selectOption('none');
        await page.locator('#saveEvent').click();
        await page.waitForFunction(() => !document.querySelector('#newDialog').open);
        assert.match(await page.locator('#timeline').textContent(), /自动更新回归日程/);
        await page.locator('#dashboardTaskList .task-dot').first().click();
        assert.equal(await page.locator('#pendingCount').textContent(), '1');
        console.log('PASS create schedule and complete task');

        const storedBefore = await page.evaluate(() => localStorage.getItem('scheduleData_demo'));
        await page.clock.setSystemTime(new Date('2026-09-17T23:59:59+08:00'));
        await page.clock.runFor(2000);
        assert.match(await page.locator('#liveDate').textContent(), /9月18日星期五/);
        assert.match(await page.locator('#dashboardDateLabel').textContent(), /9月18日 · 今日/);
        assert.equal(await page.locator('#pendingCount').textContent(), '1');
        assert.equal(await page.evaluate(() => localStorage.getItem('scheduleData_demo')), storedBefore);
        await page.locator('[data-header-create="schedule"]').click();
        assert.equal(await page.locator('#eventForm [name="date"]').inputValue(), '2026-09-18');
        await page.locator('#newDialog [data-close-dialog]').first().click();
        await page.locator('#dashboardPrevDay').click();
        await page.clock.setSystemTime(new Date('2026-09-19T00:00:00+08:00'));
        await page.clock.runFor(1000);
        assert.match(await page.locator('#dashboardDateLabel').textContent(), /9月17日/);
        assert.match(await page.locator('#timeline').textContent(), /自动更新回归日程/);
        console.log('PASS midnight rollover, new form defaults, history selection and persisted dates');

        for (const [date, days, heading] of [['2028-02-29', 29, '2028年 2月'], ['2027-02-01', 28, '2027年 2月'], ['2027-01-01', 31, '2027年 1月']]) {
            await page.clock.setSystemTime(new Date(`${date}T12:00:00+08:00`));
            await page.clock.runFor(1000);
            assert.equal(await page.locator('#calendarPeriodTitle').textContent(), heading);
            assert.equal(await page.locator('.day:not(.head):not(.muted)').count(), days);
        }
        await page.evaluate(() => switchView('calendar'));
        await page.locator('[data-calendar-mode="week"]').click();
        assert.equal(await page.locator('#calendarPeriodTitle').textContent(), '2026/12/28 — 2027/01/03');
        assert.equal(await page.locator('.calendar-week-day').count(), 7);
        await page.locator('[data-calendar-mode="day"]').click();
        assert.equal(await page.locator('#calendarPeriodTitle').textContent(), '2027年1月1日');
        console.log('PASS leap year, February, year boundary and day/week views');

        await page.clock.setSystemTime(new Date('2026-09-17T15:20:00+08:00'));
        await page.clock.runFor(1000);
        await page.evaluate(() => switchView('dashboard'));
        await page.locator('#dashboardToday').click();
        let weatherCalls = 0;
        let weatherFails = false;
        let cityMode = 'success';
        await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({
            status: cityMode === 'failure' ? 503 : 200,
            contentType: 'application/json',
            body: JSON.stringify({results: cityMode === 'empty' ? [] : [{name: '上海', admin1: '上海市', country: '中国', latitude: 31.23, longitude: 121.47}]})
        }));
        await page.route('https://api.open-meteo.com/**', route => {
            weatherCalls++;
            return route.fulfill({status: weatherFails ? 503 : 200, contentType: 'application/json', body: JSON.stringify({current: {temperature_2m: 27.6, weather_code: 2, is_day: 1}})})
        });
        await page.locator('#weatherCity').fill('上海');
        await page.locator('#weatherCityForm button').click();
        await page.locator('#weatherResults button').first().click();
        await page.waitForFunction(() => document.querySelector('#weatherTemperature').textContent === '28°');
        assert.match(await page.locator('#weatherDescription').textContent(), /上海 · 多云/);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('xujianWeatherLocation')).name), '上海');
        const previousCalls = weatherCalls;
        await page.clock.runFor(15 * 60 * 1000);
        await page.waitForFunction(() => document.querySelector('#weatherStatus').textContent.includes('已更新'));
        assert.ok(weatherCalls > previousCalls);
        weatherFails = true;
        await page.evaluate(() => refreshWeather());
        assert.equal(await page.locator('#weatherTemperature').textContent(), '—°');
        assert.match(await page.locator('#weatherStatus').textContent(), /更新失败/);
        weatherFails = false;
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        await page.waitForFunction(() => document.querySelector('#weatherTemperature').textContent === '28°');
        console.log('PASS weather search, stored city, 15-minute refresh, failure state and online recovery');

        for (const mode of ['empty', 'failure']) {
            cityMode = mode;
            await page.locator('#weatherCityForm button').click();
            await page.waitForFunction(() => !document.querySelector('#weatherCityForm button').disabled);
            assert.match(await page.locator('#weatherStatus').textContent(), mode === 'empty' ? /未找到城市/ : /城市查询失败/);
        }
        await page.evaluate(() => Object.defineProperty(navigator, 'geolocation', {configurable: true, value: {getCurrentPosition: (ok, fail) => fail({code: 1})}}));
        await page.locator('#weatherLocate').click();
        assert.match(await page.locator('#weatherStatus').textContent(), /未获得定位授权/);
        await page.evaluate(() => Object.defineProperty(navigator, 'geolocation', {configurable: true, value: {getCurrentPosition: ok => ok({coords: {latitude: 31.23, longitude: 121.47}})}}));
        await page.locator('#weatherLocate').click();
        await page.waitForFunction(() => document.querySelector('#weatherDescription').textContent.includes('当前位置'));
        console.log('PASS missing city, service failure, denied and successful geolocation');

        for (const width of [1440, 1024, 768, 390, 320]) {
            await page.setViewportSize({width, height: 900});
            for (const view of ['dashboard', 'calendar', 'itinerary', 'tasks', 'meetings', 'learning']) {
                await page.evaluate(id => switchView(id), view);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view} overflows at ${width}px`);
            }
        }
        assert.deepEqual(errors, []);
        console.log('PASS all 6 modules at 1440/1024/768/390/320px; no JavaScript errors');
        await page.evaluate(() => switchView('dashboard'));
        await page.setViewportSize({width: 1440, height: 1080});
        await page.screenshot({path: path.join(os.tmpdir(), 'xujian-tested-desktop.png'), fullPage: true});
        await page.setViewportSize({width: 390, height: 844});
        await page.screenshot({path: path.join(os.tmpdir(), 'xujian-tested-mobile.png'), fullPage: true});
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#weatherTemperature').textContent === '28°');
        assert.match(await page.locator('#timeline').textContent(), /自动更新回归日程/);
        console.log('PASS reload restores weather location and saved schedule');

        const blank = await browser.newContext({viewport: {width: 390, height: 844}});
        const freshPage = await blank.newPage();
        freshPage.on('pageerror', error => errors.push(error.message));
        await freshPage.goto(url);
        assert.equal(await freshPage.locator('#loginScreen').isVisible(), true);
        await freshPage.screenshot({path: path.join(os.tmpdir(), 'purr-patch-login.png'), fullPage: true});
        await freshPage.locator('[data-demo-login="fresh"]').click();
        await freshPage.waitForFunction(() => !document.querySelector('#appShell').hidden);
        assert.equal(await freshPage.locator('#pendingCount').textContent(), '0');
        assert.equal(await freshPage.locator('#todayMeetingCount').textContent(), '0');
        assert.match(await freshPage.locator('#timeline').textContent(), /暂无/);
        assert.deepEqual(errors, []);
        console.log('PASS login and fresh account empty states');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
