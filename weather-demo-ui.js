/* Public browser-only interaction. No network calls or real AI requests. */
(() => {
  'use strict';
  const core = window.WeatherDemoCore;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
  const cityById = id => core.cities.find(city => city.id === id);
  const metricById = (mode, id) => core.metrics[mode].find(metric => metric.id === id);
  const colors = ['#315ed9', '#0b827e', '#ef8c55'];
  const examples = {
    history: '比较武汉和成都 2025 年 8 月的平均气温和降水，与常年相比',
    forecast: '看武汉和成都 9 月 20 日制作的未来预报',
    clarify: '武汉最高温比常年高多少？'
  };
  let state = core.initialState();
  let result = null;
  let chartMetricId = 'tmean';
  let focusBeforeDialog = null;

  function clearResult(message = '选择已更新，请重新生成演示结果。') {
    result = null;
    $('#result-body').classList.add('hidden');
    $('#result-placeholder').classList.remove('hidden');
    $('#result-placeholder').textContent = message;
    $('#copy-status').textContent = '';
  }

  function renderMode() {
    $$('[data-mode]').forEach(button => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const forecast = state.mode === 'forecast';
    $('#made-date-wrap').classList.toggle('hidden', !forecast);
    $('#baseline-row').classList.toggle('hidden', forecast);
    $('#date-explainer').textContent = forecast
      ? '先选预报制作日，再选这版预报所覆盖的目标日期。'
      : '历史实况按被观测的业务日期筛选，包含开始和结束当天。';
    $('#date-note').textContent = forecast
      ? '演示预报批次只覆盖制作日之后七天；不同制作日是不同版本。'
      : '历史合成样例一次最多展示 62 天，不代表真实数据覆盖范围。';
    $('#made-date').value = state.madeDate;
  }

  function renderCities() {
    $('#city-options').innerHTML = core.cities.map(city => {
      const active = state.cityIds.includes(city.id);
      return `<button class="option ${active ? 'active' : ''}" type="button" data-city="${city.id}" aria-pressed="${active}"><span><strong>${esc(city.name)}</strong><small>${esc(city.province)}</small></span><span class="plus">${active ? '✓' : '＋'}</span></button>`;
    }).join('');
  }

  function renderMetrics() {
    $('#metric-options').innerHTML = core.metrics[state.mode].map(metric => {
      const active = state.metricIds.includes(metric.id);
      const note = state.mode === 'history' && !metric.baseline ? '无对应常年基线' : metric.field;
      return `<button class="option ${active ? 'active' : ''}" type="button" data-metric="${metric.id}" aria-pressed="${active}"><span><strong>${esc(metric.name)} · ${esc(metric.unit)}</strong><small>${esc(note)}</small></span><span class="plus">${active ? '✓' : '＋'}</span></button>`;
    }).join('');
    $('#baseline-toggle').checked = state.baseline;
  }

  function chip(label, kind, removeType, value) {
    return `<span class="chip ${kind || ''}">${esc(label)}${removeType ? `<button type="button" data-remove-${removeType}="${esc(value)}" aria-label="移除${esc(label)}">×</button>` : ''}</span>`;
  }

  function renderCart() {
    $('#cart-cities').innerHTML = state.cityIds.length
      ? state.cityIds.map(id => chip(cityById(id).name, '', 'city', id)).join('')
      : '<span class="chip-empty">尚未选城市</span>';
    $('#cart-time').innerHTML = chip(`${state.start} → ${state.end}`) +
      (state.mode === 'forecast' ? chip(`制作日 ${state.madeDate}`, 'fact') : '');
    $('#cart-metrics').innerHTML = state.metricIds.length
      ? state.metricIds.map(id => chip(metricById(state.mode, id).name, 'metric', 'metric', id)).join('')
      : '<span class="chip-empty">尚未选指标</span>';
    $('#cart-facts').innerHTML = state.mode === 'history'
      ? chip('历史实况', 'fact') + (state.baseline ? chip('常年基线', 'fact') : '')
      : chip('单一预报制作批次', 'fact');
    $('#cart-count').textContent = `${state.cityIds.length + state.metricIds.length + 1} 项`;
    const range = core.datesBetween(state.start, state.end, state.mode === 'forecast' ? 7 : 62);
    $('#cart-estimate').textContent = range.error ? '请先校正日期范围。'
      : `预计 ${state.cityIds.length} 城 × ${range.dates.length} 天 = ${state.cityIds.length * range.dates.length} 行合成样例。`;
    const error = core.validate(state);
    $('#cart-error').textContent = error;
    $('#cart-error').classList.toggle('hidden', !error);
    $('#run-query').disabled = Boolean(error);
  }

  function renderAll() {
    renderMode(); renderCities(); renderMetrics();
    $('#date-start').value = state.start;
    $('#date-end').value = state.end;
    renderCart();
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    if (mode === 'forecast') {
      state = { ...state, mode, start: '2026-09-21', end: '2026-09-27', metricIds: ['tmax', 'precip_prob'], baseline: false, madeDate: '2026-09-20' };
    } else {
      state = core.initialState();
    }
    clearResult(); renderAll();
    $('#ai-summary').textContent = mode === 'forecast'
      ? '✦ 已切换到预报快照：请同时检查制作日与目标日期。'
      : '✦ 已切换到历史实况：可选同日常年基线做对比。';
  }

  function sum(values) { return values.reduce((total, value) => total + value, 0); }
  function aggregate(rows, key, metricId) {
    const values = rows.map(row => Number(row[key])).filter(Number.isFinite);
    if (!values.length) return null;
    const value = metricId === 'precipitation' ? sum(values) : sum(values) / values.length;
    return Number(value.toFixed(1));
  }

  function renderSummary() {
    const header = '<thead><tr><th>城市</th><th>指标</th><th>本次范围</th><th>对照</th></tr></thead>';
    const rows = result.cities.flatMap(city => state.metricIds.map(id => {
      const metric = metricById(state.mode, id);
      const cityRows = result.rows.filter(row => row.cityId === city.id);
      const current = aggregate(cityRows, id, id);
      const baselineKey = state.mode === 'history' && state.baseline && metric.baseline ? metric.baseline.split('.')[1] : null;
      const baseline = baselineKey ? aggregate(cityRows, baselineKey, id) : null;
      const difference = baseline == null ? '' : `差 ${current - baseline >= 0 ? '+' : ''}${(current - baseline).toFixed(1)} ${metric.unit}`;
      return `<tr><td class="city-name">${esc(city.name)}</td><td>${esc(metric.name)}</td><td>${current} ${esc(metric.unit)}<small>${id === 'precipitation' ? '合计' : '日均'}</small></td><td>${baseline == null ? '—' : `${baseline} ${esc(metric.unit)}<small>${esc(difference)}</small>`}</td></tr>`;
    })).join('');
    $('#summary').innerHTML = `<table>${header}<tbody>${rows}</tbody></table><p class="summary-note">${state.mode === 'forecast' ? `同一制作批次：${esc(state.madeDate)}；“对照”留空，不把另一版预报冒充实况。` : '常年对照只用于有对应基线的指标；横线表示当前字段没有可比常年值。'}全部数值为合成样例。</p>`;
  }

  function renderChart() {
    const metric = metricById(state.mode, chartMetricId);
    if (!metric) return;
    const baselineKey = state.mode === 'history' && state.baseline && metric.baseline ? metric.baseline.split('.')[1] : null;
    const series = [];
    result.cities.forEach((city, index) => {
      const cityRows = result.rows.filter(row => row.cityId === city.id);
      series.push({ label: city.name, color: colors[index], values: cityRows.map(row => row[chartMetricId]), baseline: false });
      if (baselineKey) series.push({ label: `${city.name}·常年`, color: colors[index], values: cityRows.map(row => row[baselineKey]), baseline: true });
    });
    const allValues = series.flatMap(item => item.values);
    const low = Math.floor(Math.min(...allValues) - 1), high = Math.ceil(Math.max(...allValues) + 1);
    const span = Math.max(1, high - low), width = 680, height = 230, left = 40, right = 12, top = 16, bottom = 34;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const x = index => left + (result.dates.length === 1 ? plotWidth / 2 : index * plotWidth / (result.dates.length - 1));
    const y = value => top + (high - value) * plotHeight / span;
    const grid = [0, .5, 1].map(fraction => {
      const yy = top + fraction * plotHeight;
      return `<line class="grid-line" x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"/><text class="axis-label" x="4" y="${yy + 4}">${(high - fraction * span).toFixed(0)}</text>`;
    }).join('');
    const ticks = [...new Set([0, Math.floor((result.dates.length - 1) / 2), result.dates.length - 1])]
      .map(index => `<text class="axis-label" text-anchor="middle" x="${x(index)}" y="${height - 8}">${esc(result.dates[index].slice(5))}</text>`).join('');
    const lines = series.map(item => `<polyline class="series ${item.baseline ? 'baseline-series' : ''}" stroke="${item.color}" points="${item.values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')}"/>`).join('');
    $('#chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(metric.name)}逐日合成趋势图">${grid}${lines}${ticks}</svg>`;
    $('#chart-legend').innerHTML = series.map(item => `<span class="legend-item"><i style="background:${item.color};${item.baseline ? 'opacity:.5' : ''}"></i>${esc(item.label)}</span>`).join('');
  }

  function generateResult() {
    const answer = core.evaluate(state);
    if (answer.error) { renderCart(); return; }
    result = answer;
    chartMetricId = state.metricIds[0];
    $('#chart-metric').innerHTML = state.metricIds.map(id => `<option value="${esc(id)}">${esc(metricById(state.mode, id).name)}</option>`).join('');
    $('#chart-metric').value = chartMetricId;
    $('#result-intro').textContent = state.mode === 'forecast'
      ? `演示结果：${state.cityIds.length} 城、${answer.dates.length} 天、${state.metricIds.length} 个指标；预报制作日 ${state.madeDate}。全部为合成数据。`
      : `演示结果：${state.cityIds.length} 城、${answer.dates.length} 天、${state.metricIds.length} 个指标${state.baseline ? '，含可用的常年对照' : ''}。全部为合成数据。`;
    renderSummary(); renderChart();
    $('#request-text').value = core.requestText(state, answer.rows.length);
    $('#result-placeholder').classList.add('hidden');
    $('#result-body').classList.remove('hidden');
    $('#results').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function openAi() {
    focusBeforeDialog = document.activeElement;
    $('#ai-panel').classList.remove('hidden');
    $('#ai-backdrop').classList.remove('hidden');
    $('#ai-float').setAttribute('aria-expanded', 'true');
    $('#ai-input').focus();
  }
  function closeAi() {
    $('#ai-panel').classList.add('hidden');
    $('#ai-backdrop').classList.add('hidden');
    $('#ai-float').setAttribute('aria-expanded', 'false');
    focusBeforeDialog?.focus();
  }

  function answerQuestion(text) {
    const parsed = core.parseQuestion(text);
    $('#ai-answer').classList.remove('hidden');
    $('#ai-answer').textContent = parsed.message;
    $('#ai-choices').innerHTML = '';
    if (parsed.kind === 'apply') {
      state = { ...state, mode: parsed.mode, cityIds: parsed.cityIds.slice(0, 3), start: parsed.start, end: parsed.end, metricIds: parsed.metricIds, baseline: parsed.baseline, madeDate: parsed.madeDate || state.madeDate };
      clearResult(); renderAll();
      $('#ai-summary').textContent = `✦ ${parsed.message}`;
    } else if (parsed.kind === 'clarify-high') {
      $('#ai-choices').innerHTML = '<button type="button" data-choice="mean">改看日平均气温相对常年偏离</button><button type="button" data-choice="max">只看最高温，不做常年对比</button>';
      $('#ai-summary').textContent = '✦ 需要澄清：现有常年基线没有最高温常年值。';
    }
  }

  document.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton) setMode(modeButton.dataset.mode);
    const cityButton = event.target.closest('[data-city]');
    if (cityButton) {
      const id = cityButton.dataset.city;
      state.cityIds = state.cityIds.includes(id) ? state.cityIds.filter(item => item !== id)
        : state.cityIds.length < 3 ? [...state.cityIds, id] : state.cityIds;
      clearResult(); renderAll();
      if (state.cityIds.length === 3 && !state.cityIds.includes(id)) $('#ai-summary').textContent = '✦ 演示最多比较三座城市，请先移除一座。';
    }
    const metricButton = event.target.closest('[data-metric]');
    if (metricButton) {
      const id = metricButton.dataset.metric;
      state.metricIds = state.metricIds.includes(id) ? state.metricIds.filter(item => item !== id) : [...state.metricIds, id];
      clearResult(); renderAll();
    }
    const removeCity = event.target.closest('[data-remove-city]');
    if (removeCity) { state.cityIds = state.cityIds.filter(id => id !== removeCity.dataset.removeCity); clearResult(); renderAll(); }
    const removeMetric = event.target.closest('[data-remove-metric]');
    if (removeMetric) { state.metricIds = state.metricIds.filter(id => id !== removeMetric.dataset.removeMetric); clearResult(); renderAll(); }
    const example = event.target.closest('[data-example]');
    if (example) { $('#ai-input').value = examples[example.dataset.example]; answerQuestion($('#ai-input').value); }
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      state = { ...core.initialState(), cityIds: ['wuhan'], metricIds: choice.dataset.choice === 'mean' ? ['tmean'] : ['tmax'], baseline: choice.dataset.choice === 'mean' };
      $('#ai-answer').textContent = choice.dataset.choice === 'mean'
        ? '已改为日平均气温与同日常年基线，可继续选择城市和日期。'
        : '已保留日最高气温并关闭常年对比，不会显示虚构偏离值。';
      $('#ai-choices').innerHTML = '';
      clearResult(); renderAll(); $('#ai-summary').textContent = `✦ ${$('#ai-answer').textContent}`;
    }
  });

  $('#date-start').addEventListener('change', event => { state.start = event.target.value; clearResult(); renderCart(); });
  $('#date-end').addEventListener('change', event => { state.end = event.target.value; clearResult(); renderCart(); });
  $('#made-date').addEventListener('change', event => {
    state.madeDate = event.target.value;
    state.start = core.addDays(state.madeDate, 1);
    state.end = core.addDays(state.madeDate, 7);
    clearResult(); renderAll();
  });
  $('#baseline-toggle').addEventListener('change', event => { state.baseline = event.target.checked; clearResult(); renderCart(); });
  $('#run-query').addEventListener('click', generateResult);
  $('#reset-selection').addEventListener('click', () => {
    state = core.initialState(); clearResult('已重置。确认购物车后生成演示结果。'); renderAll();
    $('#ai-summary').textContent = '✦ 已恢复示例：武汉与成都，2025 年 8 月平均气温和降水，对照常年。';
  });
  $('#chart-metric').addEventListener('change', event => { chartMetricId = event.target.value; renderChart(); });
  $('#copy-request').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#request-text').value); $('#copy-status').textContent = '已复制。真实取数前仍需确认天气专用只读入口。'; }
    catch { $('#copy-status').textContent = '浏览器不允许自动复制，请在文本框中手动选择复制。'; }
  });
  $('#open-ai-top').addEventListener('click', openAi);
  $('#ai-float').addEventListener('click', openAi);
  $('#ai-close').addEventListener('click', closeAi);
  $('#ai-backdrop').addEventListener('click', closeAi);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#ai-panel').classList.contains('hidden')) closeAi(); });
  $('#ai-form').addEventListener('submit', event => { event.preventDefault(); answerQuestion($('#ai-input').value); });

  renderAll();
})();
