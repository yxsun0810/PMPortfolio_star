/* Public portfolio demo only. Every weather value below is generated synthetic data. */
const WeatherDemoCore = (() => {
  'use strict';

  const cities = [
    { id: 'wuhan', name: '武汉', province: '湖北', seed: 1, climate: 18.0 },
    { id: 'chengdu', name: '成都', province: '四川', seed: 2, climate: 16.2 },
    { id: 'beijing', name: '北京', province: '北京', seed: 3, climate: 12.6 },
    { id: 'hangzhou', name: '杭州', province: '浙江', seed: 4, climate: 17.0 },
    { id: 'guangzhou', name: '广州', province: '广东', seed: 5, climate: 22.1 }
  ];

  const metrics = {
    history: [
      { id: 'tmean', name: '日平均气温', unit: '°C', field: 'weather_daily.tmean', baseline: 'climate_normal.tmean_n' },
      { id: 'precipitation', name: '日降水量', unit: 'mm', field: 'weather_daily.precipitation', baseline: 'climate_normal.precip_n' },
      { id: 'humidity', name: '相对湿度', unit: '%', field: 'weather_daily.humidity', baseline: 'climate_normal.hum_n' },
      { id: 'tmax', name: '日最高气温', unit: '°C', field: 'weather_daily.tmax', baseline: null },
      { id: 'wind_max', name: '最大风速', unit: 'km/h', field: 'weather_daily.wind_max', baseline: 'climate_normal.wind_n' }
    ],
    forecast: [
      { id: 'tmax', name: '预报最高气温', unit: '°C', field: 'weather_forecast_snap.tmax' },
      { id: 'tmin', name: '预报最低气温', unit: '°C', field: 'weather_forecast_snap.tmin' },
      { id: 'precip_prob', name: '降水概率', unit: '%', field: 'weather_forecast_snap.precip_prob' },
      { id: 'precipitation', name: '预报降水量', unit: 'mm', field: 'weather_forecast_snap.precipitation' },
      { id: 'uv_index_max', name: '紫外线指数', unit: '指数', field: 'weather_forecast_snap.uv_index_max' }
    ]
  };

  const initialState = () => ({
    mode: 'history',
    cityIds: ['wuhan', 'chengdu'],
    start: '2025-08-01',
    end: '2025-08-31',
    metricIds: ['tmean', 'precipitation'],
    baseline: true,
    madeDate: '2026-09-20'
  });

  function dateFromIso(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  }

  function isoFromDate(date) { return date.toISOString().slice(0, 10); }
  function addDays(value, days) {
    const date = dateFromIso(value);
    if (!date) return '';
    date.setUTCDate(date.getUTCDate() + days);
    return isoFromDate(date);
  }

  function datesBetween(start, end, maximum = 62) {
    const from = dateFromIso(start), to = dateFromIso(end);
    if (!from || !to || from > to) return { dates: [], error: '请选择有效的开始和结束日期，且开始日期不能晚于结束日期。' };
    const count = Math.round((to - from) / 86400000) + 1;
    if (count > maximum) return { dates: [], error: `演示一次最多展示 ${maximum} 天，请缩小日期范围。` };
    return { dates: Array.from({ length: count }, (_, index) => addDays(start, index)), error: '' };
  }

  const round = (value, digits = 1) => Number(value.toFixed(digits));

  function historyRow(city, date) {
    const d = dateFromIso(date);
    const day = Math.floor(d.getTime() / 86400000);
    const yearDay = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
    const seasonal = 10 * Math.sin((yearDay - 80) * 2 * Math.PI / 365.25);
    const tmeanNormal = city.climate + seasonal;
    const precipNormal = 2.9 + 1.3 * Math.sin((yearDay + city.seed * 17) * 2 * Math.PI / 365.25);
    const humNormal = 66 + city.seed * 2;
    const windNormal = 13 + city.seed;
    const swing = 2.8 * Math.sin(day * .39 + city.seed * 1.7);
    const tmean = tmeanNormal + swing;
    const precipitation = Math.max(0, precipNormal + 5.2 * Math.sin(day * .73 + city.seed * 2.6));
    return {
      cityId: city.id, city: city.name, date,
      tmean: round(tmean), tmean_n: round(tmeanNormal),
      precipitation: round(precipitation), precip_n: round(precipNormal),
      humidity: round(humNormal + 8 * Math.sin(day * .28 + city.seed)), hum_n: round(humNormal),
      tmax: round(tmean + 5.2 + Math.sin(day * .5) * 1.2),
      wind_max: round(windNormal + 3.3 * Math.cos(day * .42 + city.seed)), wind_n: round(windNormal)
    };
  }

  function forecastRow(city, date, madeDate) {
    const base = historyRow(city, date);
    const lead = Math.round((dateFromIso(date) - dateFromIso(madeDate)) / 86400000);
    const runShift = madeDate.endsWith('19') ? -1.1 : .6;
    return {
      cityId: city.id, city: city.name, date, madeDate,
      tmax: round(base.tmax + runShift + lead * .13),
      tmin: round(base.tmean - 4.3 + runShift * .7),
      precip_prob: Math.max(0, Math.min(100, Math.round(base.precipitation * 6 + lead * 3))),
      precipitation: round(base.precipitation * (1 + runShift * .06)),
      uv_index_max: round(Math.max(1, 6 + Math.sin(lead + city.seed) * 2))
    };
  }

  function validate(state) {
    if (!['history', 'forecast'].includes(state.mode)) return '请选择历史实况或预报快照。';
    if (!state.cityIds.length) return '请至少选择一座城市。';
    if (state.cityIds.length > 3) return '演示最多比较三座城市。';
    if (state.cityIds.some(id => !cities.some(city => city.id === id))) return '所选城市不在公开演示样例中。';
    if (!state.metricIds.length) return '请至少加入一个气象指标。';
    const allowed = metrics[state.mode].map(metric => metric.id);
    if (state.metricIds.some(id => !allowed.includes(id))) return '指标与当前数据类型不匹配，请重新选择。';
    const range = datesBetween(state.start, state.end, state.mode === 'forecast' ? 7 : 62);
    if (range.error) return range.error;
    if (state.mode === 'history') {
      if (state.end > '2026-09-01') return '合成历史样例只覆盖至 2026-09-01；这不是正式数据的最新日期。';
      if (state.baseline && !state.metricIds.some(id => metrics.history.find(metric => metric.id === id)?.baseline))
        return '所选指标没有可用的常年基线。请取消常年对比，或加入日平均气温、降水量等可对比指标。';
    } else {
      if (!['2026-09-19', '2026-09-20'].includes(state.madeDate)) return '请选择演示提供的预报制作批次。';
      if (state.start <= state.madeDate || state.end > addDays(state.madeDate, 7))
        return '目标日期必须在所选预报制作日之后七天内；制作日和被预报日期不能混用。';
    }
    return '';
  }

  function evaluate(state) {
    const error = validate(state);
    if (error) return { error, rows: [], dates: [] };
    const dates = datesBetween(state.start, state.end).dates;
    const selectedCities = state.cityIds.map(id => cities.find(city => city.id === id));
    const rows = selectedCities.flatMap(city => dates.map(date => state.mode === 'history'
      ? historyRow(city, date) : forecastRow(city, date, state.madeDate)));
    return { error: '', rows, dates, cities: selectedCities };
  }

  function parseQuestion(question) {
    const text = String(question || '').trim();
    if (!text) return { kind: 'clarify', message: '先说说想看哪些城市、哪个时间段和什么天气指标。' };
    const matchedCities = cities.filter(city => text.includes(city.name)).map(city => city.id);
    if (/最高温/.test(text) && /常年|偏离|异常/.test(text))
      return { kind: 'clarify-high', message: '现有常年基线没有“最高温常年值”。可以改看日平均气温相对常年的偏离，或只看最高温、不计算常年偏离。' };
    if (/去年/.test(text) && /今年/.test(text))
      return { kind: 'clarify', message: '这版演示一次选择一个连续日期范围。请先选去年或今年的范围；跨年度同比需在后续版本明确两个独立时间窗口。' };
    if (/预报|预测/.test(text)) {
      const madeDate = /19\s*日.*(制作|预报)/.test(text) ? '2026-09-19' : '2026-09-20';
      return {
      kind: 'apply', mode: 'forecast',
      cityIds: matchedCities.length ? matchedCities : ['wuhan', 'chengdu'],
      start: addDays(madeDate, 1), end: addDays(madeDate, 7), madeDate,
      metricIds: ['tmax', 'precip_prob'], baseline: false,
      message: '已选预报快照。请确认“预报制作日”和“被预报日期”，两者不能互相代替。'
      };
    }
    if (!/天气|气温|温度|降水|下雨|湿度|风速|常年/.test(text))
      return { kind: 'clarify', message: '这版是规则驱动的公开演示，只识别天气、城市、时间和部分指标；请试试下方示例问题。' };
    let start = '2025-08-01', end = '2025-08-31';
    const explicit = text.match(/(20\d{2})年\s*(\d{1,2})月/);
    const relative = text.match(/(去年|今年)\s*(\d{1,2})月/);
    if (explicit || relative) {
      const year = explicit ? Number(explicit[1]) : relative[1] === '去年' ? 2025 : 2026;
      const month = Number(explicit ? explicit[2] : relative[2]);
      if (month < 1 || month > 12) return { kind: 'clarify', message: '月份应为 1–12，请重新输入。' };
      start = `${year}-${String(month).padStart(2, '0')}-01`;
      end = addDays(`${year}-${String(month + 1).padStart(2, '0')}-01`, -1);
      if (month === 12) end = `${year}-12-31`;
    }
    const metricIds = [];
    if (/平均气温|平均温度|常年/.test(text)) metricIds.push('tmean');
    if (/降水|下雨/.test(text)) metricIds.push('precipitation');
    if (/湿度/.test(text)) metricIds.push('humidity');
    if (/最高温/.test(text)) metricIds.push('tmax');
    if (/风速/.test(text)) metricIds.push('wind_max');
    if (!metricIds.length) metricIds.push('tmean', 'precipitation');
    return {
      kind: 'apply', mode: 'history',
      cityIds: matchedCities.length ? matchedCities : ['wuhan', 'chengdu'],
      start, end, metricIds, baseline: /常年|偏离/.test(text),
      message: '已整理为历史实况查询。请检查城市、日期与指标，再决定是否做常年对比。'
    };
  }

  function requestText(state, count) {
    const names = state.cityIds.map(id => cities.find(city => city.id === id)?.name).filter(Boolean);
    const selected = state.metricIds.map(id => metrics[state.mode].find(metric => metric.id === id)).filter(Boolean);
    const sources = state.mode === 'history'
      ? `dim_city + weather_daily${state.baseline ? ' + climate_normal' : ''}`
      : 'dim_city + weather_forecast_snap';
    const lines = [
      '天气数仓只读取数需求（公开演示生成；尚非可执行命令）',
      `数据类型：${state.mode === 'history' ? '历史实况' : '指定制作批次的预报快照'}`,
      `城市：${names.join('、')}（用城市稳定标识关联，不模糊匹配城市名）`,
      `目标日期：${state.start} 至 ${state.end}（含首尾）`,
      ...(state.mode === 'forecast' ? [`预报制作日期：${state.madeDate}；只查询这一批次`] : []),
      `字段：城市、日期、${selected.map(metric => `${metric.name}［${metric.field}，${metric.unit}］`).join('、')}`,
      ...(state.mode === 'history' && state.baseline ? ['常年对比：仅为具备对应 climate_normal 字段的指标计算偏离；不得为日最高气温编造常年值。'] : []),
      `预计行数：${count} 行（城市 × 日期；演示估算）`,
      `数据表：${sources}`,
      '限制：天气数仓是独立系统；不得复用数仓前台的取数口令。真实只读入口、权限和新鲜度须另行确认。',
      '请只取上述字段与时间范围；数据不可用时如实说明，不猜测或编造结果。'
    ];
    return lines.join('\n');
  }

  return { cities, metrics, initialState, addDays, datesBetween, historyRow, forecastRow, validate, evaluate, parseQuestion, requestText };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = WeatherDemoCore;
if (typeof window !== 'undefined') window.WeatherDemoCore = WeatherDemoCore;
