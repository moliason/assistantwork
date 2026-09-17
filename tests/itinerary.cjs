const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    try {
        const page = await browser.newPage({viewport: {width: 1440, height: 1100}, timezoneId: 'Asia/Shanghai'});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.clock.install({time: new Date('2026-09-17T10:00:00+08:00')});
        await page.goto(pathToFileURL(path.resolve(__dirname, '../web.html')).href);
        await page.evaluate(() => {
            localStorage.setItem('xujianActiveAccount', 'demo');
            localStorage.setItem('scheduleData_demo', '[]');
            localStorage.setItem('taskData_demo', '[]');
        });
        await page.reload();
        await page.locator('[data-view="itinerary"]:visible').click();
        assert.equal(await page.locator('#pageTitle').textContent(), '行程表');
        assert.equal(await page.locator('#nav [data-view="itinerary"]').getAttribute('class'), 'nav-item active');
        assert.equal(await page.locator('#itineraryPanel').isVisible(), true);
        assert.equal(await page.locator('.dashboard-content-grid').isVisible(), false);
        assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
        assert.equal(await page.locator('#itineraryTitle').textContent(), '2026/09/17（星期四）日程安排');

        for (const [title, category, type, start, end, people, place] of [
            ['物流和财务事宜', 'work', '沟通', '16:00', '16:30', '张总、赵总', '张总办公室'],
            ['UDL现状对齐', 'work', '沟通', '16:30', '17:30', '张总、赵总、于肖肖', '智能会议室'],
            ['晚餐餐叙', 'life', '餐叙', '18:00', '20:00', '张总、赵总、于肖肖', '外部餐厅'],
            ['出差交通确认', 'travel', '出行', '08:15', '09:00', '张总', '机场'],
            ['待确认安排', 'pending', '', '', '', '', '']
        ]) {
            await page.locator('#itineraryCreate').click();
            await page.locator('#eventForm [name="title"]').fill(title);
            await page.locator('#eventForm [name="scheduleCategory"]').selectOption(category);
            await page.locator('#eventForm [name="scheduleType"]').fill(type);
            await page.locator('#eventForm [name="scheduleParticipants"]').fill(people);
            await page.locator('#eventForm [name="location"]').fill(place);
            await page.locator('#eventForm [name="timeMode"]').selectOption(start ? 'exact' : 'none');
            if (start) {
                await page.locator('#startTime').fill(start);
                await page.locator('#endTime').fill(end);
            }
            await page.locator('#saveEvent').click();
            await page.waitForFunction(() => !document.querySelector('#newDialog').open);
        }
        assert.equal(await page.locator('#itineraryRows tr').count(), 5);
        assert.equal(await page.locator('#itineraryRows .itinerary-date').getAttribute('rowspan'), '5');
        const work = page.locator('#itineraryRows tr').filter({hasText: '物流和财务事宜'});
        assert.match(await work.textContent(), /16:0016:3030沟通物流和财务事宜张总、赵总张总办公室/);
        const travel = page.locator('#itineraryRows tr').first();
        assert.equal(await travel.getAttribute('data-category'), 'travel');
        assert.match(await travel.textContent(), /08:1509:0045/);
        assert.equal(await page.locator('#itineraryRows [data-category="life"]').count(), 1);
        assert.match(await page.locator('#itineraryRows [data-category="pending"]').textContent(), /待定———未填写/);
        console.log('PASS add all 4 categories, chronological order, minute precision, durations and merged date');

        let mockTimeZone = 'Asia/Shanghai';
        await page.route('https://api.open-meteo.com/**', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({
            timezone: mockTimeZone,
            current: {temperature_2m: 25, weather_code: 2, is_day: 1},
            daily: {time: ['2026-09-17', '2026-09-18'], temperature_2m_min: [18, 20], temperature_2m_max: [26, 28], weather_code: [2, 61], wind_speed_10m_max: [12, 16], apparent_temperature_min: [17, 19], apparent_temperature_max: [27, 29]}
        })}));
        await page.evaluate(() => refreshWeather({name: '上海', latitude: 31.23, longitude: 121.47}));
        assert.match(await page.locator('#itineraryWeather').textContent(), /18°C ～ 26°C.*多云.*12 km\/h.*17°C ～ 27°C/);
        await page.locator('#itineraryNextDay').click();
        assert.match(await page.locator('#dashboardDateLabel').textContent(), /9月17日/);
        assert.match(await page.locator('#itineraryWeather').textContent(), /20°C ～ 28°C.*小雨/);
        assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
        await page.locator('#itineraryCreate').click();
        assert.equal(await page.locator('#eventForm [name="date"]').inputValue(), '2026-09-18');
        await page.locator('#newDialog [data-close-dialog]').first().click();
        await page.locator('#itineraryNextDay').click();
        assert.match(await page.locator('#itineraryWeather').textContent(), /暂无天气预报/);
        await page.locator('#itineraryToday').click();
        console.log('PASS date-matched weather, missing forecasts and selected-date form default');

        await page.locator('#itineraryRows button', {hasText: '物流和财务事宜'}).click();
        assert.equal(await page.locator('#eventForm [name="scheduleParticipants"]').inputValue(), '张总、赵总');
        assert.equal(await page.locator('#eventForm [name="scheduleType"]').inputValue(), '沟通');
        await page.locator('#endTime').fill('15:00');
        await page.locator('#saveEvent').click();
        assert.match(await page.locator('#timeError').textContent(), /必须晚于/);
        await page.locator('#endTime').fill('');
        await page.locator('#saveEvent').click();
        assert.match(await page.locator('#timeError').textContent(), /补全/);
        await page.locator('#endTime').fill('17:00');
        await page.locator('#saveEvent').click();
        await page.waitForFunction(() => !document.querySelector('#newDialog').open);
        assert.match(await work.textContent(), /16:0017:0060/);
        await page.locator('[data-module-perspective="itinerary"][data-value="boss"]').click();
        assert.equal(await page.locator('#itineraryRows tr').count(), 5);
        await page.locator('#itineraryRows button', {hasText: '待确认安排'}).click();
        await page.locator('#eventForm [name="owner"]').selectOption('mine');
        await page.locator('#eventForm [name="timeMode"]').selectOption('end');
        await page.locator('#endTime').fill('21:15');
        await page.locator('#saveEvent').click();
        await page.waitForFunction(() => !document.querySelector('#newDialog').open);
        assert.equal(await page.locator('#itineraryRows tr').count(), 4);
        await page.locator('[data-module-perspective="itinerary"][data-value="mine"]').click();
        assert.equal(await page.locator('#itineraryRows tr').count(), 5);
        await page.locator('#itineraryRows button', {hasText: '待确认安排'}).click();
        assert.equal(await page.locator('#timeMode').inputValue(), 'end');
        assert.equal(await page.locator('#endTime').inputValue(), '21:15');
        await page.locator('#newDialog [data-close-dialog]').first().click();
        console.log('PASS editing, invalid/missing range validation, end-only time and owner filter');

        await page.clock.runFor(2500);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({path: path.join(os.tmpdir(), 'purr-patch-itinerary-desktop.png'), fullPage: true});
        for (const width of [1440, 1024, 768, 390, 320]) {
            await page.setViewportSize({width, height: 900});
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflows at ${width}px`);
            assert.ok(await page.locator('.itinerary-scroll').evaluate(el => el.scrollWidth >= el.clientWidth));
        }
        await page.setViewportSize({width: 390, height: 844});
        await page.locator('#itineraryPanel').scrollIntoViewIfNeeded();
        await page.screenshot({path: path.join(os.tmpdir(), 'purr-patch-itinerary-mobile.png')});
        await page.reload();
        await page.locator('[data-view="itinerary"]:visible').click();
        assert.equal(await page.locator('#itineraryRows tr').count(), 5);
        assert.match(await page.locator('#itineraryRows [data-category="work"]').first().textContent(), /张总、赵总/);
        await page.clock.setSystemTime(new Date('2026-09-17T23:59:59+08:00'));
        await page.clock.runFor(2000);
        assert.match(await page.locator('#itineraryTitle').textContent(), /2026\/09\/18/);
        assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
        assert.deepEqual(errors, []);
        console.log('PASS 320–1440px layouts, reload persistence and midnight rollover; no JS errors');
        await page.evaluate(() => {
            schedule.push({date: baseDate, title: '旧版日程', time: '09:00–10:30', owner: 'boss', place: '原地点', priority: '普通'});
            renderTimeline();
        });
        assert.match(await page.locator('#itineraryRows').textContent(), /09:0010:3090/);
        assert.equal(await page.locator('#itineraryRows tr').getAttribute('data-category'), 'work');
        page.once('dialog', dialog => dialog.accept());
        await page.evaluate(() => deleteSchedule(schedule.length - 1));
        assert.match(await page.locator('#itineraryRows').textContent(), /暂无行程/);
        console.log('PASS legacy schedules and deletion synchronize to the table');
        await page.clock.setSystemTime(new Date('2026-09-17T10:00:00+08:00'));
        await page.clock.runFor(1000);
        const originalRecords = await page.evaluate(() => localStorage.getItem('scheduleData_demo'));
        mockTimeZone = 'America/New_York';
        await page.evaluate(() => refreshWeather({name: '纽约', latitude: 40.71, longitude: -74.01}));
        assert.match(await page.locator('#itineraryClockPlace').textContent(), /纽约/);
        assert.match(await page.locator('#itineraryClockDate').textContent(), /9月16日/);
        assert.match(await page.locator('#itineraryTitle').textContent(), /2026\/09\/16/);
        assert.match(await page.locator('#itineraryLiveTime').textContent(), /^22:00:/);
        assert.equal(await page.locator('#liveDate').textContent(), await page.locator('#itineraryClockDate').textContent());
        const clockBefore = await page.locator('#itineraryLiveTime').textContent();
        await page.clock.runFor(2100);
        assert.notEqual(await page.locator('#itineraryLiveTime').textContent(), clockBefore);
        assert.equal(await page.evaluate(() => localStorage.getItem('scheduleData_demo')), originalRecords);
        await page.locator('#itineraryPrevDay').click();
        await page.clock.setSystemTime(new Date('2026-09-17T04:00:00Z'));
        await page.clock.runFor(1000);
        assert.match(await page.locator('#itineraryClockDate').textContent(), /9月17日/);
        assert.match(await page.locator('#itineraryTitle').textContent(), /2026\/09\/15/);
        await page.locator('#itineraryToday').click();
        assert.match(await page.locator('#itineraryTitle').textContent(), /2026\/09\/17/);
        await page.reload();
        await page.locator('[data-view="itinerary"]:visible').click();
        assert.match(await page.locator('#itineraryClockPlace').textContent(), /纽约/);
        assert.match(await page.locator('#itineraryLiveTime').textContent(), /^00:00:/);
        assert.deepEqual(errors, []);
        console.log('PASS homepage location/timezone sync, second ticking, local midnight, history preservation and timezone reload');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
