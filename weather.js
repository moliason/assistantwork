const weatherStatus = document.querySelector('#weatherStatus')
  , weatherResults = document.querySelector('#weatherResults')
  , weatherCity = document.querySelector('#weatherCity');
let weatherLocation = null
  , weatherRequest = null
  , weatherUpdatedAt = 0
  , locationSelection = 0;
try {
    const saved = JSON.parse(localStorage.getItem('xujianWeatherLocation'));
    if (saved && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && Math.abs(saved.latitude) <= 90 && Math.abs(saved.longitude) <= 180) {
        weatherLocation = saved;
        if (saved.name === '当前位置') {
            weatherLocation = {...saved, name: '定位地点（待获取地名）', source: 'geolocation', nameResolved: false};
        }
        if (saved.timeZone) {
            new Intl.DateTimeFormat('zh-CN', {timeZone: saved.timeZone});
            currentTimeZone = saved.timeZone;
            currentPlaceName = weatherLocation.name;
            refreshCurrentDate()
        }
    }
} catch {
    localStorage.removeItem('xujianWeatherLocation')
}

async function refreshWeather(place = weatherLocation) {
    if (!place)
        return;
    weatherRequest?.abort();
    const controller = new AbortController()
      , timeout = setTimeout(() => controller.abort(), 12000);
    weatherRequest = controller;
    weatherStatus.textContent = `正在更新${place.name}的天气…`;
    try {
        const params = new URLSearchParams({latitude: place.latitude, longitude: place.longitude, current: 'temperature_2m,weather_code,is_day', daily: 'temperature_2m_min,temperature_2m_max,weather_code,wind_speed_10m_max,apparent_temperature_min,apparent_temperature_max', timezone: 'auto', forecast_days: 7})
          , response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {signal: controller.signal});
        if (!response.ok)
            throw new Error('天气服务暂不可用');
        const {current, daily, timezone} = await response.json();
        if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code))
            throw new Error('天气数据不完整');
        if (weatherRequest !== controller)
            return;
        const code = current.weather_code
          , conditions = {0: '晴', 1: '晴间多云', 2: '多云', 3: '阴', 45: '雾', 48: '雾凇', 51: '小毛毛雨', 53: '毛毛雨', 55: '强毛毛雨', 56: '冻毛毛雨', 57: '强冻毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨', 71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪', 80: '小阵雨', 81: '阵雨', 82: '强阵雨', 85: '阵雪', 86: '强阵雪', 95: '雷雨', 96: '雷雨伴冰雹', 99: '强雷雨伴冰雹'};
        const placeTimeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        new Intl.DateTimeFormat('zh-CN', {timeZone: placeTimeZone});
        currentTimeZone = placeTimeZone;
        currentPlaceName = place.name;
        weatherLocation = {...place, timeZone: placeTimeZone};
        weatherUpdatedAt = Date.now();
        itineraryForecast = {
            place: place.name,
            days: (daily?.time || []).flatMap((date, index) => {
                const low = daily.temperature_2m_min?.[index]
                  , high = daily.temperature_2m_max?.[index]
                  , wind = daily.wind_speed_10m_max?.[index]
                  , feelsLow = daily.apparent_temperature_min?.[index]
                  , feelsHigh = daily.apparent_temperature_max?.[index];
                if (!Number.isFinite(low) || !Number.isFinite(high))
                    return [];
                const details = [`气温：${Math.round(low)}°C ～ ${Math.round(high)}°C`, `天气：${conditions[daily.weather_code?.[index]] || '暂无描述'}`];
                if (Number.isFinite(wind))
                    details.push(`最大风速：${Math.round(wind)} km/h`);
                if (Number.isFinite(feelsLow) && Number.isFinite(feelsHigh))
                    details.push(`体感温度：${Math.round(feelsLow)}°C ～ ${Math.round(feelsHigh)}°C`);
                return [{date, summary: details.join(' · ')}]
            })
        };
        refreshCurrentDate();
        renderItinerary();
        localStorage.setItem('xujianWeatherLocation', JSON.stringify(weatherLocation));
        document.querySelector('#weatherTemperature').textContent = `${Math.round(current.temperature_2m)}°`;
        document.querySelector('#weatherDescription').textContent = `${place.name} · ${conditions[code] || '天气状况未知'}`;
        document.querySelector('#weatherIcon').textContent = code <= 1 ? (current.is_day ? '☀' : '☾') : code <= 3 ? '☁' : code >= 95 ? 'ϟ' : [71, 73, 75, 77, 85, 86].includes(code) ? '❄' : [45, 48].includes(code) ? '≋' : '☂';
        weatherStatus.textContent = `${new Date().toLocaleTimeString('zh-CN', {timeZone: currentTimeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})} 已更新 · 每 15 分钟自动刷新`;
        if (place.nameResolved === false)
            weatherStatus.textContent += ' · 地名获取失败，请重新定位或手动选择城市';
        weatherCity.value = place.source === 'geolocation' ? '' : place.name
    } catch {
        if (weatherRequest !== controller)
            return;
        weatherUpdatedAt = 0;
        itineraryForecast = null;
        renderItinerary();
        document.querySelector('#weatherTemperature').textContent = '—°';
        document.querySelector('#weatherIcon').textContent = '◌';
        document.querySelector('#weatherDescription').textContent = `${place.name} · 天气暂不可用`;
        weatherStatus.textContent = '更新失败，请检查网络后重试，稍后也会自动重试';
        weatherLocation = place
    } finally {
        clearTimeout(timeout);
        if (weatherRequest === controller)
            weatherRequest = null
    }
}

