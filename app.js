const accountCatalog = {
    demo: {
        password: '123456',
        name: '测试账号',
        blank: false
    },
    fresh: {
        password: '123456',
        name: '全新账号',
        blank: true
    }
};
const activeAccount = localStorage.getItem('xujianActiveAccount');
const initialNow = new Date();
var baseDate = `${initialNow.getFullYear()}-${String(initialNow.getMonth() + 1).padStart(2, '0')}-${String(initialNow.getDate()).padStart(2, '0')}`
  , dashboardDate = baseDate
  , itineraryDate = baseDate
  , taskDate = baseDate
  , taskPriorityFilter = 'all'
  , calendarMode = 'month'
  , itineraryForecast = null
  , currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  , currentPlaceName = ''
  , cleanAccountKey = activeAccount === 'fresh' ? 'fresh_v2' : activeAccount || 'guest';
const demoDate = localStorage.getItem('xujianDemoDate') || baseDate;
if (activeAccount === 'demo')
    localStorage.setItem('xujianDemoDate', demoDate);
const schedule = [{
    period: '上午',
    time: '09:00',
    title: '季度经营分析会资料准备',
    owner: 'boss',
    place: '第一会议室 · 会前材料',
    priority: '重要',
    date: demoDate
}, {
    period: '上午',
    time: '10:30',
    title: '准备董事会汇报材料',
    owner: 'mine',
    place: '需确认财务数据与附件',
    priority: '进行中',
    date: demoDate
}, {
    period: '下午',
    time: '14:00',
    title: '品牌合作客户来访',
    owner: 'boss',
    place: '贵宾会议室 · 联系人：陈经理',
    priority: '重要',
    date: demoDate
}, {
    period: '下午',
    time: '16:30',
    title: '整理经营会会议纪要',
    owner: 'mine',
    place: '今日 18:00 前完成',
    priority: '紧急',
    date: demoDate
}, {
    period: '晚上',
    time: '19:00',
    title: '晚宴接待',
    owner: 'boss',
    place: '云锦餐厅 · 预留车辆',
    priority: '普通',
    date: demoDate
}];
const tasks = [{
    date: shiftDate(demoDate, 1),
    title: '确认上海出差航班与酒店',
    meta: '明天 14:00 截止 · 关联：上海出差',
    priority: '紧急',
    owner: 'boss'
}, {
    title: '整理季度经营会会议纪要',
    date: demoDate,
    meta: '今天 18:00 截止 · 会后跟踪',
    priority: '紧急',
    owner: 'mine'
}, {
    title: '打印董事会汇报资料 10 份',
    date: shiftDate(demoDate, 2),
    meta: `${dateLabel(shiftDate(demoDate, 2), false)}截止 · 会前准备`,
    priority: '重要',
    owner: 'boss'
}, {
    title: '跟进品牌合作合同审批',
    date: shiftDate(demoDate, 3),
    meta: `${dateLabel(shiftDate(demoDate, 3), false)}截止 · 项目跟进`,
    priority: '普通',
    owner: 'mine'
}, {
    title: '确认晚宴菜单及座位安排',
    date: demoDate,
    meta: '今天 16:00 截止 · 接待安排',
    priority: '普通',
    owner: 'boss'
}, {
    title: '发送经营会参会通知',
    date: shiftDate(demoDate, -1),
    meta: '已于昨天完成',
    priority: '已完成',
    done: true,
    owner: 'mine'
}];
const storedSchedule = activeAccount ? JSON.parse(localStorage.getItem(`scheduleData_${activeAccount}`) || 'null') : null
  , storedTasks = activeAccount ? JSON.parse(localStorage.getItem(`taskData_${activeAccount}`) || 'null') : null;
if (storedSchedule)
    schedule.splice(0, schedule.length, ...storedSchedule);
if (storedTasks)
    tasks.splice(0, tasks.length, ...storedTasks);
