const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
    const failures = [];
    const errors = [];
    let checked = 0;
    try {
        const page = await browser.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, '../web.html')).href);
        await page.evaluate(() => localStorage.setItem('xujianActiveAccount', 'demo'));
        await page.reload();
        const scenarios = [
            ...['schedule', 'task', 'learning'].map(type => ({type, dialog: 'newDialog'})),
            ...[0, 1, 2].map(step => ({type: 'quick', step, dialog: 'quickMeetingDialog'})),
            ...Array.from({length: 8}, (_, step) => ({type: 'wizard', step, dialog: 'meetingDialog'})),
            ...['meetingTypesDialog', 'peopleDialog', 'meetingInfoDialog', 'meetingCompletionDialog', 'profileDialog'].map(dialog => ({type: dialog, dialog}))
        ];
        for (const [width, height] of [[1440, 1080], [1280, 720], [837, 805], [1024, 600], [768, 500], [390, 844], [320, 568], [844, 390], [390, 320]]) {
            await page.setViewportSize({width, height});
            for (const scenario of scenarios) {
                await page.evaluate(({type, step, dialog}) => {
                    document.querySelectorAll('dialog[open]').forEach(d => d.close());
                    if (['schedule', 'task', 'learning'].includes(type))
                        openCreator(type);
                    else if (type === 'quick') {
                        openQuickMeeting();
                        showQuickStep(step);
                    } else if (type === 'wizard') {
                        openMeetingWizard();
                        showWizardStep(step);
                    } else if (type === 'meetingInfoDialog')
                        openMeetingInfo(0);
                    else {
                        document.getElementById(dialog).showModal();
                        if (type === 'peopleDialog' || type === 'meetingTypesDialog') {
                            const content = document.querySelector(`#${dialog} .modal-scroll`);
                            if (!content.querySelector('[data-layout-fixture]')) {
                                const fixture = document.createElement('div');
                                fixture.dataset.layoutFixture = '';
                                fixture.style.height = '1200px';
                                fixture.textContent = '长列表布局测试';
                                content.prepend(fixture);
                            }
                        }
                    }
                }, scenario);
                for (const atEnd of [false, true]) {
                    const issues = await page.locator(`#${scenario.dialog}`).evaluate((dialog, end) => {
                        const scroll = dialog.querySelector('.modal-scroll');
                        scroll.scrollTop = end ? scroll.scrollHeight : 0;
                        const bounds = dialog.getBoundingClientRect();
                        const form = dialog.querySelector('form').getBoundingClientRect();
                        const issues = [];
                        if (form.bottom > bounds.bottom + .5 || form.top < bounds.top - .5)
                            issues.push(`form exceeds dialog by ${(form.bottom - bounds.bottom).toFixed(1)}px`);
                        if (scroll.scrollHeight > scroll.clientHeight + 1 && scroll.clientHeight < 25)
                            issues.push(`scroll area too short: ${scroll.clientHeight}px`);
                        for (const button of dialog.querySelectorAll('.modal-head button,.modal-actions button')) {
                            if (!button.getClientRects().length || button.disabled)
                                continue;
                            const rect = button.getBoundingClientRect();
                            const name = button.textContent.trim();
                            if (rect.left < Math.max(0, bounds.left) || rect.right > Math.min(innerWidth, bounds.right) || rect.top < Math.max(0, bounds.top) || rect.bottom > Math.min(innerHeight, bounds.bottom)) {
                                issues.push(`${name} clipped`);
                                continue;
                            }
                            for (const fraction of [.2, .5, .8]) {
                                const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height * fraction);
                                if (!hit || !button.contains(hit))
                                    issues.push(`${name} covered at ${fraction}`);
                            }
                        }
                        return issues;
                    }, atEnd);
                    if (issues.length)
                        failures.push(`${width}x${height} ${scenario.type}/${scenario.step ?? ''} ${atEnd ? 'bottom' : 'top'}: ${issues.join(', ')}`);
                    else {
                        for (const button of await page.locator(`#${scenario.dialog} .modal-head button:visible:not(:disabled),#${scenario.dialog} .modal-actions button:visible:not(:disabled)`).all())
                            await button.click({trial: true, timeout: 1500});
                    }
                    checked++;
                }
                if (scenario.type === 'schedule' && width === 837)
                    await page.screenshot({path: path.join(os.tmpdir(), 'purr-patch-dialog-layout.png')});
                await page.locator(`#${scenario.dialog} .modal-head [data-close-dialog]`).click({timeout: 1500});
                assert.equal(await page.locator(`#${scenario.dialog}`).evaluate(d => d.open), false);
            }
            console.log(`CHECKED all modal types/steps at ${width}x${height}`);
        }
        assert.equal(failures.length, 0, failures.slice(0, 24).join('\n'));
        for (const [width, height] of [[837, 805], [390, 844], [390, 320]]) {
            await page.setViewportSize({width, height});
            await page.evaluate(() => openCreator('schedule'));
            await page.locator('#eventForm [name="title"]').fill('操作栏回归日程');
            assert.equal(await page.locator('#resetEventDraft').count(), 0);
            await page.locator('#timeMode').selectOption('none');
            await page.locator('#saveEvent').click();
            assert.equal(await page.locator('#newDialog').evaluate(d => d.open), false);
            await page.evaluate(() => openCreator('task'));
            await page.locator('#newDialog .modal-actions [data-close-dialog]').click();
            assert.equal(await page.locator('#newDialog').evaluate(d => d.open), false);
            await page.evaluate(() => openQuickMeeting());
            await page.locator('#quickNext').click();
            assert.equal(await page.locator('[data-quick-panel="1"]').isVisible(), true);
            await page.locator('#quickPrev').click();
            await page.locator('[name="quickTitle"]').fill('操作栏回归会议');
            await page.locator('#quickSaveDraft').click();
            assert.equal(await page.locator('#quickMeetingDialog').evaluate(d => d.open), false);
            await page.evaluate(() => openTypeLibrary());
            await page.locator('#addMeetingType').click();
            await page.locator('#meetingTypeLibrary input').last().fill('回归类型');
            await page.locator('#saveMeetingTypes').click();
            assert.equal(await page.locator('#meetingTypesDialog').evaluate(d => d.open), false);
            await page.evaluate(() => openPeopleLibrary());
            await page.locator('#addPerson').click();
            await page.locator('#peopleLibrary input').last().fill('回归人员');
            await page.locator('#savePeople').click();
            assert.equal(await page.locator('#peopleDialog').evaluate(d => d.open), false);
            await page.evaluate(() => document.querySelector('#profileEdit').click());
            await page.locator('#displayName').fill('布局测试');
            await page.locator('#saveProfile').click();
            assert.equal(await page.locator('#profileDialog').evaluate(d => d.open), false);
        }
        await page.setViewportSize({width: 390, height: 568});
        for (const shown of [true, false]) {
            await page.evaluate(show => {
                const toast = document.querySelector('#toast');
                toast.textContent = '提示消息不能挡住导航点击';
                toast.classList.toggle('show', show);
            }, shown);
            await page.locator('#mobileNav [data-view="learning"]').click();
            assert.equal(await page.locator('#learning').isVisible(), true);
            await page.locator('#mobileNav [data-view="dashboard"]').click();
        }
        await page.setViewportSize({width: 1024, height: 390});
        await page.locator('#nav [data-view="learning"]').click();
        await page.locator('#profileEdit').click();
        assert.equal(await page.locator('#profileDialog').isVisible(), true);
        await page.locator('#profileDialog .close').click();
        console.log('PASS save/cancel without reset, meeting steps/drafts, library/profile saves, toast click-through and short sidebar navigation');
        assert.deepEqual(errors, []);
        console.log(`PASS ${checked} dialog/scroll combinations; all action buttons fully visible and hit-testable`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