document.querySelector('#weatherCityForm').onsubmit = async event => {
    event.preventDefault();
    const query = weatherCity.value.trim();
    if (!query)
        return;
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    weatherResults.hidden = true;
    weatherResults.replaceChildren();
    weatherStatus.textContent = '正在查找城市…';
    const controller = new AbortController()
      , timeout = setTimeout(() => controller.abort(), 12000);
    try {
        const params = new URLSearchParams({name: query, count: 5, language: 'zh', format: 'json'})
          , response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {signal: controller.signal});
        if (!response.ok)
            throw new Error('城市查询失败');
        const {results = []} = await response.json();
        if (!results.length) {
            weatherStatus.textContent = '未找到城市，请尝试完整城市名或拼音';
            return
        }
        weatherStatus.textContent = '请选择所在城市';
        weatherResults.hidden = false;
        results.forEach(place => {
            const option = document.createElement('button');
            option.type = 'button';
            option.textContent = [...new Set([place.name, place.admin1, place.country].filter(Boolean))].join(' · ');
            option.onclick = () => {
                locationSelection++;
                weatherResults.hidden = true;
                refreshWeather({name: place.name, latitude: place.latitude, longitude: place.longitude})
            };
            weatherResults.append(option)
        })
    } catch {
        weatherStatus.textContent = '城市查询失败，请检查网络后重试'
    } finally {
        clearTimeout(timeout);
        button.disabled = false
    }
};

document.querySelector('#weatherLocate').onclick = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
        weatherStatus.textContent = '此环境不支持定位，请手动输入城市（定位需要 HTTPS 或 localhost）';
        return
    }
    const button = document.querySelector('#weatherLocate');
    const selection = ++locationSelection;
    button.disabled = true;
    weatherRequest?.abort();
    weatherRequest = null;
    weatherResults.hidden = true;
    weatherStatus.textContent = '正在获取位置，请在浏览器中允许定位…';
    navigator.geolocation.getCurrentPosition(async position => {
        if (selection !== locationSelection) {
            button.disabled = false;
            return
        }
        const {latitude, longitude} = position.coords
          , controller = new AbortController()
          , timeout = setTimeout(() => controller.abort(), 10000);
        let name = '定位地点（地名暂不可用）'
          , nameResolved = false;
        if (selection === locationSelection)
            weatherStatus.textContent = '已获取坐标，正在解析真实地名…';
        try {
            const params = new URLSearchParams({latitude, longitude, localityLanguage: 'zh'})
              , response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`, {signal: controller.signal});
            if (!response.ok)
                throw new Error('地名解析不可用');
            const address = await response.json()
              , names = [...new Set([address.city || address.principalSubdivision, address.locality].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
            if (!names.length || /ip/i.test(address.lookupSource || ''))
                throw new Error('没有可靠的定位地名');
            name = names.join(' · ');
            nameResolved = true
        } catch {
            // 保留坐标天气，但不把未知地名伪装成真实地址。
        } finally {
            clearTimeout(timeout);
            button.disabled = false
        }
        if (selection === locationSelection)
            await refreshWeather({name, latitude, longitude, source: 'geolocation', nameResolved})
    }, error => {
        button.disabled = false;
        if (selection !== locationSelection)
            return;
        weatherStatus.textContent = error.code === 1 ? '未获得定位授权，请手动输入城市' : '定位超时或不可用，请重试或手动输入城市'
    }, {timeout: 10000, maximumAge: 300000, enableHighAccuracy: false})
};

if (weatherLocation)
    refreshWeather();
if (weatherLocation?.nameResolved === false && navigator.permissions)
    navigator.permissions.query({name: 'geolocation'}).then(permission => {
        if (permission.state === 'granted' && locationSelection === 0)
            document.querySelector('#weatherLocate').click()
    }).catch(() => {});
setInterval(() => {
    if (!document.hidden && !weatherRequest && !document.querySelector('#weatherLocate').disabled)
        refreshWeather()
}, 15 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !weatherRequest && !document.querySelector('#weatherLocate').disabled && Date.now() - weatherUpdatedAt >= 15 * 60 * 1000)
        refreshWeather()
});
window.addEventListener('online', () => {
    if (!document.querySelector('#weatherLocate').disabled)
        refreshWeather()
});
