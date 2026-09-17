const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    try {
        const page = await browser.newPage({viewport: {width: 390, height: 844}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', {configurable: true, value: {getCurrentPosition: ok => ok({coords: {latitude: 31.23, longitude: 121.47}})}}));
        let mode = 'success';
        let releaseLookup;
        await page.route('https://api.bigdatacloud.net/**', async route => {
            assert.equal(new URL(route.request().url()).searchParams.get('localityLanguage'), 'zh');
            if (mode === 'delayed')
                await new Promise(resolve => { releaseLookup = resolve });
            await route.fulfill({status: mode === 'failure' ? 503 : 200, contentType: 'application/json', body: JSON.stringify(mode === 'empty' ? {} : {city: '上海市', locality: '黄浦区', lookupSource: mode === 'ip' ? 'ipGeolocation' : 'reverseGeocoding'})});
        });
        await page.route('https://api.open-meteo.com/**', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({timezone: 'Asia/Shanghai', current: {temperature_2m: 25, weather_code: 2, is_day: 1}})}));
        await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({results: [{name: '杭州市', latitude: 30.25, longitude: 120.15}]})}));
        await page.goto(process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../web.html')).href);
        await page.locator('[data-demo-login="demo"]').click();
        await page.locator('#weatherLocate').click();
        await page.waitForFunction(() => document.querySelector('#itineraryClockPlace').textContent === '上海市 · 黄浦区 · 当地时间');
        assert.match(await page.locator('#weatherDescription').textContent(), /上海市 · 黄浦区/);
        assert.match(await page.locator('#livePlace').textContent(), /上海市 · 黄浦区/);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('xujianWeatherLocation')).name), '上海市 · 黄浦区');
        await page.reload();
        assert.match(await page.locator('#itineraryClockPlace').textContent(), /上海市 · 黄浦区/);
        await page.locator('#weatherCity').fill('杭州');
        await page.locator('#weatherCityForm button').click();
        await page.locator('#weatherResults button').click();
        await page.waitForFunction(() => document.querySelector('#itineraryClockPlace').textContent === '杭州市 · 当地时间');
        console.log('PASS GPS real locality, synchronized labels, stored name and manual city changes');

        for (const failure of ['failure', 'empty', 'ip']) {
            mode = failure;
            await page.locator('#weatherLocate').click();
            await page.waitForFunction(() => document.querySelector('#weatherStatus').textContent.includes('地名获取失败'));
            assert.match(await page.locator('#itineraryClockPlace').textContent(), /地名暂不可用/);
            assert.equal(await page.locator('#weatherTemperature').textContent(), '25°');
        }
        console.log('PASS reverse lookup failure/empty/IP fallback never masquerades as an actual address');

        mode = 'delayed';
        await page.locator('#weatherLocate').click();
        await page.waitForFunction(() => document.querySelector('#weatherStatus').textContent.includes('解析真实地名'));
        await page.locator('#weatherCity').fill('杭州');
        await page.locator('#weatherCityForm button').click();
        await page.locator('#weatherResults button').click();
        await page.waitForFunction(() => document.querySelector('#itineraryClockPlace').textContent === '杭州市 · 当地时间');
        releaseLookup();
        await page.waitForFunction(() => !document.querySelector('#weatherLocate').disabled);
        assert.equal(await page.locator('#itineraryClockPlace').textContent(), '杭州市 · 当地时间');
        console.log('PASS delayed geolocation cannot overwrite a newer manually selected city');

        await page.evaluate(() => {
            localStorage.setItem('xujianWeatherLocation', JSON.stringify({name: '当前位置', latitude: 31.23, longitude: 121.47, timeZone: 'Asia/Shanghai'}));
        });
        await page.context().grantPermissions(['geolocation']);
        mode = 'success';
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#itineraryClockPlace').textContent === '上海市 · 黄浦区 · 当地时间');
        assert.deepEqual(errors, []);
        console.log('PASS previously authorized generic location automatically upgrades to a real name');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
