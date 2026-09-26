/* Public, synthetic reconstruction of the procurement receipt dashboard. No network requests. */
(() => {
  'use strict';
  const purchases = [
    { id:'P1', no:'DEMO-PO-101', style:'DEMO-S01', material:'演示面料 A', code:'MAT-A', spec:'蓝色 / 150cm', supplier:'示例供应商甲', unit:'米', qty:1000, due:'2026-09-24', approved:'2026-09-16', status:'已审核' },
    { id:'P2', no:'DEMO-PO-102', style:'DEMO-S02', material:'演示里布 B', code:'MAT-B', spec:'白色 / 140cm', supplier:'示例供应商乙', unit:'米', qty:600, due:'2026-09-26', approved:'2026-09-18', status:'已审核' },
    { id:'P3', no:'DEMO-PO-103', style:'DEMO-S03', material:'演示扣件 C', code:'MAT-C', spec:'金属 / 小号', supplier:'示例供应商甲', unit:'个', qty:400, due:'', approved:'2026-09-19', status:'已审核' },
    { id:'P4', no:'DEMO-PO-104', style:'DEMO-S04', material:'演示辅料 D', code:'MAT-D', spec:'成卷', supplier:'示例供应商丙', unit:'米', qty:500, due:'2026-09-28', approved:'2026-09-20', status:'已审核' },
    { id:'P5', no:'DEMO-PO-105', style:'DEMO-S05', material:'演示包装 E', code:'MAT-E', spec:'标准', supplier:'示例供应商乙', unit:'个', qty:200, due:'2026-09-25', approved:'2026-09-15', status:'已审核' },
    { id:'P6', no:'DEMO-PO-106', style:'DEMO-S06', material:'演示拉链 F', code:'MAT-F', spec:'短款', supplier:'示例供应商丙', unit:'个', qty:100, due:'2026-09-27', approved:'2026-09-17', status:'已审核' },
    { id:'P7', no:'DEMO-PO-107', style:'DEMO-S07', material:'演示线材 G', code:'MAT-G', spec:'灰色', supplier:'示例供应商甲', unit:'米', qty:300, due:'2026-09-30', approved:'2026-09-22', status:'草稿' }
  ];
  const receipts = [
    { id:'R1', no:'DEMO-IN-01', po:'DEMO-PO-101', code:'MAT-A', spec:'蓝色 / 150cm', unit:'米', qty:500, date:'2026-09-20', warehouse:'演示库 A', updated:1 },
    { id:'R2', no:'DEMO-IN-02', po:'DEMO-PO-101', code:'MAT-A', spec:'蓝色 / 150cm', unit:'米', qty:220, date:'2026-09-22', warehouse:'演示库 A', updated:1 },
    { id:'R3', no:'DEMO-IN-03', po:'DEMO-PO-101', code:'MAT-A', spec:'蓝色 / 150cm', unit:'米', qty:-20, date:'2026-09-23', warehouse:'演示库 A', updated:1 },
    { id:'R3', no:'DEMO-IN-03', po:'DEMO-PO-101', code:'MAT-A', spec:'蓝色 / 150cm', unit:'米', qty:-20, date:'2026-09-23', warehouse:'演示库 A', updated:2 },
    { id:'R4', no:'DEMO-IN-04', po:'DEMO-PO-103', code:'MAT-C', spec:'金属 / 小号', unit:'个', qty:150, date:'2026-09-24', warehouse:'演示库 B', updated:1 },
    { id:'R5', no:'DEMO-IN-05', po:'DEMO-PO-104', code:'MAT-D', spec:'成卷', unit:'卷', qty:2, date:'2026-09-25', warehouse:'演示库 B', updated:1 },
    { id:'R6', no:'DEMO-IN-06', po:'DEMO-PO-105', code:'MAT-E', spec:'标准', unit:'个', qty:200, date:'2026-09-23', warehouse:'演示库 A', updated:1 },
    { id:'R7', no:'DEMO-IN-07', po:'DEMO-PO-106', code:'MAT-F', spec:'短款', unit:'个', qty:120, date:'2026-09-24', warehouse:'演示库 B', updated:1 }
  ];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fmt = value => Number(value).toLocaleString('zh-CN', {maximumFractionDigits:1});
  const qty = (value, unit) => value == null ? '—' : `${fmt(value)} ${unit}`;
  const unique = [...new Map(receipts.map(item => [item.id, item])).values()];
  const approved = purchases.filter(item => item.status === '已审核');
  const daysBetween = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
  function build(p, businessDate) {
    const same = unique.filter(r => r.po===p.no && r.code===p.code && r.spec===p.spec);
    const matched = same.filter(r => r.unit===p.unit);
    const mismatch = same.some(r => r.unit!==p.unit);
    const comparable = !mismatch && Number.isFinite(p.qty) && p.qty>0 && p.no && p.code && p.spec && p.unit && matched.every(r => Number.isFinite(r.qty));
    const received = comparable ? matched.reduce((sum, r) => sum+r.qty, 0) : null;
    const outstanding = comparable ? Math.max(p.qty-received,0) : null;
    const status = !comparable ? '数据待核对' : received===0 ? '尚未入库' : received<p.qty ? '部分入库' : received===p.qty ? '已到齐' : '超入';
    let dateRisk = '数据待核对';
    if (comparable) {
      if (!p.due && outstanding>0) dateRisk='交期缺失';
      else if (!p.due || outstanding===0) dateRisk='正常';
      else { const delta=daysBetween(p.due,businessDate); dateRisk=delta<0?'已逾期':delta===0?'今天到期':delta<=3?'未来三天':'正常'; }
    }
    return {...p, matched, raw:same, received, outstanding, completion:comparable?received/p.qty*100:null, status, dateRisk, quality:!comparable?(mismatch?'单位待换算':'数量待核对'):'可比较', latest:matched.reduce((last,r)=>r.date>last?r.date:last,'')};
  }
  const riskDefs = [
    ['pending','全部待处理','默认展示'],['overdue','逾期未齐','交期已过且有欠数'],['not_received','尚未入库','净入库为 0'],['partial','部分入库','已入但未齐'],['missing_due_date','交期缺失','无法判断逾期'],['data_check','数据待核对','单位或数量异常']
  ];
  const matchesRisk = (row,risk) => risk==='all' || (risk==='pending' && (['尚未入库','部分入库','数据待核对'].includes(row.status)||['已逾期','交期缺失'].includes(row.dateRisk))) || (risk==='overdue' && row.dateRisk==='已逾期') || (risk==='not_received' && row.status==='尚未入库') || (risk==='partial' && row.status==='部分入库') || (risk==='missing_due_date' && row.dateRisk==='交期缺失') || (risk==='data_check' && row.status==='数据待核对');
  const priority = row => row.dateRisk==='已逾期'?1:row.dateRisk==='交期缺失'?2:row.status==='尚未入库'?3:row.status==='部分入库'?4:row.status==='数据待核对'?5:9;
  let risk='pending';
  let activeRow=null;
  const businessDate = () => $('demo-date').textContent;
  const statusTag = value => `<span class="badge ${/逾期|尚未/.test(value)?'danger':/部分|缺失|待核对|到期|换算/.test(value)?'warn':'good'}">${esc(value)}</span>`;
  function comparison(row) {
    if (row.completion == null) return `<div class="proc-progress"><strong>采购 ${qty(row.qty,row.unit)}</strong><small>原始入库：${row.raw.length?row.raw.map(r=>qty(r.qty,r.unit)).join('、'):'—'}</small><small>${esc(row.quality)}，暂不计算比例</small></div>`;
    const result=row.received>row.qty?`超入 ${qty(row.received-row.qty,row.unit)}`:row.outstanding===0?'已到齐':`还欠 ${qty(row.outstanding,row.unit)}`;
    return `<div class="proc-progress"><header><span><b>已入 ${fmt(row.received)}</b> / 采购 ${qty(row.qty,row.unit)}</span><b>${fmt(row.completion)}%</b></header><i role="progressbar" aria-label="已入库比例" aria-valuenow="${Math.min(row.completion,100)}" aria-valuemin="0" aria-valuemax="100"><b style="width:${Math.min(Math.max(row.completion,0),100)}%"></b></i><footer><span>${row.matched.length} 个批次</span><strong>${result}</strong></footer></div>`;
  }
  function render() {
    const rows=approved.map(p=>build(p,businessDate()));
    $('proc-risk-grid').innerHTML=riskDefs.map(([key,label,hint])=>`<button type="button" class="proc-risk ${risk===key?'active':''}" data-proc-risk="${key}" aria-pressed="${risk===key}"><strong>${rows.filter(row=>matchesRisk(row,key)).length}</strong><span>${label}</span><small>${hint}</small></button>`).join('');
    const units=[...new Set(rows.filter(row=>row.completion!=null).map(row=>row.unit))];
    $('proc-units').innerHTML=units.map(unit=>{const unitRows=rows.filter(row=>row.unit===unit&&row.completion!=null);const ordered=unitRows.reduce((sum,row)=>sum+row.qty,0),received=unitRows.reduce((sum,row)=>sum+row.received,0),outstanding=unitRows.reduce((sum,row)=>sum+row.outstanding,0),rate=received/ordered*100;return `<div class="proc-unit"><header><strong>${esc(unit)}</strong><span>已入 ${fmt(rate)}%</span></header><p><span>采购<b>${fmt(ordered)}</b></span><span>净入<b>${fmt(received)}</b></span><span>未入<b>${fmt(outstanding)}</b></span></p><i><b style="width:${Math.min(rate,100)}%"></b></i></div>`}).join('');
    const status=$('proc-status').value,dateRisk=$('proc-date-risk').value,supplier=$('proc-supplier').value,q=$('proc-search').value.trim().toLowerCase();
    const visible=rows.filter(row=>matchesRisk(row,risk)&&(!status||row.status===status)&&(!dateRisk||row.dateRisk===dateRisk)&&(!supplier||row.supplier===supplier)&&(!q||[row.no,row.style,row.material,row.code,row.spec,row.supplier].join(' ').toLowerCase().includes(q))).sort((a,b)=>priority(a)-priority(b));
    $('proc-count').textContent=`当前显示 ${visible.length} / ${rows.length} 条已审核明细 · 按风险优先排序`;
    $('proc-rows').innerHTML=visible.length?visible.map(row=>`<tr data-proc-row="${esc(row.id)}" tabindex="0" aria-label="查看 ${esc(row.no)} 的入库批次"><td>${statusTag(row.dateRisk)}${statusTag(row.status)}</td><td><strong>${esc(row.due||'—')}</strong><small>${esc(row.dateRisk)}</small></td><td>${esc(row.no)}</td><td>${esc(row.style)}</td><td>${esc(row.supplier)}</td><td><strong>${esc(row.material)}</strong><small>${esc(row.spec)}</small></td><td>${comparison(row)}</td><td>${esc(row.latest||'—')}</td><td>跟单角色</td><td>${statusTag(row.quality)}</td></tr>`).join(''):'<tr><td colspan="10" class="empty">没有符合筛选条件的明细</td></tr>';
    $('proc-quality').textContent=`合成范围校验：采购 ${purchases.length} → 去重 ${purchases.length} 条，其中已审核 ${approved.length} 条，排除其他状态 ${purchases.length-approved.length} 条；入库 ${receipts.length} → 去重 ${unique.length} 条。仅单位与身份键可比较的明细进入数量汇总。`;
    document.querySelectorAll('[data-proc-view]').forEach(button=>button.classList.toggle('active',button.dataset.procView===(risk==='all'?'all':'pending')));
    if(activeRow)openRow(activeRow,false);
  }
  function openRow(id,focus=true) {
    const row=approved.map(p=>build(p,businessDate())).find(item=>item.id===id);
    if(!row)return;
    activeRow=id;
    $('proc-detail').innerHTML=`<div class="drawer-title"><div><h2 id="proc-detail-title">${esc(row.no)}</h2><p>${esc(row.material)} · ${esc(row.spec)}</p></div></div><div class="detail-block">${statusTag(row.status)} ${statusTag(row.dateRisk)} ${statusTag(row.quality)}<div style="margin-top:12px">${comparison(row)}</div></div><section class="detail-block"><h3>采购明细</h3><dl><dt>单据状态</dt><dd>已审核</dd><dt>审核日期</dt><dd>${esc(row.approved)}</dd><dt>款号</dt><dd>${esc(row.style)}</dd><dt>物料 / 规格</dt><dd>${esc(row.code)} · ${esc(row.material)} / ${esc(row.spec)}</dd><dt>供应商</dt><dd>${esc(row.supplier)}</dd><dt>预计入库</dt><dd>${esc(row.due||'—')}（${esc(row.dateRisk)}）</dd><dt>负责人</dt><dd>跟单角色（虚构）</dd></dl></section><section class="detail-block"><h3>有效入库批次</h3>${row.matched.length?row.matched.map(batch=>`<div class="proc-batch"><strong>${esc(batch.no)}</strong><span>${esc(batch.date)} · ${esc(batch.warehouse)}</span><b>${qty(batch.qty,batch.unit)}</b></div>`).join(''):'<p>暂未发现可精确关联的入库批次。</p>'}${row.quality==='单位待换算'?`<p class="drawer-note">另有 ${row.raw.filter(batch=>batch.unit!==row.unit).length} 条单位不一致的入库明细；不纳入有效批次，不推算完成率。</p>`:''}</section><section class="detail-block"><h3>关联与数量口径</h3><p>关联键：采购单号 + 物料编码 + 规格 + 单位；入库明细按记录 ID 去重。负数退货 / 红冲从净入库扣减。</p><p>全部单据和批次均为虚构，仅用于说明正式看板交互。</p></section>`;
    $('proc-backdrop').classList.remove('hidden');$('proc-drawer').classList.remove('hidden');if(focus)$('proc-close').focus();
  }
  function closeRow(){activeRow=null;$('proc-backdrop').classList.add('hidden');$('proc-drawer').classList.add('hidden');}
  function resetFilters(){risk='pending';['proc-status','proc-date-risk','proc-supplier','proc-search'].forEach(id=>$(id).value='');render();}
  $('proc-supplier').innerHTML+=[...new Set(approved.map(item=>item.supplier))].sort().map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  document.addEventListener('click',event=>{const riskButton=event.target.closest('[data-proc-risk]');if(riskButton){risk=riskButton.dataset.procRisk;render();return}const viewButton=event.target.closest('[data-proc-view]');if(viewButton){risk=viewButton.dataset.procView;render();return}const row=event.target.closest('[data-proc-row]');if(row){openRow(row.dataset.procRow)}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeRow)closeRow();if(event.key==='Enter'&&event.target.matches('tr[data-proc-row]'))openRow(event.target.dataset.procRow)});
  ['proc-status','proc-date-risk','proc-supplier'].forEach(id=>$(id).addEventListener('change',render));
  $('proc-search').addEventListener('input',render);$('proc-reset').addEventListener('click',resetFilters);$('proc-close').addEventListener('click',closeRow);$('proc-backdrop').addEventListener('click',closeRow);
  $('proc-snapshot-info').addEventListener('click',()=>window.alert('公开演示仅使用内置合成快照，不会连接正式数仓。正式模块读取数仓动态快照，按采购单、物料、规格和单位关联入库；同步失败时保留上次成功快照。'));
  $('advance-day').addEventListener('click',render);$('reset-demo').addEventListener('click',()=>{closeRow();resetFilters()});
  render();
})();