const reminders = [{
    title: '上海行程确认',
    date: shiftDate(demoDate, 1),
    priority: '紧急'
}, {
    title: '客户会议纪要',
    date: shiftDate(demoDate, 2),
    priority: '普通'
}];
const meetings = [{
    date: demoDate,
    title: '季度经营分析会',
    type: '决策会',
    meta: '今天 09:00 · 第一会议室',
    host: '总经理',
    participants: '经营班子、财务负责人',
    goal: '确认季度经营结果，形成下阶段重点决策与责任分工。',
    progress: 4,
    owner: 'boss'
}, {
    title: '品牌合作项目沟通',
    type: '信息同步会',
    date: shiftDate(demoDate, 2),
    meta: `${dateLabel(shiftDate(demoDate, 2), false)} 下午 · 贵宾会议室`,
    host: '总经理',
    participants: '品牌部、法务、客户代表',
    goal: '同步合作方案，确认合同与交付节点。',
    progress: 2,
    owner: 'boss'
}, {
    title: '董事会月度例会',
    type: '决策会',
    date: shiftDate(demoDate, 5),
    meta: `${dateLabel(shiftDate(demoDate, 5), false)} 上午 · 董事会议室`,
    host: '董事长',
    participants: '董事会成员、财务负责人',
    goal: '审议月度经营事项及需表决议题。',
    progress: 1,
    owner: 'boss'
}, {
    title: '上海项目复盘会',
    type: '复盘会',
    date: shiftDate(demoDate, 8),
    meta: `${dateLabel(shiftDate(demoDate, 8), false)} 下午 · 线上会议`,
    host: '项目负责人',
    participants: '项目组、总经办',
    goal: '复盘执行结果，沉淀问题与改进动作。',
    progress: 0,
    owner: 'mine'
}];
const workflow = ['明确类型', '会前准备', '会议进行', '会议记录', '结束确认', '纪要整理', '会后跟进'];
const meetingChecks = {
    before: ['明确会议目标和预期输出', '确定会议类型', '确认必须参会、建议参会和知会人员', '确认关键人员时间', '确定日期、时间和时长', '预订并检查会议室或线上链接', '提前发送材料并标明阅读要求', '发送正式议程与会前提醒'],
    during: ['准时开始，说明目标、议程和预期输出', '确认线上线下设备正常', '按议程和时间推进', '区分事实、观点、决策和待办', '控制跑题与无效争论', '记录关键数据、分歧、风险和依赖', '每项行动明确责任人、日期和验收标准', '记录待确认事项并明确下次安排'],
    after: ['整理纪要，突出结论与行动项', '在约定时间内发送纪要', '明确确认截止时间', '建立或更新行动项台账', '按期追踪进展、风险和依赖', '对延期事项升级并调整', '完成事项进行验收和关闭', '下一次会议优先回顾未完成行动项']
};
let activeMeeting = 0;
let perspective = 'mine';
const modulePerspectives = {
    calendar: 'mine',
    itinerary: 'mine',
    tasks: 'mine',
    meetings: 'mine'
};
function isTodayMeeting(m) {
    return m.status !== '草稿' && meetingDateOf(m) === baseDate
}
function isTomorrowMeeting(m) {
    return m.status !== '草稿' && meetingDateOf(m) === shiftDate(baseDate, 1)
}
function isTodayTask(t) {
    return !t.done && taskDateOf(t) === baseDate
}
function renderTimeline() {
    const scheduleItems = schedule.map( (e, index) => ({
        ...e,
        index,
        kind: '日程'
    })).filter(e => (!e.date || e.date === baseDate) && (perspective === 'mine' || e.owner === 'boss'))
      , meetingItems = meetings.map( (m, index) => ({
        title: m.title,
        owner: m.owner,
        place: m.meta,
        time: m.meta.match(/\d{2}:\d{2}/)?.[0] || '会议',
        priority: m.status || '会议',
        index,
        kind: '会议'
    })).filter(m => isTodayMeeting(meetings[m.index]) && (perspective === 'mine' || m.owner === 'boss'))
      , visible = [...scheduleItems, ...meetingItems];
    document.querySelector('#timeline').innerHTML = visible.map(e => `<div class="time-row"><span class="time-label">${e.time || e.period || '当天'}</span><div class="event ${e.kind === '会议' ? 'meeting-event' : ''}" style="--event:${e.owner === 'boss' ? '#002fa7' : '#79aff2'}"><span class="arrangement-kind">${e.kind}</span><div class="event-main"><b>${e.title}</b><small>${e.place}</small></div><span class="tag ${e.priority === '紧急' ? 'urgent' : 'normal'}">${e.owner === 'boss' ? '老板' : '我的'} · ${e.priority}</span>${e.kind === '日程' ? `<div class="event-actions"><button data-edit-schedule="${e.index}">编辑</button><button data-delete-schedule="${e.index}">删除</button></div>` : ''}</div></div>`).join('') || '<div class="empty-state">当前视角今天暂无安排</div>';
    document.querySelectorAll('[data-edit-schedule]').forEach(b => b.onclick = () => openScheduleEdit(+b.dataset.editSchedule));
    document.querySelectorAll('[data-delete-schedule]').forEach(b => b.onclick = () => deleteSchedule(+b.dataset.deleteSchedule));
    renderDashboardStats()
}
function renderItinerary() {
    const date = new Date(`${itineraryDate}T00:00:00`)
      , body = document.querySelector('#itineraryRows')
      , forecast = itineraryForecast?.days.find(day => day.date === itineraryDate)
      , rows = schedule.map((item, index) => {
        const times = (item.time || '').match(/\d{2}:\d{2}/g) || []
          , start = item.timeMode ? item.startTime || '' : times[0] || ''
          , end = item.timeMode ? item.endTime || '' : times[1] || '';
        return {...item, index, start, end}
    }).filter(item => (!item.date || item.date === itineraryDate) && (modulePerspectives.itinerary === 'mine' || item.owner === 'boss')).sort((a, b) => (a.start || a.end || '99:00').localeCompare(b.start || b.end || '99:00'));
    document.querySelector('#itineraryDateLabel').textContent = dateLabel(itineraryDate);
    document.querySelector('#itineraryTitle').textContent = `${itineraryDate.replaceAll('-', '/')}（星期${'日一二三四五六'[date.getDay()]}）日程安排`;
    document.querySelector('#itineraryWeather').textContent = forecast ? `${itineraryForecast.place} · 当日预报\n${forecast.summary}` : itineraryForecast ? '所选日期暂无天气预报，不使用今日天气代替。' : '天气数据未获取，请点击“设置天气城市”选择城市或重试。';
    body.replaceChildren();
    rows.forEach((item, rowIndex) => {
        const row = document.createElement('tr')
          , category = ['work', 'life', 'pending', 'travel'].includes(item.category) ? item.category : 'work'
          , labels = {work: '工作安排', life: '生活安排', pending: '未安排', travel: '出差'}
          , hour = Number((item.start || item.end).slice(0, 2))
          , period = item.start || item.end ? hour < 6 ? '凌晨' : hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上' : ['上午', '下午', '晚上'].includes(item.period) ? item.period : '待定';
        let duration = '—';
        if (item.start && item.end) {
            const [startHour, startMinute] = item.start.split(':').map(Number)
              , [endHour, endMinute] = item.end.split(':').map(Number)
              , minutes = (endHour - startHour) * 60 + endMinute - startMinute;
            if (minutes > 0)
                duration = String(minutes)
        }
        row.dataset.category = category;
        row.setAttribute('aria-label', labels[category]);
        const values = [rowIndex + 1, itineraryDate.replaceAll('-', '/'), period, item.start || '—', item.end || '—', duration, item.scheduleType || '未填写', item.title, item.participants || '未填写', item.place || '未填写'];
        values.forEach((value, column) => {
            if (column === 1 && rowIndex > 0)
                return;
            const cell = document.createElement('td');
            if (column === 1) {
                cell.rowSpan = rows.length;
                cell.className = 'itinerary-date'
            }
            if (column === 7) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = value;
                button.title = `${labels[category]} · 点击编辑`;
                button.onclick = () => openScheduleEdit(item.index);
                cell.append(button)
            } else
                cell.textContent = value;
            row.append(cell)
        });
        const actions = row.insertCell();
        actions.className = 'itinerary-actions';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '删除';
        remove.setAttribute('aria-label', `删除行程：${item.title}`);
        remove.onclick = () => deleteSchedule(item.index);
        actions.append(remove);
        body.append(row)
    });
    if (!rows.length) {
        const row = body.insertRow()
          , cell = row.insertCell();
        cell.colSpan = 11;
        cell.className = 'itinerary-empty';
        cell.textContent = '这一天暂无行程，点击“添加行程”开始安排。'
    }
}
function renderBoss() {
    const target = document.querySelector('#bossCards');
    if (!target)
        return;
    target.innerHTML = schedule.filter(e => e.owner === 'boss').map( (e, i) => `<article class="person-event"><div class="date-pill"><b>12</b><small>8月</small></div><div class="details"><b>${e.title}</b><small>${e.period} ${e.time} · ${e.place}</small></div><span class="tag normal">${e.priority}</span></article>`).join('')
}
function toggleTask(index) {
    tasks[index].done = !tasks[index].done;
    if (activeAccount)
        localStorage.setItem(`taskData_${activeAccount}`, JSON.stringify(tasks));
    renderTasks();
    updateCounts()
}
function renderTasks() {
    const visible = tasks.map( (t, i) => ({
        ...t,
        index: i
    })).filter(t => modulePerspectives.tasks === 'mine' || t.owner === 'boss');
    document.querySelector('#taskList').innerHTML = visible.map(t => `<div class="task-row owner-${t.owner} ${t.done ? 'done' : ''}" data-task="${t.index}"><button class="task-check">${t.done ? '✓' : ''}</button><div class="owner-marker">${t.owner === 'boss' ? '老板重点' : '我的任务'}</div><div class="details"><b>${t.title}</b><small>${t.meta}</small></div><span class="tag ${t.priority === '紧急' ? 'urgent' : 'normal'}">${t.priority}</span></div>`).join('') || '<div class="empty-state">当前视角暂无任务</div>';
    document.querySelectorAll('#taskList .task-check').forEach(b => b.onclick = () => toggleTask(+b.parentElement.dataset.task))
}
function renderMeetings() {
    const list = document.querySelector('#meetingCards');
    const visible = meetings.map( (m, i) => ({
        ...m,
        index: i
    })).filter(m => modulePerspectives.meetings === 'mine' || m.owner === 'boss');
    if (!visible.some(m => m.index === activeMeeting))
        activeMeeting = visible[0]?.index ?? 0;
    document.querySelector('#meetingCount').textContent = `${visible.length} 场`;
    list.innerHTML = visible.map(m => `<button class="meeting-list-item owner-${m.owner} ${m.index === activeMeeting ? 'active' : ''}" data-meeting="${m.index}"><span class="owner-marker">${m.owner === 'boss' ? '老板重点' : '我的会议'}</span><span class="meeting-status">${m.status || '已发布'}</span><strong>${m.title}</strong><small>${m.meta}</small><footer><span>${m.type}</span><div class="mini-progress"><i style="width:${Math.round(m.progress / 7 * 100)}%"></i></div></footer></button>`).join('') || '<div class="account-empty"><b>当前视角暂无会议</b>可点击右上角新建会议</div>';
    list.querySelectorAll('[data-meeting]').forEach(b => b.onclick = () => {
        activeMeeting = +b.dataset.meeting;
        renderMeetings()
    }
    );
    const m = meetings[activeMeeting];
    if (!visible.length) {
        document.querySelector('#meetingDetail').innerHTML = '<div class="panel account-empty"><b>暂无会议详情</b>创建会议后，完整流程会显示在这里</div>';
        return
    }
    document.querySelector('#meetingDetail').innerHTML = `<article class="meeting-overview"><header><div><h2>${m.title}</h2><p>${m.goal}</p></div><span class="meeting-type">${m.type}</span></header><div class="meeting-meta"><span>时间 <b>${m.meta.split(' · ')[0]}</b></span><span>地点 <b>${m.meta.split(' · ')[1]}</b></span><span>主持人 <b>${m.host}</b></span><span>参会人 <b>${m.participants}</b></span></div></article><article class="panel"><div class="panel-head"><div><h2>会议流程框架 1.0</h2><p>当前推进至第 ${Math.min(m.progress + 1, 7)} 个环节</p></div><span class="tag normal">${Math.round(m.progress / 7 * 100)}%</span></div><div class="workflow">${workflow.map( (s, i) => `<div class="workflow-step ${i < m.progress ? 'done' : i === m.progress ? 'active' : ''}">${i + 1}. ${s}</div>`).join('')}</div></article><div class="meeting-columns"><article class="panel check-section"><h3>总检查清单</h3>${renderCheckGroup('会前', meetingChecks.before)}${renderCheckGroup('会中', meetingChecks.during)}${renderCheckGroup('会后', meetingChecks.after)}</article><article class="panel notes-section"><h3>会议记录模板</h3><textarea>会议主题：${m.title}\n会议类型：${m.type}\n会议目标：${m.goal}\n\n一、核心结论\n1. \n\n二、决策事项\n1. \n\n三、行动项（事项 / 责任人 / 截止日期 / 验收标准）\n1. \n\n四、风险、分歧与待确认事项\n1. </textarea><div class="confirm-list"><span>✓ 今天已做出的决策有哪些？</span><span>✓ 哪些问题仍未解决，由谁负责？</span><span>✓ 是否存在跨部门、客户或其他部门升级问题？</span><span>✓ 下次会议安排是否明确？</span></div><h3 style="margin-top:18px">会后跟进机制</h3><div class="follow-actions"><div><b>1</b>建立行动台账</div><div><b>2</b>按期紧急提醒</div><div><b>3</b>催办与升级沟通</div><div><b>4</b>验收关闭</div></div></article></div>`;
    document.querySelectorAll('.meeting-check input').forEach(x => x.onchange = () => {
        m.progress = Math.max(m.progress, 1);
        renderMeetings()
    }
    );
}
function renderCheckGroup(name, items) {
    return `<div class="check-group"><div class="check-group-title">${name}</div>${items.map( (x, i) => `<label class="meeting-check"><input type="checkbox" ${activeMeeting === 0 && i < 2 ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>`
}
const knowledge = [['亚马逊平台知产维权规则', '平台投诉与申诉机制', '已学习'], ['美国知产监管体系', '机构分工与执法路径', '今日重点'], ['版权保护逻辑', '权利基础与侵权判断', '待深入'], ['337 调查程序', 'ITC 调查流程与救济', '待学习'], ['CBP 海关备案流程及核心要点', '边境保护与备案实务', '待学习']];
function renderLearning() {
    const target = document.querySelector('#knowledgeList');
    if (target)
        target.innerHTML = knowledge.map( (x, i) => `<div class="knowledge-item"><span class="knowledge-index">${i + 1}</span><div><b>${x[0]}</b><small>${x[1]}</small></div><span class="knowledge-state">${x[2]}</span></div>`).join('')
}
function renderCalendar() {
    let heads = ['一', '二', '三', '四', '五', '六', '日'].map(x => `<div class="day head">周${x}</div>`).join('');
    let days = [];
    for (let i = 27; i <= 31; i++)
        days.push(`<div class="day muted"><span>${i}</span></div>`);
    for (let i = 1; i <= 31; i++) {
        let ev = '';
        if ([3, 12, 17, 20, 26].includes(i))
            ev = `<div class="mini-event boss-event"><b>老板</b>${i === 12 ? '经营分析会' : '老板日程'}</div>`;
        if (modulePerspectives.calendar === 'mine' && [7, 12, 14, 21].includes(i))
            ev += `<div class="mini-event mine"><b>我的</b>${i === 12 ? '整理纪要' : '我的日程'}</div>`;
        days.push(`<div class="day ${i === 12 ? 'today' : ''}"><span>${i}</span>${ev}</div>`)
    }
    document.querySelector('#monthGrid').innerHTML = heads + days.join('')
}
function renderDashboardTasks() {
    const target = document.querySelector('#dashboardTaskList');
    if (!target)
        return;
    const today = tasks.map( (t, index) => ({
        ...t,
        index
    })).filter(isTodayTask);
    target.innerHTML = today.map(t => `<label class="dashboard-task owner-${t.owner}"><input type="checkbox" data-dashboard-task="${t.index}"><span><b>${t.title}</b><small>${t.owner === 'boss' ? '老板重点任务' : '我的任务'} · ${t.meta}</small></span></label>`).join('') || '<div class="empty-state compact">今日暂无待办任务</div>';
    document.querySelectorAll('[data-dashboard-task]').forEach(x => x.onchange = () => toggleTask(+x.dataset.dashboardTask))
}
function renderDashboardStats() {
    const todayTasks = tasks.filter(isTodayTask)
      , todayMeetings = meetings.filter(isTodayMeeting)
      , tomorrowMeetings = meetings.filter(isTomorrowMeeting);
    document.querySelector('#pendingCount').textContent = todayTasks.length;
    document.querySelector('#todayTaskHint').textContent = todayTasks.length ? `${todayTasks.filter(t => t.owner === 'boss').length} 项老板重点任务` : '暂无今日待办';
    document.querySelector('#todayMeetingCount').textContent = todayMeetings.length;
    document.querySelector('#tomorrowMeetingCount').textContent = tomorrowMeetings.length;
    renderDashboardTasks()
}
function updateCounts() {
    const total = tasks.length
      , completed = tasks.filter(t => t.done).length
      , pending = total - completed
      , percent = total ? Math.round(completed / total * 100) : 0;
    document.querySelector('#taskBadge').textContent = pending;
    document.querySelector('#taskProgressText').textContent = `${completed} / ${total} 项已完成`;
    document.querySelector('#taskProgressBar').style.width = `${percent}%`;
    renderDashboardStats()
}
function renderReminders() {
    const target = document.querySelector('#reminderList');
    if (!target)
        return;
    const today = new Date(`${baseDate}T00:00:00`);
    target.innerHTML = reminders.map( (r, i) => {
        const d = new Date(`${r.date}T00:00:00`)
          , days = Math.round((d - today) / 86400000)
          , parts = r.date.split('-');
        return `<div class="deadline-item"><div class="datebox ${i ? 'bluebox' : ''}"><b>${+parts[2]}</b><small>${+parts[1]}月</small></div><div><b>${r.title}</b><small>${+parts[1]}月${+parts[2]}日 · ${days === 0 ? '就是今天' : days > 0 ? `还有 ${days} 天` : `已过 ${Math.abs(days)} 天`}</small></div><span class="tag ${r.priority === '紧急' ? 'urgent' : 'normal'}">${r.priority}</span></div>`
    }
    ).join('')
}
const titles = {
    dashboard: ['你好', '今天的日程、任务和会议已为你整理好'],
    calendar: ['日程日历', '按日、周、月统筹所有安排'],
    itinerary: ['行程表', '按日期查看行程、参与人员与地点'],
    boss: ['老板日程', '单独查看老板的全部安排'],
    tasks: ['任务清单', '把每个时间节点稳稳落实'],
    meetings: ['会议管理', '会前、会中、会后完整闭环'],
    learning: ['每日学习 / 阅读', '把每天的输入沉淀成阶段性成果']
};
function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    document.querySelectorAll('[data-view]').forEach(v => v.classList.toggle('active', v.dataset.view === id));
    document.querySelector('#pageTitle').textContent = titles[id][0];
    document.querySelector('#pageSub').textContent = titles[id][1];
    document.querySelector('#dashboardCreateActions').hidden = id !== 'dashboard';
    if (id === 'itinerary')
        renderItinerary();
    window.scrollTo(0, 0)
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => switchView(b.dataset.go));
const dialog = document.querySelector('#newDialog')
  , eventForm = document.querySelector('#eventForm');
const createConfig = {
    schedule: {
        title: '新建日程',
        desc: '记录行程日期、时间区间、地点与所属对象',
        label: '日程标题',
        placeholder: '例如：客户来访或上海出差',
        save: '保存日程'
    },
    task: {
        title: '新建任务',
        desc: '记录待办事项、任务类型、截止日期与优先级',
        label: '任务标题',
        placeholder: '例如：整理会议纪要',
        save: '保存任务'
    },
    meeting: {
        title: '新建会议',
        desc: '记录会议类型、目标、主持人、参会人及时间地点',
        label: '会议主题',
        placeholder: '例如：季度经营分析会',
        save: '保存会议'
    },
    learning: {
        title: '新建学习记录',
        desc: '记录今天的学习主题、用时、总结和下一步计划',
        label: '学习主题',
        placeholder: '例如：美国知识产权监管体系',
        save: '保存学习记录'
    }
};
let editingScheduleIndex = null;
function openCreator(type='schedule') {
    editingScheduleIndex = null;
    const c = createConfig[type];
    eventForm.reset();
    eventForm.elements.createType.value = type;
    eventForm.elements.date.value = baseDate;
    document.querySelector('#createTitle').textContent = c.title;
    document.querySelector('#createDesc').textContent = c.desc;
    document.querySelector('#titleLabel').textContent = c.label;
    eventForm.elements.title.placeholder = c.placeholder;
    document.querySelector('#dateLabel').textContent = type === 'task' ? '截止日期' : type === 'learning' ? '学习日期' : '日期';
    document.querySelector('#saveEvent').textContent = c.save;
    document.querySelectorAll('.schedule-field,.task-field,.meeting-field,.learning-field').forEach(el => el.hidden = !el.classList.contains(`${type}-field`));
    const ownerLabel = eventForm.elements.owner.closest('label');
    ownerLabel.hidden = !['schedule', 'task', 'meeting'].includes(type);
    eventForm.elements.owner.options[0].textContent = type === 'schedule' ? '老板日程' : '老板相关';
    eventForm.elements.owner.options[1].textContent = type === 'schedule' ? '我的日程' : '我的工作';
    syncTimeFields();
    dialog.showModal()
}
function openScheduleEdit(index) {
    openCreator('schedule');
    editingScheduleIndex = index;
    const item = schedule[index];
    document.querySelector('#createTitle').textContent = '编辑日程';
    document.querySelector('#createDesc').textContent = '修改后会同步更新今日安排和日历视角';
    document.querySelector('#saveEvent').textContent = '保存修改';
    eventForm.elements.title.value = item.title;
    eventForm.elements.owner.value = item.owner;
    eventForm.elements.date.value = item.date || baseDate;
    eventForm.elements.location.value = item.place || '';
    eventForm.elements.priority.value = ['重要', '普通', '紧急'].includes(item.priority) ? item.priority : '普通';
    if ((item.time || '').includes('–')) {
        eventForm.elements.timeMode.value = 'exact';
        const [start,end] = item.time.split('–');
        eventForm.elements.startTime.value = start;
        eventForm.elements.endTime.value = end
    } else if (['上午', '下午', '晚上'].includes(item.period)) {
        eventForm.elements.timeMode.value = 'period';
        eventForm.elements.period.value = item.period
    } else
        eventForm.elements.timeMode.value = 'none';
    syncTimeFields()
}
function deleteSchedule(index) {
    if (!confirm(`确定删除日程“${schedule[index].title}”吗？`))
        return;
    schedule.splice(index, 1);
    if (activeAccount)
        localStorage.setItem(`scheduleData_${activeAccount}`, JSON.stringify(schedule));
    if (activeAccount === 'fresh')
        localStorage.setItem('scheduleData_fresh_v2', JSON.stringify(schedule));
    renderTimeline();
    renderCalendar();
    showToast('日程已删除')
}
document.querySelectorAll('[data-header-create]').forEach(button => button.onclick = () => button.dataset.headerCreate === 'meeting' ? openQuickMeeting() : openCreator(button.dataset.headerCreate));
document.querySelectorAll('[data-create]').forEach(button => button.onclick = () => button.dataset.create === 'meeting' ? openQuickMeeting() : openCreator(button.dataset.create));
const timeMode = document.querySelector('#timeMode')
  , periodWrap = document.querySelector('#periodWrap')
  , exactRangeWrap = document.querySelector('#exactRangeWrap')
  , startInput = document.querySelector('#startTime')
  , endInput = document.querySelector('#endTime')
  , timeError = document.querySelector('#timeError');
function syncTimeFields() {
    const mode = timeMode.value;
    periodWrap.style.display = mode === 'period' ? 'block' : 'none';
    exactRangeWrap.style.display = mode === 'exact' ? 'grid' : 'none';
    startInput.required = endInput.required = mode === 'exact';
    timeError.textContent = ''
}
timeMode.onchange = syncTimeFields;
syncTimeFields();
function showToast(message) {
    const t = document.querySelector('#toast');
    t.textContent = message;
    t.classList.add('show');
    setTimeout( () => t.classList.remove('show'), 2400)
}
eventForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(eventForm)
      , type = data.get('createType')
      , title = eventForm.elements.title.value.trim();
    if (!title) {
        eventForm.elements.title.setCustomValidity(`请填写${createConfig[type].label}`);
        eventForm.reportValidity();
        eventForm.elements.title.setCustomValidity('');
        return
    }
    const mode = data.get('timeMode');
    if ((type === 'schedule' || type === 'meeting') && mode === 'exact' && data.get('endTime') <= data.get('startTime')) {
        timeError.textContent = '结束时间必须晚于开始时间';
        endInput.focus();
        return
    }
    const shownTime = mode === 'exact' ? `${data.get('startTime')}–${data.get('endTime')}` : mode === 'period' ? data.get('period') : '当天';
    if (type === 'schedule') {
        const item = {
            period: shownTime,
            time: shownTime,
            title,
            owner: data.get('owner'),
            place: data.get('location') || data.get('note') || '暂无地点',
            priority: data.get('priority'),
            date: data.get('date')
        };
        if (editingScheduleIndex === null)
            schedule.push(item);
        else
            schedule[editingScheduleIndex] = item;
        if (data.get('reminder') !== 'none' && editingScheduleIndex === null)
            reminders.push({
                title,
                date: data.get('date'),
                priority: data.get('priority')
            });
        renderTimeline();
        renderCalendar();
        renderReminders()
    } else if (type === 'task') {
        tasks.unshift({
            title,
            meta: `${data.get('date')} 截止 · ${data.get('taskType')}`,
            priority: data.get('priority'),
            owner: data.get('owner')
        });
        if (data.get('reminder') !== 'none')
            reminders.push({
                title,
                date: data.get('date'),
                priority: data.get('priority')
            });
        renderTasks();
        renderReminders();
        updateCounts()
    } else if (type === 'meeting') {
        meetings.unshift({
            title,
            type: data.get('meetingType'),
            meta: `${data.get('date')} ${shownTime} · ${data.get('location') || '地点待定'}`,
            host: data.get('host') || '待确认',
            participants: data.get('participants') || '待确认',
            goal: data.get('goal') || '待补充会议目标',
            progress: 0,
            owner: data.get('owner')
        });
        activeMeeting = 0;
        renderMeetings()
    } else {
        const learning = {
            title,
            type: data.get('learningType'),
            duration: data.get('duration'),
            summary: data.get('summary') || '',
            nextStep: data.get('nextStep') || '',
            date: data.get('date')
        };
        localStorage.setItem(`todayLearning_${activeAccount || 'guest'}`, JSON.stringify(learning));
        knowledge.unshift([title, `${learning.duration} · ${learning.type}`, '今日记录']);
        renderLearning();
        applyLearningRecord(learning)
    }
    if (activeAccount === 'fresh' && type === 'schedule') {
        localStorage.setItem('xujianFreshSchedule', JSON.stringify(schedule));
        localStorage.setItem('xujianFreshReminders', JSON.stringify(reminders))
    }
    dialog.close();
    showToast(type === 'schedule' && editingScheduleIndex !== null ? '日程修改已保存' : `${createConfig[type].title.replace('新建', '')}已保存`);
    editingScheduleIndex = null
}
);
eventForm.addEventListener('submit', () => setTimeout( () => {
    if (!activeAccount)
        return;
    localStorage.setItem(`scheduleData_${activeAccount}`, JSON.stringify(schedule));
    localStorage.setItem(`taskData_${activeAccount}`, JSON.stringify(tasks))
}
, 0));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(modal => modal.addEventListener('click', e => {
    if (e.target === modal)
        modal.close()
}
));

const meetingDialog = document.querySelector('#meetingDialog')
  , meetingWizardForm = document.querySelector('#meetingWizardForm')
  , wizardSteps = [...document.querySelectorAll('[data-wizard-step]')]
  , wizardStepNames = ['类型', '信息', '人员', '议程', '资料', '通知', '跟进', '检查'];
let wizardStep = 0
  , agendaSerial = 0
  , materialSerial = 0;
function renderWizardProgress() {
    document.querySelector('#meetingWizardProgress').innerHTML = wizardStepNames.map( (name, i) => `<button type="button" class="${i === wizardStep ? 'active' : i < wizardStep ? 'done' : ''}" data-step-jump="${i}">${i + 1}. ${name}</button>`).join('');
    document.querySelectorAll('[data-step-jump]').forEach(button => button.onclick = () => showWizardStep(+button.dataset.stepJump))
}
function showWizardStep(index) {
    wizardStep = Math.max(0, Math.min(7, index));
    wizardSteps.forEach( (step, i) => step.classList.toggle('active', i === wizardStep));
    document.querySelector('#wizardPrev').hidden = wizardStep === 0;
    document.querySelector('#wizardNext').hidden = wizardStep === 7;
    document.querySelector('#publishMeeting').hidden = wizardStep !== 7;
    if (wizardStep === 7)
        renderPublishChecklist();
    renderWizardProgress();
    document.querySelector('.wizard-scroll').scrollTop = 0
}
function syncWizardFormat() {
    const format = meetingWizardForm.elements.wizardFormat.value;
    document.querySelectorAll('.format-offline').forEach(x => x.hidden = format === 'online');
    document.querySelectorAll('.format-online').forEach(x => x.hidden = format === 'offline')
}
function calculateWizardTime() {
    const start = meetingWizardForm.elements.wizardStart.value
      , end = meetingWizardForm.elements.wizardEnd.value;
    let minutes = 0;
    if (start && end) {
        const [sh,sm] = start.split(':').map(Number)
          , [eh,em] = end.split(':').map(Number);
        minutes = eh * 60 + em - sh * 60 - sm
    }
    document.querySelector('#wizardDuration').value = minutes > 0 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : '';
    document.querySelector('#meetingMinutes').textContent = Math.max(0, minutes);
    updateAgendaTime()
}
function addAgendaRow(template={}) {
    agendaSerial++;
    const row = document.createElement('article');
    row.className = 'agenda-row';
    row.innerHTML = `<header><b>议题 ${agendaSerial}</b><button type="button" class="remove-row">删除</button></header><div class="row-grid"><input name="agendaName" required placeholder="议题名称" value="${template.name || ''}"><input name="agendaOwner" required placeholder="汇报人/负责人" value="${template.owner || ''}"><input name="agendaTime" type="number" min="1" value="${template.time || 15}" placeholder="分钟"><textarea class="span-all" name="agendaGoal" placeholder="讨论目标、需要作出的决定和预期输出">${template.goal || ''}</textarea><input class="span-all" name="agendaMaterial" placeholder="相关资料；需要提前阅读时请注明"></div>`;
    row.querySelector('.remove-row').onclick = () => {
        row.remove();
        updateAgendaTime()
    }
    ;
    row.querySelector('[name="agendaTime"]').oninput = updateAgendaTime;
    document.querySelector('#agendaItems').appendChild(row);
    updateAgendaTime()
}
function updateAgendaTime() {
    const total = [...document.querySelectorAll('[name="agendaTime"]')].reduce( (sum, x) => sum + (+x.value || 0), 0)
      , meeting = +document.querySelector('#meetingMinutes').textContent || 0;
    document.querySelector('#agendaMinutes').textContent = total;
    document.querySelector('#agendaWarning').textContent = meeting && total > meeting ? '议程总时长超过会议时间，请调整' : ''
}
function addMaterialRow() {
    materialSerial++;
    const row = document.createElement('article');
    row.className = 'material-row';
    row.innerHTML = `<header><b>资料 ${materialSerial}</b><button type="button" class="remove-row">删除</button></header><div class="row-grid"><input name="materialName" placeholder="资料名称"><input name="materialVersion" placeholder="文件版本"><select name="materialRequired"><option value="no">普通资料</option><option value="yes">必须提前阅读</option></select><input class="span-all" name="materialDescription" placeholder="资料说明、阅读对象或相关链接"></div>`;
    row.querySelector('.remove-row').onclick = () => row.remove();
    document.querySelector('#materialItems').appendChild(row)
}
function applyMeetingTemplate(type) {
    if (document.querySelector('#agendaItems').children.length)
        return;
    const templates = {
        信息同步会: [['信息与进展同步', 15], ['问题答疑与确认', 10]],
        项目推进会: [['上次行动项回顾', 10], ['项目进度与风险', 20], ['资源协调与下一步', 15]],
        问题解决会: [['问题与事实确认', 15], ['原因分析', 20], ['解决方案与责任分工', 20]],
        决策会议: [['背景与方案说明', 15], ['方案讨论与风险评估', 20], ['决策确认与行动项', 15]],
        复盘总结会: [['结果回顾', 15], ['经验与问题复盘', 20], ['改进措施', 15]],
        创意讨论会: [['目标与规则说明', 10], ['创意发散', 25], ['方案收敛', 15]],
        培训分享会: [['学习目标说明', 5], ['主题分享', 30], ['问答与实践', 15]],
        其他会议: [['核心议题', 20], ['结论与行动项', 10]]
    };
    (templates[type] || templates['其他会议']).forEach( ([name,time]) => addAgendaRow({
        name,
        time
    }))
}
function wizardChecks() {
    const f = meetingWizardForm.elements
      , type = f.wizardMeetingType.value
      , format = f.wizardFormat.value
      , agendaRequired = ['项目推进会', '问题解决会', '决策会议'].includes(type)
      , agendaComplete = [...document.querySelectorAll('.agenda-row')].some(row => row.querySelector('[name="agendaName"]').value.trim() && row.querySelector('[name="agendaOwner"]').value.trim())
      , timeValid = f.wizardStart.value && f.wizardEnd.value && f.wizardEnd.value > f.wizardStart.value
      , notifySelected = ['notifyApp', 'notifyPush', 'notifySms', 'notifyEmail', 'notifyInternal'].some(x => f[x].checked);
    return [{
        label: '已选择会议类型',
        ok: !!type,
        step: 0
    }, {
        label: '已明确会议目的和预期输出',
        ok: !!f.wizardPurpose.value.trim() && !!f.wizardOutput.value.trim(),
        step: 0
    }, {
        label: '会议主题、日期和有效时间完整',
        ok: !!f.wizardTitle.value.trim() && !!f.wizardDate.value && timeValid,
        step: 1
    }, {
        label: '会议形式及地点/链接完整',
        ok: format === 'online' ? !!f.wizardLink.value.trim() : format === 'offline' ? !!f.wizardLocation.value.trim() : !!f.wizardLink.value.trim() && !!f.wizardLocation.value.trim(),
        step: 1
    }, {
        label: '已指定主持人和记录人',
        ok: !!f.wizardHost.value.trim() && !!f.wizardRecorder.value.trim(),
        step: 1
    }, {
        label: '已确定必须参加人员',
        ok: !!f.wizardRequiredPeople.value.trim(),
        step: 2
    }, {
        label: '决策会议已指定决策人',
        ok: type !== '决策会议' || !!f.wizardDecisionMaker.value.trim(),
        step: 2
    }, {
        label: '已检查关键人员时间冲突',
        ok: f.wizardNoConflict.checked,
        step: 2
    }, {
        label: '必需会议类型已设置具体议程',
        ok: !agendaRequired || agendaComplete,
        step: 3
    }, {
        label: '议程总时长未超过会议时间',
        ok: (+document.querySelector('#agendaMinutes').textContent || 0) <= (+document.querySelector('#meetingMinutes').textContent || 0),
        step: 3
    }, {
        label: '已配置至少一种通知方式',
        ok: notifySelected,
        step: 5
    }, {
        label: '已准备会议记录模板',
        ok: f.autoMinutes.checked,
        step: 6
    }, {
        label: '已配置行动项和会后跟进',
        ok: f.autoActions.checked && f.syncTasks.checked,
        step: 6
    }]
}
function renderPublishChecklist() {
    document.querySelector('#publishChecklist').innerHTML = wizardChecks().map(item => `<div class="check-result ${item.ok ? 'ok' : 'missing'}"><i>${item.ok ? '✓' : '!'}</i><span>${item.label}</span></div>`).join('')
}
function collectMeeting(status) {
    const f = meetingWizardForm.elements
      , title = f.wizardTitle.value.trim() || '未命名会议草稿'
      , type = f.wizardMeetingType.value || '待选择'
      , place = f.wizardLocation.value || f.wizardLink.value || '地点待定'
      , start = f.wizardStart.value || '时间待定'
      , end = f.wizardEnd.value ? `–${f.wizardEnd.value}` : '';
    return {
        title,
        type,
        meta: `${f.wizardDate.value || '日期待定'} ${start}${end} · ${place}`,
        host: f.wizardHost.value || '待确认',
        participants: f.wizardRequiredPeople.value || '待确认',
        goal: `${f.wizardPurpose.value || '目的待补充'}；预期输出：${f.wizardOutput.value || '待补充'}`,
        progress: 0,
        owner: f.wizardOwner.value,
        status,
        code: status === '已发布' ? `MTG-${Date.now().toString().slice(-8)}` : '草稿未编号'
    }
}
function saveWizardMeeting(status) {
    if (status === '已发布') {
        const missing = wizardChecks().filter(x => !x.ok);
        if (missing.length) {
            showWizardStep(missing[0].step);
            showToast(`还有 ${missing.length} 项发布检查未完成`);
            return
        }
    }
    const meeting = collectMeeting(status);
    meetings.unshift(meeting);
    activeMeeting = 0;
    if (status === '已发布') {
        schedule.push({
            period: meetingWizardForm.elements.wizardStart.value,
            time: meetingWizardForm.elements.wizardStart.value,
            title: meeting.title,
            owner: meeting.owner,
            place: meeting.meta.split(' · ')[1],
            priority: '重要',
            date: meetingWizardForm.elements.wizardDate.value
        })
    }
    modulePerspectives.meetings = 'mine';
    document.querySelectorAll('[data-module-perspective="meetings"]').forEach(x => x.classList.toggle('active', x.dataset.value === 'mine'));
    renderMeetings();
    renderCalendar();
    renderTimeline();
    meetingDialog.close();
    showToast(status === '已发布' ? `会议已发布，编号 ${meeting.code}` : '会议草稿已保存')
}
function openMeetingWizard() {
    meetingWizardForm.reset();
    meetingWizardForm.elements.wizardDate.value = baseDate;
    document.querySelector('#agendaItems').innerHTML = '';
    document.querySelector('#materialItems').innerHTML = '';
    agendaSerial = 0;
    materialSerial = 0;
    addAgendaRow({
        name: '会议开场',
        time: 5,
        goal: '说明目标、规则、议程和预期输出'
    });
    addAgendaRow({
        name: '结论确认与会议收口',
        time: 10,
        goal: '确认决策、行动项、负责人、期限和验收标准'
    });
    addMaterialRow();
    syncWizardFormat();
    calculateWizardTime();
    showWizardStep(0);
    meetingDialog.showModal()
}
document.querySelectorAll('[name="wizardMeetingType"]').forEach(radio => radio.onchange = () => {
    document.querySelector('#agendaItems').innerHTML = '';
    agendaSerial = 0;
    applyMeetingTemplate(radio.value)
}
);
meetingWizardForm.elements.wizardFormat.onchange = syncWizardFormat;
meetingWizardForm.elements.wizardStart.oninput = calculateWizardTime;
meetingWizardForm.elements.wizardEnd.oninput = calculateWizardTime;
document.querySelector('#addAgendaBtn').onclick = () => addAgendaRow();
document.querySelector('#addMaterialBtn').onclick = addMaterialRow;
document.querySelector('#wizardPrev').onclick = () => showWizardStep(wizardStep - 1);
document.querySelector('#wizardNext').onclick = () => showWizardStep(wizardStep + 1);
document.querySelector('#saveMeetingDraft').onclick = () => saveWizardMeeting('草稿');
document.querySelector('#publishMeeting').onclick = () => saveWizardMeeting('已发布');

const defaultMeetingTypes = ['信息同步会', '问题讨论会', '决策审批会', '项目推进会', '创意共创会', '复盘总结会', '培训分享会', '其他会议']
  , quickMeetingDialog = document.querySelector('#quickMeetingDialog')
  , quickMeetingForm = document.querySelector('#quickMeetingForm')
  , meetingTypesDialog = document.querySelector('#meetingTypesDialog')
  , peopleDialog = document.querySelector('#peopleDialog');
let meetingTypeLibrary = JSON.parse(localStorage.getItem(`meetingTypes_${cleanAccountKey}`) || 'null') || defaultMeetingTypes
  , peopleLibrary = JSON.parse(localStorage.getItem(`peopleLibrary_${cleanAccountKey}`) || '[]')
  , quickStep = 0;
function renderQuickTypeOptions() {
    const select = document.querySelector('#quickMeetingType')
      , current = select.value;
    select.innerHTML = meetingTypeLibrary.map(type => `<option>${type}</option>`).join('');
    if (meetingTypeLibrary.includes(current))
        select.value = current
}
function renderPeopleSuggestions() {
    document.querySelector('#peopleSuggestions').innerHTML = peopleLibrary.map(name => `<option value="${name}"></option>`).join('');
    document.querySelectorAll('.people-picker').forEach(select => {
        const current = select.value;
        select.innerHTML = '<option value="">从常用名单选择…</option>' + peopleLibrary.map(name => `<option value="${name}">${name}</option>`).join('');
        select.value = peopleLibrary.includes(current) ? current : ''
    }
    )
}
function showQuickStep(index) {
    quickStep = Math.max(0, Math.min(2, index));
    document.querySelectorAll('[data-quick-panel]').forEach( (panel, i) => panel.classList.toggle('active', i === quickStep));
    document.querySelectorAll('[data-quick-step]').forEach( (button, i) => button.classList.toggle('active', i === quickStep));
    document.querySelector('#quickPrev').hidden = quickStep === 0;
    document.querySelector('#quickNext').hidden = quickStep === 2;
    document.querySelector('#quickCreateMeeting').hidden = quickStep !== 2;
    document.querySelector('.quick-meeting-scroll').scrollTop = 0
}
function calculateQuickDuration() {
    const f = quickMeetingForm.elements
      , start = f.quickStart.value
      , end = f.quickEnd.value;
    let minutes = 0;
    if (start && end) {
        const [sh,sm] = start.split(':').map(Number)
          , [eh,em] = end.split(':').map(Number);
        minutes = eh * 60 + em - sh * 60 - sm
    }
    document.querySelector('#quickDuration').value = minutes > 0 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : ''
}
function splitPeople(value) {
    return value.split(/[、,，;；\n]/).map(x => x.trim()).filter(Boolean)
}
function collectPeopleFromMeeting() {
    const f = quickMeetingForm.elements
      , names = [...splitPeople(f.quickRequiredPeople.value), ...splitPeople(f.quickSuggestedPeople.value), ...splitPeople(f.quickInformedPeople.value), f.quickInitiator.value.trim(), f.quickHost.value.trim(), f.quickRecorder.value.trim()].filter(Boolean);
    peopleLibrary = [...new Set([...peopleLibrary, ...names])];
    localStorage.setItem(`peopleLibrary_${cleanAccountKey}`, JSON.stringify(peopleLibrary));
    renderPeopleSuggestions()
}
function quickMeetingMissing() {
    const f = quickMeetingForm.elements
      , items = [{
        step: 0,
        label: '会议主题',
        ok: f.quickTitle.value.trim()
    }, {
        step: 0,
        label: '会议类型',
        ok: f.quickType.value
    }, {
        step: 0,
        label: '会议目标',
        ok: f.quickPurpose.value.trim()
    }, {
        step: 0,
        label: '预期输出',
        ok: f.quickOutput.value.trim()
    }, {
        step: 0,
        label: '有效的开始和结束时间',
        ok: f.quickStart.value && f.quickEnd.value && f.quickEnd.value > f.quickStart.value
    }, {
        step: 0,
        label: '会议室或线上链接',
        ok: f.quickLocation.value.trim()
    }, {
        step: 0,
        label: '发起人',
        ok: f.quickInitiator.value.trim()
    }, {
        step: 0,
        label: '主持人和记录人',
        ok: f.quickHost.value.trim() && f.quickRecorder.value.trim()
    }, {
        step: 1,
        label: '必须参加人员',
        ok: f.quickRequiredPeople.value.trim()
    }, {
        step: 1,
        label: '会议议程',
        ok: f.quickAgenda.value.trim()
    }];
    return items.filter(x => !x.ok)
}
function collectPremeetingChecks() {
    return [...document.querySelectorAll('.premeeting-checklist label')].map(label => ({
        label: label.textContent.trim(),
        done: label.querySelector('input').checked
    }))
}
function meetingIncompleteFields() {
    const f = quickMeetingForm.elements
      , fields = [['会议主题', f.quickTitle.value], ['会议目标', f.quickPurpose.value], ['预期输出', f.quickOutput.value], ['会议日期', f.quickDate.value], ['开始时间', f.quickStart.value], ['结束时间', f.quickEnd.value], ['会议室 / 地点 / 线上链接', f.quickLocation.value], ['发起人', f.quickInitiator.value], ['主持人', f.quickHost.value], ['记录人', f.quickRecorder.value], ['必须参加人员', f.quickRequiredPeople.value], ['建议参加人员', f.quickSuggestedPeople.value], ['仅知会人员', f.quickInformedPeople.value], ['关键人员时间确认', f.quickTimeConfirmation.value], ['会议议程', f.quickAgenda.value], ['会前材料', f.quickMaterials.value], ['材料发送时间', f.quickMaterialTime.value], ['备用方案', f.quickBackup.value]];
    return fields.filter( ([,value]) => !String(value || '').trim()).map( ([label]) => label)
}
function showMeetingCompletion(missing) {
    localStorage.removeItem(draftKey('meeting'));
    document.querySelector('#meetingCompletionCopy').textContent = missing.length ? `会议已经创建，还有 ${missing.length} 项未填写：` : '会议已经创建，填写信息完整。';
    document.querySelector('#meetingMissingFields').innerHTML = missing.length ? missing.map(label => `<span>${label}</span>`).join('') : '<div class="complete-message">✓ 暂无缺失信息</div>';
    document.querySelector('#meetingCompletionDialog').showModal()
}
function saveQuickMeeting(status) {
    const f = quickMeetingForm.elements
      , missing = meetingIncompleteFields()
      , place = f.quickLocation.value || '地点待定'
      , checks = collectPremeetingChecks()
      , doneCount = checks.filter(x => x.done).length
      , meeting = {
        title: f.quickTitle.value.trim() || '未命名会议',
        type: f.quickType.value || '待选择',
        date: f.quickDate.value,
        time: f.quickStart.value,
        endTime: f.quickEnd.value,
        place,
        format: f.quickFormat.value,
        initiator: f.quickInitiator.value || '待确认',
        recorder: f.quickRecorder.value || '待确认',
        suggestedPeople: f.quickSuggestedPeople.value,
        informedPeople: f.quickInformedPeople.value,
        materialTime: f.quickMaterialTime.value,
        backup: f.quickBackup.value,
        meta: `${f.quickDate.value || '日期待定'} ${f.quickStart.value || '时间待定'}${f.quickEnd.value ? `–${f.quickEnd.value}` : ''} · ${place}`,
        host: f.quickHost.value || '待确认',
        participants: f.quickRequiredPeople.value || '待确认',
        goal: `${f.quickPurpose.value || '目标待补充'}；预期输出：${f.quickOutput.value || '待补充'}`,
        progress: 0,
        owner: f.quickOwner.value,
        status,
        agenda: f.quickAgenda.value,
        materials: f.quickMaterials.value,
        missingFields: missing,
        premeetingChecks: checks,
        readiness: `${doneCount}/${checks.length}`
    };
    meetings.unshift(meeting);
    activeMeeting = 0;
    collectPeopleFromMeeting();
    renderMeetings();
    renderTimeline();
    renderCalendar();
    quickMeetingDialog.close();
    if (status === '草稿')
        showToast('会议草稿已保存');
    else
        showMeetingCompletion(missing)
}
function openQuickMeeting() {
    quickMeetingForm.reset();
    quickMeetingForm.elements.quickDate.value = baseDate;
    quickMeetingForm.elements.quickInitiator.value = '';
    quickMeetingForm.elements.quickMaterialTime.value = `${baseDate}T09:30`;
    renderQuickTypeOptions();
    renderPeopleSuggestions();
    document.querySelector('#quickMeetingCheckResult').classList.remove('show');
    calculateQuickDuration();
    showQuickStep(0);
    quickMeetingDialog.showModal()
}
function renderLibrary(target, items, kind) {
    target.innerHTML = items.length ? items.map( (item, i) => `<div class="library-row"><input value="${item}" data-library-index="${i}" data-library-kind="${kind}"><button type="button" data-remove-library="${i}" data-remove-kind="${kind}">删除</button></div>`).join('') : '<div class="library-empty">暂无内容，可以点击下方按钮添加</div>';
    target.querySelectorAll('[data-library-index]').forEach(input => input.oninput = () => {
        const list = input.dataset.libraryKind === 'type' ? meetingTypeLibrary : peopleLibrary;
        list[+input.dataset.libraryIndex] = input.value
    }
    );
    target.querySelectorAll('[data-remove-library]').forEach(button => button.onclick = () => {
        const list = button.dataset.removeKind === 'type' ? meetingTypeLibrary : peopleLibrary;
        list.splice(+button.dataset.removeLibrary, 1);
        renderLibrary(target, list, button.dataset.removeKind)
    }
    )
}
function openTypeLibrary() {
    renderLibrary(document.querySelector('#meetingTypeLibrary'), meetingTypeLibrary, 'type');
    meetingTypesDialog.showModal()
}
function openPeopleLibrary() {
    renderLibrary(document.querySelector('#peopleLibrary'), peopleLibrary, 'person');
    peopleDialog.showModal()
}
function addLibraryRow(kind) {
    const list = kind === 'type' ? meetingTypeLibrary : peopleLibrary;
    list.push('');
    renderLibrary(document.querySelector(kind === 'type' ? '#meetingTypeLibrary' : '#peopleLibrary'), list, kind)
}
function saveLibrary(kind) {
    const target = document.querySelector(kind === 'type' ? '#meetingTypeLibrary' : '#peopleLibrary')
      , values = [...target.querySelectorAll('input')].map(x => x.value.trim()).filter(Boolean)
      , unique = [...new Set(values)];
    if (kind === 'type') {
        meetingTypeLibrary = unique.length ? unique : defaultMeetingTypes;
        localStorage.setItem(`meetingTypes_${cleanAccountKey}`, JSON.stringify(meetingTypeLibrary));
        renderQuickTypeOptions();
        meetingTypesDialog.close();
        showToast('会议类型已保存')
    } else {
        peopleLibrary = unique;
        localStorage.setItem(`peopleLibrary_${cleanAccountKey}`, JSON.stringify(peopleLibrary));
        renderPeopleSuggestions();
        peopleDialog.close();
        showToast('常用人员名单已保存')
    }
}
document.querySelectorAll('[data-quick-step]').forEach(button => button.onclick = () => showQuickStep(+button.dataset.quickStep));
document.querySelector('#quickPrev').onclick = () => showQuickStep(quickStep - 1);
document.querySelector('#quickNext').onclick = () => showQuickStep(quickStep + 1);
document.querySelector('#quickSaveDraft').onclick = () => saveQuickMeeting('草稿');
document.querySelector('#quickCreateMeeting').onclick = () => saveQuickMeeting('已发布');
quickMeetingForm.elements.quickStart.oninput = calculateQuickDuration;
quickMeetingForm.elements.quickEnd.oninput = calculateQuickDuration;
document.querySelector('#manageMeetingTypes').onclick = openTypeLibrary;
document.querySelector('#managePeople').onclick = openPeopleLibrary;
document.querySelector('#addMeetingType').onclick = () => addLibraryRow('type');
document.querySelector('#addPerson').onclick = () => addLibraryRow('person');
document.querySelector('#saveMeetingTypes').onclick = () => saveLibrary('type');
document.querySelector('#savePeople').onclick = () => saveLibrary('person');
renderQuickTypeOptions();
renderPeopleSuggestions();
document.querySelectorAll('[data-perspective]').forEach(b => b.onclick = () => {
    perspective = b.dataset.perspective;
    document.querySelectorAll('[data-perspective]').forEach(x => x.classList.toggle('active', x === b));
    let boss = perspective === 'boss';
    document.querySelector('#perspectiveHint').textContent = boss ? '专注查看老板的全部安排' : '同时统筹我的任务和老板的安排';
    document.querySelector('#scheduleDesc').textContent = boss ? '当前仅显示老板日程' : '我的工作与老板日程统一查看';
    document.querySelector('.mine-legend').style.display = boss ? 'none' : '';
    renderTimeline()
}
);
document.querySelectorAll('[data-module-perspective]').forEach(button => button.onclick = () => {
    const module = button.dataset.modulePerspective
      , value = button.dataset.value;
    modulePerspectives[module] = value;
    document.querySelectorAll(`[data-module-perspective="${module}"]`).forEach(x => x.classList.toggle('active', x === button));
    const copy = document.querySelector(`[data-perspective-copy="${module}"]`);
    copy.textContent = value === 'boss' ? `当前仅显示老板${['calendar', 'itinerary'].includes(module) ? '日程' : module === 'tasks' ? '任务' : '会议'}` : `同时显示我的和老板的内容，老板${['calendar', 'itinerary'].includes(module) ? '日程' : module === 'tasks' ? '任务' : '会议'}重点突出`;
    if (module === 'itinerary')
        renderItinerary();
    if (module === 'calendar')
        renderCalendar();
    if (module === 'tasks')
        renderTasks();
    if (module === 'meetings')
        renderMeetings()
}
);
const profileDialog = document.querySelector('#profileDialog')
  , profileForm = document.querySelector('#profileForm');
const profileStorageKey = `scheduleDisplayName_${activeAccount || 'guest'}`;
let displayName = localStorage.getItem(profileStorageKey) || '';
function renderProfile() {
    document.querySelector('#profileName').textContent = displayName || '我的工作台';
    document.querySelector('#avatarText').textContent = displayName ? displayName.slice(0, 1) : '助';
    const hour = Number(new Date().toLocaleTimeString('en-GB', {timeZone: currentTimeZone, hour: '2-digit', hourCycle: 'h23'}))
      , greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    titles.dashboard[0] = displayName ? `${greeting}，${displayName}` : greeting;
    if (document.querySelector('#dashboard').classList.contains('active'))
        document.querySelector('#pageTitle').textContent = titles.dashboard[0]
}
renderProfile();
document.querySelector('#profileEdit').onclick = () => {
    document.querySelector('#displayName').value = displayName;
    profileDialog.showModal()
}
;
profileForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!profileForm.reportValidity())
        return;
    displayName = document.querySelector('#displayName').value.trim();
    localStorage.setItem(profileStorageKey, displayName);
    renderProfile();
    profileDialog.close();
    showToast('称呼已保存')
}
);
document.querySelector('#searchBtn').onclick = () => {
    const view = document.querySelector('.view.active')?.id || 'dashboard'
      , labels = {
        dashboard: '全部内容',
        calendar: '日程和会议',
        itinerary: '行程',
        tasks: '任务',
        meetings: '会议',
        learning: '学习记录'
    }
      , q = prompt(`在${labels[view]}中搜索`);
    if (!q)
        return;
    const pools = {
        calendar: [...schedule, ...meetings],
        itinerary: schedule,
        tasks: tasks,
        meetings: meetings,
        learning: learningRecords,
        dashboard: [...schedule, ...tasks, ...meetings, ...learningRecords]
    }
      , found = (pools[view] || []).filter(x => `${x.title || ''} ${x.meta || ''} ${x.summary || ''}`.toLowerCase().includes(q.toLowerCase()));
    alert(found.length ? `找到 ${found.length} 条：\n${found.map(x => '· ' + x.title).join('\n')}` : `当前页面没有找到“${q}”`)
}
;
function applyLearningRecord(record) {
    const title = document.querySelector('#todayLearningTitle')
      , type = document.querySelector('#todayLearningType')
      , duration = document.querySelector('#todayLearningDuration')
      , summary = document.querySelector('#todayLearningSummary')
      , next = document.querySelector('#nextLearning');
    if (title)
        title.value = record.title || '';
    if (type)
        type.value = record.type || '专业学习';
    if (duration)
        duration.value = record.duration || '1 小时';
    if (summary)
        summary.value = record.summary || '';
    if (next)
        next.value = record.nextStep || '';
    const state = document.querySelector('#learningSavedState');
    if (state)
        state.textContent = '已保存 · 可修改';
    renderDashboardLearning(record)
}
function renderDashboardLearning(record) {
    const target = document.querySelector('#dashboardLearningSummary');
    if (!target)
        return;
    target.innerHTML = record?.summary ? `<b>${record.title || '今日学习'} · ${record.type || '学习'}</b><span>${record.summary}</span>` : '尚未保存今日总结'
}
function saveTodayLearning() {
    const record = {
        title: document.querySelector('#todayLearningTitle').value.trim(),
        type: document.querySelector('#todayLearningType').value,
        duration: document.querySelector('#todayLearningDuration').value,
        summary: document.querySelector('#todayLearningSummary').value.trim(),
        nextStep: document.querySelector('#nextLearning').value.trim(),
        date: baseDate
    };
    localStorage.setItem(`todayLearning_${activeAccount || 'guest'}`, JSON.stringify(record));
    applyLearningRecord(record);
    showToast('今日学习总结已保存，并同步到工作台')
}
const legacySaveLearning = document.querySelector('#saveLearning');
if (legacySaveLearning)
    legacySaveLearning.onclick = saveTodayLearning;
const savedLearning = JSON.parse(localStorage.getItem(`todayLearning_${activeAccount || 'guest'}`) || 'null');
if (savedLearning)
    applyLearningRecord(savedLearning);
else
    renderDashboardLearning(null);
renderTimeline();
renderBoss();
renderTasks();
renderMeetings();
renderLearning();
renderCalendar();
renderReminders();
updateCounts();

function applyFreshAccount() {
    document.body.classList.add('blank-account');
    const savedSchedule = JSON.parse(localStorage.getItem('scheduleData_fresh_v2') || '[]')
      , savedTasks = JSON.parse(localStorage.getItem('taskData_fresh_v2') || '[]');
    schedule.splice(0, schedule.length, ...savedSchedule);
    tasks.splice(0, tasks.length, ...savedTasks);
    meetings.splice(0);
    knowledge.splice(0);
    reminders.splice(0);
    renderTimeline();
    renderTasks();
    renderMeetings();
    updateCounts();
    document.querySelector('#accountState').textContent = '全新账号 · 本机数据'
}
function clearFreshAccountData() {
    const prefixes = ['scheduleData_fresh', 'taskData_fresh', 'meetingTypes_fresh', 'peopleLibrary_fresh', 'todayLearning_fresh', 'learningRecords_fresh', 'dailySummary_fresh', 'learningSummary_fresh', 'scheduleDisplayName_fresh', 'createDraft_fresh', 'xujianFresh'];
    Object.keys(localStorage).forEach(key => {
        if (prefixes.some(prefix => key.startsWith(prefix)))
            localStorage.removeItem(key);
    }
    );
}
function enterAccount(account) {
    if (account === 'fresh')
        clearFreshAccountData();
    localStorage.setItem('xujianActiveAccount', account);
    location.reload();
}
const loginScreen = document.querySelector('#loginScreen')
  , appShell = document.querySelector('#appShell')
  , mobileNav = document.querySelector('#mobileNav')
  , loginForm = document.querySelector('#loginForm')
  , loginError = document.querySelector('#loginError');
if (activeAccount && accountCatalog[activeAccount]) {
    loginScreen.hidden = true;
    appShell.hidden = false;
    mobileNav.hidden = false;
    if (activeAccount === 'fresh')
        applyFreshAccount();
    else
        document.querySelector('#accountState').textContent = '测试账号 · 示例数据'
}
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const account = document.querySelector('#loginAccount').value.trim()
      , password = document.querySelector('#loginPassword').value;
    if (!accountCatalog[account] || accountCatalog[account].password !== password) {
        loginError.textContent = '账号或密码不正确';
        return
    }
    enterAccount(account)
}
);
document.querySelectorAll('[data-demo-login]').forEach(button => button.onclick = () => enterAccount(button.dataset.demoLogin));
function returnToAccountSelection() {
    if (activeAccount === 'fresh') {
        const confirmed = confirm('这是一次性全新账号。退出后，该账号以及你在其中填写的日程、任务、会议和学习数据都会被清除，无法恢复。\n\n确定退出并注销这个账号吗？');
        if (!confirmed)
            return;
        clearFreshAccountData();
    }
    localStorage.removeItem('xujianActiveAccount');
    location.reload();
}
document.querySelector('#logoutBtn').onclick = returnToAccountSelection;
document.querySelector('#logoutHeaderBtn').onclick = returnToAccountSelection;

// 2026-08-14：按日期统筹工作台、简化任务与学习模块
const learningRecords = JSON.parse(localStorage.getItem(`learningRecords_${cleanAccountKey}`) || '[]');
function shiftDate(date, days) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10)
}
function dateLabel(date, withRelative=true) {
    const d = new Date(`${date}T00:00:00`)
      , parts = [`${d.getMonth() + 1}月${d.getDate()}日`];
    if (withRelative)
        parts.push(date === baseDate ? '今日' : date === shiftDate(baseDate, 1) ? '明日' : date === shiftDate(baseDate, -1) ? '昨日' : '');
    return parts.filter(Boolean).join(' · ')
}
function taskDateOf(t) {
    const exact = t.date || t.meta?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (exact)
        return exact;
    if (t.meta?.includes('明天'))
        return shiftDate(demoDate, 1);
    if (t.meta?.includes('今天'))
        return demoDate;
    const monthDay = t.meta?.match(/(\d{1,2})月(\d{1,2})日/);
    return monthDay ? `${demoDate.slice(0, 4)}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}` : demoDate
}
function meetingDateOf(m) {
    const exact = m.date || m.meta?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (exact)
        return exact;
    if (m.meta?.includes('明天'))
        return shiftDate(demoDate, 1);
    if (m.meta?.includes('今天'))
        return demoDate;
    return ''
}
function priorityLevel(value) {
    if (['3', '紧急', '最高'].includes(String(value)))
        return 3;
    if (['2', '重要', '较高'].includes(String(value)))
        return 2;
    return 1
}
function stars(value) {
    return '★'.repeat(priorityLevel(value))
}
function meetingTime(m) {
    return m.time || m.meta?.match(/\d{2}:\d{2}/)?.[0] || '会议'
}
function renderTimeline() {
    const scheduleItems = schedule.map( (e, index) => ({
        ...e,
        index,
        kind: '日程',
        sortTime: e.time || e.period || '99:00'
    })).filter(e => (!e.date || e.date === dashboardDate) && (perspective === 'mine' || e.owner === 'boss'));
    const taskItems = tasks.map( (t, index) => ({
        ...t,
        index,
        kind: '任务',
        sortTime: t.time || t.meta?.match(/\d{2}:\d{2}/)?.[0] || '99:10',
        place: t.meta || '',
        time: t.time || t.meta?.match(/\d{2}:\d{2}/)?.[0] || '待办'
    })).filter(t => !t.done && taskDateOf(t) === dashboardDate && (perspective === 'mine' || t.owner === 'boss'));
    const meetingItems = meetings.map( (m, index) => ({
        ...m,
        index,
        kind: '会议',
        sortTime: meetingTime(m),
        time: meetingTime(m),
        place: m.meta || ''
    })).filter(m => m.status !== '草稿' && meetingDateOf(m) === dashboardDate && (perspective === 'mine' || m.owner === 'boss'));
    const groups = {};
    [...scheduleItems, ...taskItems, ...meetingItems].sort( (a, b) => a.sortTime.localeCompare(b.sortTime)).forEach(item => (groups[item.time] ??= []).push(item));
    document.querySelector('#timeline').innerHTML = Object.entries(groups).map( ([time,items]) => `<div class="time-row"><span class="time-label">${time}</span><div class="overlap-lane">${items.map(e => `<div class="event ${e.kind === '会议' ? 'meeting-event' : ''}" style="--event:${e.kind === '任务' ? '#8c69d4' : e.owner === 'boss' ? '#002fa7' : '#79aff2'}"><span class="arrangement-kind">${e.kind}</span><div class="event-main"><b>${e.kind === '日程' ? `<span class="schedule-stars">${stars(e.priority)}</span> ` : ''}${e.title}</b><small>${e.place || ''}</small></div><span class="owner-marker">${e.owner === 'boss' ? 'Boss' : 'Me'}</span>${e.kind === '日程' ? `<div class="event-actions"><button data-edit-schedule="${e.index}">编辑</button><button data-delete-schedule="${e.index}">删除</button></div>` : ''}</div>`).join('')}</div></div>`).join('') || '<div class="empty-state">这一天暂无日程、任务或会议</div>';
    document.querySelectorAll('[data-edit-schedule]').forEach(b => b.onclick = () => openScheduleEdit(+b.dataset.editSchedule));
    document.querySelectorAll('[data-delete-schedule]').forEach(b => b.onclick = () => deleteSchedule(+b.dataset.deleteSchedule));
    renderDashboardStats();
    renderItinerary()
}
function renderDashboardMeetings() {
    const target = document.querySelector('#dashboardMeetingList');
    if (!target)
        return;
    const list = meetings.filter(m => m.status !== '草稿' && meetingDateOf(m) === dashboardDate);
    target.innerHTML = list.map(m => `<div class="dashboard-meeting"><span>${meetingTime(m)}</span><div><b>${m.title}</b><small>${m.type} · ${m.host || '主持人待定'}</small></div></div>`).join('') || '<div class="empty-state compact">当天暂无会议</div>';
    document.querySelector('#dashboardMeetingTitle').textContent = `${dateLabel(dashboardDate, false)}会议`
}
function renderDashboardTasks() {
    const target = document.querySelector('#dashboardTaskList');
    if (!target)
        return;
    const list = tasks.map( (t, index) => ({
        ...t,
        index
    })).filter(t => !t.done && taskDateOf(t) === dashboardDate);
    target.innerHTML = list.sort( (a, b) => priorityLevel(b.priority) - priorityLevel(a.priority)).map(t => `<label class="dashboard-task owner-${t.owner}"><button class="task-dot" data-dashboard-task="${t.index}" aria-label="完成任务"></button><span><b>${t.title}</b><small>${stars(t.priority)} · ${t.owner === 'boss' ? 'Boss' : 'Me'} · ${t.meta}</small></span></label>`).join('') || '<div class="empty-state compact">当天暂无待完成任务</div>';
    target.querySelectorAll('[data-dashboard-task]').forEach(x => x.onclick = () => toggleTask(+x.dataset.dashboardTask));
    document.querySelector('#dashboardTaskTitle').textContent = `${dateLabel(dashboardDate, false)}任务清单`
}
function renderDashboardStats() {
    const pending = tasks.filter(t => !t.done && taskDateOf(t) === dashboardDate)
      , todayMeetings = meetings.filter(m => m.status !== '草稿' && meetingDateOf(m) === baseDate)
      , tomorrowMeetings = meetings.filter(m => m.status !== '草稿' && meetingDateOf(m) === shiftDate(baseDate, 1));
    document.querySelector('#pendingCount').textContent = pending.length;
    document.querySelector('#todayTaskHint').textContent = `${dateLabel(dashboardDate, false)}待完成`;
    document.querySelector('#todayMeetingCount').textContent = todayMeetings.length;
    document.querySelector('#tomorrowMeetingCount').textContent = tomorrowMeetings.length;
    document.querySelector('#dashboardDateLabel').textContent = dateLabel(dashboardDate);
    document.querySelector('#scheduleTitle').textContent = `${dateLabel(dashboardDate, false)}安排`;
    renderDashboardTasks();
    renderDashboardMeetings()
}
function toggleTask(index) {
    tasks[index].done = !tasks[index].done;
    if (activeAccount)
        localStorage.setItem(`taskData_${activeAccount}`, JSON.stringify(tasks));
    renderTasks();
    renderTimeline();
    updateCounts()
}
function taskRow(t) {
    return `<div class="task-row owner-${t.owner} ${t.done ? 'done' : ''}" data-task="${t.index}"><button class="task-dot ${t.done ? 'filled' : ''}" aria-label="${t.done ? '恢复任务' : '完成任务'}"></button><div class="details"><b>${t.title}</b><small>${stars(t.priority)} · ${t.owner === 'boss' ? 'Boss' : 'Me'} · ${t.meta}</small></div></div>`
}
function renderTasks() {
    const visible = tasks.map( (t, index) => ({
        ...t,
        index
    })).filter(t => (modulePerspectives.tasks === 'mine' || t.owner === 'boss') && taskDateOf(t) === taskDate && (taskPriorityFilter === 'all' || priorityLevel(t.priority) === +taskPriorityFilter)).sort( (a, b) => priorityLevel(b.priority) - priorityLevel(a.priority));
    const pending = visible.filter(t => !t.done)
      , done = visible.filter(t => t.done);
    document.querySelector('#pendingTaskList').innerHTML = pending.map(taskRow).join('') || '<div class="empty-state compact">没有待完成任务</div>';
    document.querySelector('#completedTaskList').innerHTML = done.map(taskRow).join('') || '<div class="empty-state compact">没有已完成任务</div>';
    document.querySelector('#pendingTaskSectionCount').textContent = `${pending.length} 项`;
    document.querySelector('#completedTaskSectionCount').textContent = `${done.length} 项`;
    document.querySelector('#taskDateLabel').textContent = dateLabel(taskDate, false);
    document.querySelectorAll('.task-board .task-dot').forEach(b => b.onclick = () => toggleTask(+b.closest('[data-task]').dataset.task))
}
function calendarItemsForDate(date) {
    const schedules = schedule.map( (e, index) => ({
        ...e,
        index,
        kind: '日程'
    })).filter(e => e.date === date && (modulePerspectives.calendar === 'mine' || e.owner === 'boss'))
      , dayMeetings = meetings.map( (m, index) => ({
        ...m,
        index,
        kind: '会议'
    })).filter(m => meetingDateOf(m) === date && m.status !== '草稿' && (modulePerspectives.calendar === 'mine' || m.owner === 'boss'));
    return [...schedules, ...dayMeetings]
}
function calendarListItem(item) {
    return `<div class="calendar-list-item owner-${item.owner}"><span class="calendar-list-time">${item.kind === '会议' ? meetingTime(item) : item.time || '当天'}</span><div><b>${item.kind === '日程' ? `${stars(item.priority)} ` : ''}${item.title}</b><small>${item.kind} · ${item.kind === '会议' ? (item.place || item.meta || '') : item.place || ''}</small></div>${item.kind === '日程' ? `<button data-calendar-edit="${item.index}">编辑</button>` : `<button data-calendar-meeting="${item.index}">查看</button>`}</div>`
}
function bindCalendarActions() {
    document.querySelectorAll('[data-calendar-edit]').forEach(b => b.onclick = () => openScheduleEdit(+b.dataset.calendarEdit));
    document.querySelectorAll('[data-calendar-meeting]').forEach(b => b.onclick = () => openMeetingInfo(+b.dataset.calendarMeeting))
}
function renderCalendar() {
    const target = document.querySelector('#monthGrid')
      , title = document.querySelector('#calendarPeriodTitle')
      , hint = document.querySelector('#calendarModeHint')
      , today = new Date(`${baseDate}T00:00:00`)
      , year = today.getFullYear()
      , month = today.getMonth()
      , weekStart = shiftDate(baseDate, -((today.getDay() + 6) % 7));
    target.className = calendarMode === 'month' ? 'month-grid' : 'calendar-list-view';
    if (calendarMode === 'day') {
        title.textContent = `${year}年${dateLabel(baseDate, false)}`;
        hint.textContent = '日视图 · 当天日程与会议';
        const items = calendarItemsForDate(baseDate);
        target.innerHTML = `<div class="calendar-day-heading">${dateLabel(baseDate)} · 周${'日一二三四五六'[today.getDay()]}</div>${items.map(calendarListItem).join('') || '<div class="empty-state">当天暂无日程或会议</div>'}`
    } else if (calendarMode === 'week') {
        title.textContent = `${weekStart.replaceAll('-', '/')} — ${shiftDate(weekStart, 6).replaceAll('-', '/')}`;
        hint.textContent = '周视图 · 按天查看本周日程与会议';
        target.innerHTML = Array.from({length: 7}, (_, day) => {
            const date = shiftDate(weekStart, day)
              , items = calendarItemsForDate(date);
            return `<section class="calendar-week-day"><div class="calendar-day-heading">${dateLabel(date)}</div>${items.map(calendarListItem).join('') || '<div class="calendar-empty-line">暂无安排</div>'}</section>`
        }
        ).join('')
    } else {
        title.textContent = `${year}年 ${month + 1}月`;
        hint.textContent = '月视图 · 深蓝为老板日程，浅蓝为我的日程';
        let heads = ['一', '二', '三', '四', '五', '六', '日'].map(x => `<div class="day head">周${x}</div>`).join('')
          , days = [];
        const offset = (new Date(year, month, 1).getDay() + 6) % 7
          , previousDays = new Date(year, month, 0).getDate()
          , monthDays = new Date(year, month + 1, 0).getDate();
        for (let i = offset; i > 0; i--)
            days.push(`<div class="day muted"><span>${previousDays - i + 1}</span></div>`);
        for (let i = 1; i <= monthDays; i++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
              , content = calendarItemsForDate(date).map(item => item.kind === '日程' ? `<button class="mini-event ${item.owner === 'mine' ? 'mine' : 'boss-event'}" data-calendar-edit="${item.index}" title="点击编辑"><b>${stars(item.priority)}</b>${item.title}</button>` : `<button class="mini-event calendar-meeting" data-calendar-meeting="${item.index}"><b>会议</b>${item.title}</button>`).join('');
            days.push(`<div class="day ${date === baseDate ? 'today' : ''}"><span>${i}</span>${content}</div>`)
        }
        for (let i = 1; days.length % 7; i++)
            days.push(`<div class="day muted"><span>${i}</span></div>`);
        target.innerHTML = heads + days.join('')
    }
    bindCalendarActions()
}
function syncTimeFields() {
    const mode = timeMode.value
      , startLabel = document.querySelector('#startTimeLabel') || startInput.closest('label')
      , endLabel = document.querySelector('#endTimeLabel') || endInput.closest('label')
      , divider = document.querySelector('#timeRangeDivider') || exactRangeWrap.querySelector('span');
    periodWrap.style.display = 'none';
    exactRangeWrap.style.display = mode === 'none' ? 'none' : 'grid';
    startLabel.style.display = ['start', 'exact'].includes(mode) ? 'block' : 'none';
    endLabel.style.display = ['end', 'exact'].includes(mode) ? 'block' : 'none';
    divider.style.display = mode === 'exact' ? 'block' : 'none';
    startInput.required = endInput.required = false;
    timeError.textContent = ''
}
function setupSimpleCreator() {
    timeMode.innerHTML = '<option value="none">不设置时间</option><option value="start">只设置开始时间</option><option value="end">只设置结束时间</option><option value="exact">设置开始和结束时间</option>';
    const reminder = eventForm.elements.reminder?.closest('label');
    if (reminder)
        reminder.remove();
    const taskType = eventForm.elements.taskType?.closest('label');
    if (taskType)
        taskType.remove();
    const learningType = eventForm.elements.learningType?.closest('label');
    if (learningType)
        learningType.remove();
    const duration = eventForm.elements.duration?.closest('label');
    if (duration)
        duration.innerHTML = '学习时间<input type="time" name="learningTime">';
    const next = eventForm.elements.nextStep?.closest('label');
    if (next)
        next.remove();
    const summary = eventForm.elements.summary?.closest('label');
    if (summary)
        summary.firstChild.textContent = '学习总结';
    eventForm.elements.priority.innerHTML = '<option value="3">★★★ 最高</option><option value="2">★★ 较高</option><option value="1">★ 一般</option>';
    syncTimeFields()
}
setupSimpleCreator();
eventForm.addEventListener('submit', e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const data = new FormData(eventForm)
      , type = data.get('createType')
      , title = eventForm.elements.title.value.trim();
    if (!title) {
        eventForm.elements.title.setCustomValidity('请填写标题');
        eventForm.reportValidity();
        eventForm.elements.title.setCustomValidity('');
        return
    }
    if (type === 'schedule' && data.get('timeMode') === 'exact' && data.get('startTime') && data.get('endTime') && data.get('endTime') <= data.get('startTime')) {
        timeError.textContent = '结束时间必须晚于开始时间';
        return
    }
    if (type === 'schedule' && ((['start', 'exact'].includes(data.get('timeMode')) && !data.get('startTime')) || (['end', 'exact'].includes(data.get('timeMode')) && !data.get('endTime')))) {
        timeError.textContent = '请补全所选时间方式对应的时间';
        return
    }
    if (type === 'schedule') {
        const mode = data.get('timeMode')
          , shownTime = mode === 'start' ? data.get('startTime') : mode === 'end' ? data.get('endTime') : mode === 'exact' ? [data.get('startTime'), data.get('endTime')].filter(Boolean).join('–') : '当天'
          , item = {
            ...(editingScheduleIndex === null ? {} : schedule[editingScheduleIndex]),
            period: shownTime,
            time: shownTime,
            timeMode: mode,
            startTime: ['start', 'exact'].includes(mode) ? data.get('startTime') : '',
            endTime: ['end', 'exact'].includes(mode) ? data.get('endTime') : '',
            category: data.get('scheduleCategory'),
            scheduleType: data.get('scheduleType').trim(),
            participants: data.get('scheduleParticipants').trim(),
            note: data.get('note'),
            title,
            owner: data.get('owner'),
            place: data.get('location') || data.get('note') || '暂无地点',
            priority: data.get('priority'),
            date: data.get('date')
        };
        if (editingScheduleIndex === null)
            schedule.push(item);
        else
            schedule[editingScheduleIndex] = item;
        renderCalendar();
        renderTimeline()
    } else if (type === 'task') {
        tasks.unshift({
            title,
            date: data.get('date'),
            meta: `${data.get('date')} 截止`,
            priority: data.get('priority'),
            owner: data.get('owner'),
            done: false
        });
        taskDate = data.get('date');
        renderTasks();
        renderTimeline();
        updateCounts()
    } else if (type === 'learning') {
        learningRecords.unshift({
            title,
            date: data.get('date'),
            time: data.get('learningTime') || '未设置时间',
            summary: data.get('summary') || ''
        });
        localStorage.setItem(`learningRecords_${activeAccount || 'guest'}`, JSON.stringify(learningRecords));
        renderLearningRecords()
    }
    if (activeAccount) {
        localStorage.setItem(`scheduleData_${activeAccount}`, JSON.stringify(schedule));
        localStorage.setItem(`taskData_${activeAccount}`, JSON.stringify(tasks))
    }
    dialog.close();
    showToast(editingScheduleIndex !== null ? '日程修改已保存' : `${createConfig[type].title.replace('新建', '')}已保存`);
    editingScheduleIndex = null
}
, true);
function renderLearningRecords() {
    const target = document.querySelector('#learningRecordList');
    target.innerHTML = learningRecords.map( (r, i) => `<div class="learning-record"><div class="learning-record-date"><b>${r.date.slice(5).replace('-', '/')}</b><small>${r.time}</small></div><div><b>${r.title}</b><p>${r.summary || '暂无学习总结'}</p></div><button data-delete-learning="${i}">删除</button></div>`).join('') || '<div class="empty-state">还没有学习记录</div>';
    target.querySelectorAll('[data-delete-learning]').forEach(b => b.onclick = () => {
        learningRecords.splice(+b.dataset.deleteLearning, 1);
        localStorage.setItem(`learningRecords_${cleanAccountKey}`, JSON.stringify(learningRecords));
        renderLearningRecords()
    }
    )
}
function setupSummaries() {
    const dailyKey = `dailySummary_${cleanAccountKey}`
      , learningKey = `learningSummary_${cleanAccountKey}`
      , daily = document.querySelector('#dailySummary')
      , learning = document.querySelector('#learningSummary');
    daily.value = localStorage.getItem(dailyKey) || '';
    learning.value = localStorage.getItem(learningKey) || '';
    if (daily.value)
        document.querySelector('#dailySummaryState').textContent = '已保存 · 可修改';
    if (learning.value)
        document.querySelector('#learningSummaryState').textContent = '已保存 · 可修改';
    document.querySelector('#saveDailySummary').onclick = () => {
        localStorage.setItem(dailyKey, daily.value);
        document.querySelector('#dailySummaryState').textContent = '已保存 · 可修改';
        showToast('今日总结已保存')
    }
    ;
    document.querySelector('#saveLearningSummary').onclick = () => {
        localStorage.setItem(learningKey, learning.value);
        document.querySelector('#learningSummaryState').textContent = '已保存 · 可修改';
        showToast('学习总结已保存')
    }
}
function setupMeetingRefinement() {
    const f = quickMeetingForm.elements
      , locationLabel = f.quickLocation.closest('label')
      , linkLabel = f.quickLink.closest('label');
    locationLabel.childNodes[0].textContent = '会议室 / 地点 / 线上链接';
    f.quickLocation.placeholder = '填写会议室、具体地点或线上会议链接';
    linkLabel.hidden = true;
    f.quickInitiator.value = '';
    f.quickInitiator.required = true;
    f.quickInitiator.placeholder = '请填写会议发起人';
    const reminderLabel = f.quickReminder?.closest('label');
    if (reminderLabel)
        reminderLabel.remove();
    const reminderCheck = f.preReminder?.closest('label');
    if (reminderCheck)
        reminderCheck.remove();
    f.quickMaterialTime.closest('label').childNodes[0].textContent = '材料发送时间（默认当天 09:30）';
    f.quickDate.onchange = () => {
        f.quickMaterialTime.value = `${f.quickDate.value}T09:30`
    }
    ;
    ['quickRequiredPeople', 'quickSuggestedPeople', 'quickInformedPeople'].forEach(name => {
        const input = f[name]
          , picker = document.createElement('select');
        picker.className = 'people-picker';
        picker.setAttribute('aria-label', `${input.closest('label').childNodes[0].textContent.trim()}常用名单`);
        picker.onchange = () => {
            if (!picker.value)
                return;
            const names = splitPeople(input.value);
            if (!names.includes(picker.value))
                input.value = [...names, picker.value].join('、');
            picker.value = ''
        }
        ;
        input.insertAdjacentElement('afterend', picker)
    }
    );
    const peopleHint = document.createElement('small');
    peopleHint.className = 'people-entry-hint';
    peopleHint.textContent = '多人填写支持中文逗号、英文逗号、顿号、分号或换行；所有姓名都会自动加入常用人员名单。';
    f.quickRequiredPeople.closest('label').appendChild(peopleHint);
    renderPeopleSuggestions()
}
function openMeetingInfo(index) {
    const m = meetings[index]
      , content = document.querySelector('#meetingInfoContent');
    document.querySelector('#meetingInfoTitle').textContent = m.title;
    content.innerHTML = `<div class="meeting-info-grid"><div><span>会议类型</span><b>${m.type || '待确认'}</b></div><div><span>状态</span><b>${m.status || '已发布'}</b></div><div><span>日期与时间</span><b>${m.meta?.split(' · ')[0] || '待确认'}</b></div><div><span>会议室 / 地点 / 链接</span><b>${m.place || m.meta?.split(' · ')[1] || '待确认'}</b></div><div><span>发起人</span><b>${m.initiator || '待确认'}</b></div><div><span>主持人</span><b>${m.host || '待确认'}</b></div><div><span>记录人</span><b>${m.recorder || '待确认'}</b></div><div><span>必须参加</span><b>${m.participants || '待确认'}</b></div><div><span>建议参加</span><b>${m.suggestedPeople || '无'}</b></div><div><span>仅知会</span><b>${m.informedPeople || '无'}</b></div><div class="wide"><span>会议目标与预期输出</span><b>${m.goal || '待补充'}</b></div><div class="wide"><span>会议议程</span><b>${m.agenda || '待补充'}</b></div><div class="wide"><span>会前材料</span><b>${m.materials || '无'}</b></div><div><span>材料发送时间</span><b>${m.materialTime ? m.materialTime.replace('T', ' ') : '未设置'}</b></div><div><span>会前准备完成度</span><b>${m.readiness || '未记录'}</b></div></div>`;
    document.querySelector('#meetingInfoDialog').showModal()
}
function renderMeetings() {
    const list = document.querySelector('#meetingCards')
      , visible = meetings.map( (m, index) => ({
        ...m,
        index
    }));
    document.querySelector('#meetingCount').textContent = `${visible.length} 场`;
    list.innerHTML = visible.map(m => `<button class="meeting-list-item owner-${m.owner}" data-meeting-info="${m.index}"><span class="meeting-status">${m.status || '已发布'}</span><strong>${m.title}</strong><small>${m.meta}</small><footer><span>${m.type}</span><span class="view-detail">查看详情 ›</span></footer></button>`).join('') || '<div class="account-empty"><b>暂无会议</b>可点击右上角新建会议</div>';
    list.querySelectorAll('[data-meeting-info]').forEach(button => button.onclick = () => openMeetingInfo(+button.dataset.meetingInfo))
}
setupMeetingRefinement();
dialog.addEventListener('close', () => {
    if (activeAccount === 'fresh') {
        localStorage.setItem('scheduleData_fresh_v2', JSON.stringify(schedule));
        localStorage.setItem('taskData_fresh_v2', JSON.stringify(tasks));
        localStorage.setItem('learningRecords_fresh_v2', JSON.stringify(learningRecords))
    }
}
);
const draftKey = type => `createDraft_${cleanAccountKey}_${type}`;
function captureFormDraft(form) {
    const values = {};
    [...form.elements].forEach(el => {
        if (!el.name || ['button', 'submit'].includes(el.type))
            return;
        values[el.name] = ['checkbox', 'radio'].includes(el.type) ? el.checked : el.value
    }
    );
    return values
}
function restoreFormDraft(form, type) {
    const draft = JSON.parse(localStorage.getItem(draftKey(type)) || 'null');
    if (!draft)
        return false;
    Object.entries(draft.values || draft).forEach( ([name,value]) => {
        const el = form.elements[name];
        if (!el)
            return;
        if (el instanceof RadioNodeList) {
            [...el].forEach(x => x.checked = x.value === value)
        } else if (['checkbox', 'radio'].includes(el.type))
            el.checked = !!value;
        else
            el.value = value
    }
    );
    return draft
}
function persistEventDraft() {
    const type = eventForm.elements.createType.value;
    if (editingScheduleIndex === null && ['schedule', 'task'].includes(type))
        localStorage.setItem(draftKey(type), JSON.stringify({
            values: captureFormDraft(eventForm)
        }))
}
function persistMeetingDraft() {
    localStorage.setItem(draftKey('meeting'), JSON.stringify({
        values: captureFormDraft(quickMeetingForm),
        step: quickStep
    }))
}
eventForm.addEventListener('input', persistEventDraft);
eventForm.addEventListener('change', persistEventDraft);
quickMeetingForm.addEventListener('input', persistMeetingDraft);
quickMeetingForm.addEventListener('change', persistMeetingDraft);
document.querySelector('#quickMeetingSteps').addEventListener('click', () => setTimeout(persistMeetingDraft, 0));
document.querySelector('#quickPrev').addEventListener('click', () => setTimeout(persistMeetingDraft, 0));
document.querySelector('#quickNext').addEventListener('click', () => setTimeout(persistMeetingDraft, 0));
function openCreator(type='schedule') {
    editingScheduleIndex = null;
    const c = createConfig[type];
    eventForm.reset();
    eventForm.elements.createType.value = type;
    eventForm.elements.date.value = baseDate;
    document.querySelector('#createTitle').textContent = c.title;
    document.querySelector('#createDesc').textContent = c.desc;
    document.querySelector('#titleLabel').textContent = c.label;
    eventForm.elements.title.placeholder = c.placeholder;
    document.querySelector('#dateLabel').textContent = type === 'task' ? '截止日期' : type === 'learning' ? '学习日期' : '日期';
    document.querySelector('#saveEvent').textContent = c.save;
    document.querySelectorAll('.schedule-field,.task-field,.meeting-field,.learning-field').forEach(el => el.hidden = !el.classList.contains(`${type}-field`));
    const ownerLabel = eventForm.elements.owner.closest('label');
    ownerLabel.hidden = !['schedule', 'task', 'meeting'].includes(type);
    eventForm.elements.owner.options[0].textContent = type === 'schedule' ? '老板日程' : '老板相关';
    eventForm.elements.owner.options[1].textContent = type === 'schedule' ? '我的日程' : '我的工作';
    if (['schedule', 'task'].includes(type))
        restoreFormDraft(eventForm, type);
    syncTimeFields();
    dialog.showModal()
}
function openQuickMeeting() {
    quickMeetingForm.reset();
    quickMeetingForm.elements.quickDate.value = baseDate;
    quickMeetingForm.elements.quickInitiator.value = '';
    quickMeetingForm.elements.quickMaterialTime.value = `${baseDate}T09:30`;
    renderQuickTypeOptions();
    renderPeopleSuggestions();
    const draft = restoreFormDraft(quickMeetingForm, 'meeting');
    document.querySelector('#quickMeetingCheckResult').classList.remove('show');
    calculateQuickDuration();
    showQuickStep(draft?.step || 0);
    quickMeetingDialog.showModal()
}
const eventResetButton = document.createElement('button');
eventResetButton.type = 'button';
eventResetButton.id = 'resetEventDraft';
eventResetButton.className = 'reset-draft';
eventResetButton.textContent = '重置';
document.querySelector('#newDialog .modal-actions').prepend(eventResetButton);
eventResetButton.onclick = () => {
    const type = eventForm.elements.createType.value;
    if (!['schedule', 'task'].includes(type))
        return;
    localStorage.removeItem(draftKey(type));
    eventForm.reset();
    eventForm.elements.createType.value = type;
    eventForm.elements.date.value = baseDate;
    syncTimeFields();
    showToast(`${type === 'schedule' ? '日程' : '任务'}内容已重置`)
}
;
const meetingResetButton = document.createElement('button');
meetingResetButton.type = 'button';
meetingResetButton.id = 'resetMeetingDraft';
meetingResetButton.className = 'reset-draft';
meetingResetButton.textContent = '重置';
document.querySelector('#quickMeetingDialog .modal-actions').prepend(meetingResetButton);
meetingResetButton.onclick = () => {
    localStorage.removeItem(draftKey('meeting'));
    quickMeetingForm.reset();
    quickMeetingForm.elements.quickDate.value = baseDate;
    quickMeetingForm.elements.quickInitiator.value = '';
    quickMeetingForm.elements.quickMaterialTime.value = `${baseDate}T09:30`;
    renderQuickTypeOptions();
    calculateQuickDuration();
    showQuickStep(0);
    showToast('会议内容已重置')
}
;
function showToast(message) {
    if (/日程(修改)?已保存/.test(message))
        localStorage.removeItem(draftKey('schedule'));
    if (/任务已保存/.test(message))
        localStorage.removeItem(draftKey('task'));
    if (/会议已创建|会议草稿已保存/.test(message))
        localStorage.removeItem(draftKey('meeting'));
    const t = document.querySelector('#toast');
    t.textContent = message;
    t.classList.add('show');
    setTimeout( () => t.classList.remove('show'), 2400)
}
document.querySelector('#dashboardPrevDay').onclick = () => {
    dashboardDate = shiftDate(dashboardDate, -1);
    renderTimeline()
}
;
document.querySelector('#dashboardNextDay').onclick = () => {
    dashboardDate = shiftDate(dashboardDate, 1);
    renderTimeline()
}
;
document.querySelector('#dashboardToday').onclick = () => {
    dashboardDate = baseDate;
    renderTimeline()
}
;
document.querySelector('#itineraryPrevDay').onclick = () => {
    itineraryDate = shiftDate(itineraryDate, -1);
    renderItinerary()
};
document.querySelector('#itineraryNextDay').onclick = () => {
    itineraryDate = shiftDate(itineraryDate, 1);
    renderItinerary()
};
document.querySelector('#itineraryToday').onclick = () => {
    itineraryDate = baseDate;
    renderItinerary()
};
document.querySelector('#itineraryWeatherSettings').onclick = () => {
    switchView('dashboard');
    document.querySelector('#weatherCity').focus()
};
document.querySelector('#itineraryCreate').onclick = () => {
    openCreator('schedule');
    eventForm.elements.date.value = itineraryDate
};
document.querySelector('#taskPrevDay').onclick = () => {
    taskDate = shiftDate(taskDate, -1);
    renderTasks()
}
;
document.querySelector('#taskNextDay').onclick = () => {
    taskDate = shiftDate(taskDate, 1);
    renderTasks()
}
;
document.querySelector('#taskToday').onclick = () => {
    taskDate = baseDate;
    renderTasks()
}
;
document.querySelectorAll('[data-priority-filter]').forEach(b => b.onclick = () => {
    taskPriorityFilter = b.dataset.priorityFilter;
    document.querySelectorAll('[data-priority-filter]').forEach(x => x.classList.toggle('active', x === b));
    renderTasks()
}
);
document.querySelectorAll('[data-calendar-mode]').forEach(button => button.onclick = () => {
    calendarMode = button.dataset.calendarMode;
    document.querySelectorAll('[data-calendar-mode]').forEach(x => x.classList.toggle('active', x === button));
    renderCalendar()
}
);
function openScheduleEdit(index) {
    openCreator('schedule');
    editingScheduleIndex = index;
    const item = schedule[index];
    document.querySelector('#createTitle').textContent = '编辑日程';
    document.querySelector('#createDesc').textContent = '修改后会同步更新工作台和日历';
    document.querySelector('#saveEvent').textContent = '保存修改';
    eventForm.elements.title.value = item.title;
    eventForm.elements.owner.value = item.owner;
    eventForm.elements.date.value = item.date || baseDate;
    eventForm.elements.location.value = item.place || '';
    eventForm.elements.priority.value = String(priorityLevel(item.priority));
    eventForm.elements.scheduleCategory.value = item.category || 'work';
    eventForm.elements.scheduleType.value = item.scheduleType || '';
    eventForm.elements.scheduleParticipants.value = item.participants || '';
    eventForm.elements.note.value = item.note || '';
    const value = item.time || '';
    if (item.timeMode) {
        eventForm.elements.timeMode.value = item.timeMode;
        eventForm.elements.startTime.value = item.startTime || '';
        eventForm.elements.endTime.value = item.endTime || ''
    } else if (value.includes('–')) {
        eventForm.elements.timeMode.value = 'exact';
        const [start,end] = value.split('–');
        eventForm.elements.startTime.value = start;
        eventForm.elements.endTime.value = end
    } else if (/^\d{2}:\d{2}$/.test(value)) {
        eventForm.elements.timeMode.value = 'start';
        eventForm.elements.startTime.value = value
    } else
        eventForm.elements.timeMode.value = 'none';
    syncTimeFields()
}
createConfig.task.desc = '记录任务日期、所属对象和三级优先级';
createConfig.learning.desc = '记录学习内容、学习日期、学习时间和学习总结';
createConfig.learning.label = '学习内容';
titles.meetings[1] = '';
titles.learning[1] = '记录学习内容，并分别保存今日总结和学习总结';
document.querySelector('#pageSub').textContent = '今天的日程、任务和会议已为你整理好';
renderLearningRecords();
setupSummaries();
renderTimeline();
renderTasks();
renderCalendar();
function refreshCurrentDate() {
    const now = new Date()
      , parts = new Intl.DateTimeFormat('en-US', {timeZone: currentTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now)
      , date = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-')
      , shownDate = now.toLocaleDateString('zh-CN', {timeZone: currentTimeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'});
    document.querySelector('#liveDate').textContent = shownDate;
    document.querySelector('#liveDate').dateTime = date;
    document.querySelector('#liveTime').textContent = now.toLocaleTimeString('zh-CN', {timeZone: currentTimeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    document.querySelector('#liveTime').dateTime = now.toISOString();
    document.querySelector('#livePlace').textContent = currentPlaceName ? `${currentPlaceName}时间` : '本机时间';
    document.querySelector('#itineraryClockPlace').textContent = currentPlaceName ? `${currentPlaceName} · 当地时间` : '本机时间 · 尚未设置地点';
    document.querySelector('#itineraryClockDate').textContent = shownDate;
    document.querySelector('#itineraryClockDate').dateTime = date;
    document.querySelector('#itineraryLiveTime').textContent = now.toLocaleTimeString('zh-CN', {timeZone: currentTimeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
    document.querySelector('#itineraryLiveTime').dateTime = now.toISOString();
    renderProfile();
    if (date === baseDate)
        return;
    if (dashboardDate === baseDate)
        dashboardDate = date;
    if (taskDate === baseDate)
        taskDate = date;
    if (itineraryDate === baseDate)
        itineraryDate = date;
    baseDate = date;
    renderTimeline();
    renderTasks();
    renderCalendar();
    renderReminders()
}
refreshCurrentDate();
setInterval(refreshCurrentDate, 1000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden)
        refreshCurrentDate()
});
