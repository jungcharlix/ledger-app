// pages-invoice-analytics.jsx — 電子發票分析儀表板

const { useState: useStateAn, useMemo: useMemoAn } = React;

function InvoiceAnalytics({ ledger }) {
  const { state } = ledger;
  const [scope, setScope] = useStateAn('30d'); // 30d | 90d | all

  // 篩選範圍
  const now = new Date();
  const cutoff = new Date(now);
  if (scope === '30d') cutoff.setDate(cutoff.getDate() - 30);
  else if (scope === '90d') cutoff.setDate(cutoff.getDate() - 90);
  else cutoff.setFullYear(cutoff.getFullYear() - 10);
  const cutoffStr = ymd(cutoff);

  // 只取發票交易
  const invoices = state.transactions.filter((t) => t.invoice && t.date >= cutoffStr);

  if (invoices.length === 0) {
    return (
      <div className="card empty" style={{ marginBottom: 16 }}>
        <div className="empty-glyph">◍</div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 4 }}>還沒有發票資料可分析</div>
        <div className="muted" style={{ fontSize: 12 }}>請先從上方匯入發票或連結載具</div>
      </div>
    );
  }

  // ─── KPI ───
  const totalAmount = invoices.reduce((s, t) => s + t.amount, 0);
  const totalItems = invoices.reduce((s, t) => s + (t.itemCount || 0), 0);
  const avgTicket = totalAmount / invoices.length;
  const maxTicket = Math.max(...invoices.map((t) => t.amount));
  const maxTicketTxn = invoices.find((t) => t.amount === maxTicket);

  // 整體支出 vs 發票追蹤
  const allExpenses = state.transactions
    .filter((t) => t.type === 'expense' && t.date >= cutoffStr && t.currency === 'TWD')
    .reduce((s, t) => s + t.amount, 0);
  const trackedPct = allExpenses > 0 ? (totalAmount / allExpenses) * 100 : 0;

  // ─── 商家排行 ───
  const merchantMap = {};
  invoices.forEach((t) => {
    const m = t.merchant || t.note;
    if (!merchantMap[m]) merchantMap[m] = { name: m, count: 0, amount: 0, category: t.category };
    merchantMap[m].count++;
    merchantMap[m].amount += t.amount;
  });
  const topMerchants = Object.values(merchantMap).sort((a, b) => b.amount - a.amount);
  const maxMerchantAmt = Math.max(...topMerchants.map((m) => m.amount), 1);

  // ─── 品項分析 ───
  const itemMap = {};
  invoices.forEach((t) => {
    (t.items || []).forEach((item) => {
      const key = normalizeItem(item.name);
      if (!itemMap[key]) itemMap[key] = { name: key, count: 0, qty: 0, amount: 0, originals: new Set() };
      itemMap[key].count++;
      itemMap[key].qty += item.qty || 1;
      itemMap[key].amount += (item.price || 0) * (item.qty || 1);
      itemMap[key].originals.add(item.name);
    });
  });
  const topItems = Object.values(itemMap)
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);

  // ─── 時段（早/午/晚/夜）───
  const timeBuckets = [
    { id: 'morning', label: '早晨', en: '06-11', range: [6, 11], color: '#E2BC97', amount: 0, count: 0 },
    { id: 'lunch', label: '中午', en: '11-14', range: [11, 14], color: '#C66D4A', amount: 0, count: 0 },
    { id: 'afternoon', label: '下午', en: '14-18', range: [14, 18], color: '#B8895E', amount: 0, count: 0 },
    { id: 'evening', label: '傍晚', en: '18-22', range: [18, 22], color: '#7A6B8B', amount: 0, count: 0 },
    { id: 'night', label: '深夜', en: '22-06', range: [22, 30], color: '#3F4F5E', amount: 0, count: 0 },
  ];
  invoices.forEach((t) => {
    if (!t.time) return;
    const hr = parseInt(t.time.split(':')[0], 10);
    const bucket = timeBuckets.find((b) => {
      if (b.id === 'night') return hr >= 22 || hr < 6;
      return hr >= b.range[0] && hr < b.range[1];
    });
    if (bucket) { bucket.amount += t.amount; bucket.count++; }
  });
  const maxBucketAmt = Math.max(...timeBuckets.map((b) => b.amount), 1);

  // ─── 星期 ───
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekData = weekdays.map((label, i) => ({ label, amount: 0, count: 0 }));
  invoices.forEach((t) => {
    const dow = new Date(t.date).getDay();
    weekData[dow].amount += t.amount;
    weekData[dow].count++;
  });
  const maxWeekAmt = Math.max(...weekData.map((d) => d.amount), 1);

  // ─── 分類圓餅 ───
  const catMap = {};
  invoices.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catData = Object.entries(catMap).map(([id, value]) => {
    const c = findCategory(id, 'expense');
    return { id, value, color: c.color, label: c.label };
  }).sort((a, b) => b.value - a.value);

  // ─── 近 30 日趨勢 ───
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return ymd(d);
  });
  const dailyAmts = days.map((d) => invoices.filter((t) => t.date === d).reduce((s, t) => s + t.amount, 0));
  const trendSeries = [{
    label: '每日', color: 'var(--accent)',
    points: days.map((d, i) => ({ x: i, y: dailyAmts[i], label: i % 5 === 0 ? d.slice(5) : '' })),
  }];

  // ─── Insights ───
  const insights = generateInsights({
    invoices, topMerchants, topItems, timeBuckets, weekData, avgTicket, totalAmount, trackedPct,
  });

  return (
    <div>
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <KPICard label="匯入發票" en="Invoices" value={invoices.length} unit="張" sub={totalItems + ' 個品項'} accent="var(--accent)" />
        <KPICard label="累計金額" en="Total" value={fmtMoney(totalAmount, 'TWD', { sign: false })} sub={`覆蓋 ${Math.round(trackedPct)}% 總支出`} accent="var(--ink)" />
        <KPICard label="平均單筆" en="Avg Ticket" value={fmtMoney(avgTicket, 'TWD', { sign: false })} sub={`每張 ${(totalItems / invoices.length).toFixed(1)} 項`} accent="var(--positive)" />
        <KPICard label="最大單筆" en="Largest" value={fmtMoney(maxTicket, 'TWD', { sign: false })} sub={maxTicketTxn?.merchant || '—'} accent="var(--warn)" />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--accent-soft) 200%)' }}>
          <div className="card-head">
            <div>
              <h3 className="card-title">智慧洞察</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>AI Insights · 從你的發票紀錄整理</div>
            </div>
            <span className="font-mono dim" style={{ fontSize: 11 }}>{scope === '30d' ? '近 30 日' : scope === '90d' ? '近 90 日' : '全部'}</span>
          </div>
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: ins.color, color: 'white', fontFamily: 'var(--serif)',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{ins.glyph}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{ins.title}</div>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{ins.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 範圍切換 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="page-eyebrow">Reports · 分析報表</div>
        <div className="seg">
          <button className={'seg-btn ' + (scope === '30d' ? 'active' : '')} onClick={() => setScope('30d')}>30 日</button>
          <button className={'seg-btn ' + (scope === '90d' ? 'active' : '')} onClick={() => setScope('90d')}>90 日</button>
          <button className={'seg-btn ' + (scope === 'all' ? 'active' : '')} onClick={() => setScope('all')}>全部</button>
        </div>
      </div>

      {/* 近 30 日趨勢 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">每日發票金額</h3>
            <div className="card-sub" style={{ marginTop: 4 }}>Daily Trend</div>
          </div>
          <span className="font-mono dim" style={{ fontSize: 12 }}>NT$</span>
        </div>
        <div style={{ padding: '18px 22px 22px' }}>
          <LineChart series={trendSeries} height={180} />
        </div>
      </div>

      {/* 商家排行 + 分類圓餅 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">商家消費排行</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>Top Merchants</div>
            </div>
            <span className="muted" style={{ fontSize: 11.5 }}>{topMerchants.length} 家</span>
          </div>
          <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topMerchants.slice(0, 8).map((m, i) => {
              const cat = findCategory(m.category, 'expense');
              return (
                <div key={m.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        background: cat.color, color: 'white', fontFamily: 'var(--serif)',
                        fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{cat.icon}</span>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <span className="muted font-mono" style={{ fontSize: 11 }}>×{m.count}</span>
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>{fmtMoney(m.amount, 'TWD', { sign: false })}</span>
                  </div>
                  <div className="bar">
                    <div className="bar-fill" style={{ width: ((m.amount / maxMerchantAmt) * 100) + '%', background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3 className="card-title">分類占比</h3><span className="card-sub">By Category</span></div>
          <div style={{ padding: 22, position: 'relative' }}>
            <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
              <DonutChart data={catData} size={200} thickness={26} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="muted" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500 }}>{fmtMoney(totalAmount, 'TWD', { sign: false })}</div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {catData.slice(0, 5).map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                  <span style={{ flex: 1 }}>{d.label}</span>
                  <span className="font-mono dim">{Math.round((d.value / totalAmount) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 時段 + 星期 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">消費時段</h3><div className="card-sub" style={{ marginTop: 4 }}>By Hour</div></div>
          </div>
          <div style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160, marginBottom: 12 }}>
              {timeBuckets.map((b) => {
                const h = (b.amount / maxBucketAmt) * 130;
                return (
                  <div key={b.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      {b.amount > 0 ? Math.round(b.amount).toLocaleString() : ''}
                    </div>
                    <div style={{
                      width: '100%', height: h || 2, background: b.color,
                      borderRadius: '4px 4px 0 0',
                      opacity: b.amount === 0 ? 0.15 : 1,
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {timeBuckets.map((b) => (
                <div key={b.id} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{b.label}</div>
                  <div className="muted" style={{ fontSize: 10, fontFamily: 'var(--mono)' }}>{b.en}</div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{b.count} 張</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">星期分佈</h3><div className="card-sub" style={{ marginTop: 4 }}>By Weekday</div></div>
          </div>
          <div style={{ padding: 22 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, marginBottom: 12 }}>
              {weekData.map((d, i) => {
                const h = (d.amount / maxWeekAmt) * 130;
                const isWeekend = i === 0 || i === 6;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      {d.amount > 0 ? Math.round(d.amount).toLocaleString() : ''}
                    </div>
                    <div style={{
                      width: '100%', height: h || 2,
                      background: isWeekend ? 'var(--accent)' : 'var(--ink-3)',
                      borderRadius: '4px 4px 0 0',
                      opacity: d.amount === 0 ? 0.15 : 1,
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {weekData.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: (i === 0 || i === 6) ? 'var(--accent)' : 'var(--ink-2)' }}>{d.label}</div>
                  <div className="muted" style={{ fontSize: 10 }}>{d.count} 張</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 品項排行 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">買最多的品項</h3>
            <div className="card-sub" style={{ marginTop: 4 }}>Top Items · 從發票品項分析</div>
          </div>
          <span className="muted" style={{ fontSize: 11.5 }}>共 {Object.keys(itemMap).length} 種品項</span>
        </div>
        <div style={{ padding: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0 }}>
            {topItems.map((item, i) => {
              const maxAmt = topItems[0].amount;
              return (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', borderRight: i % 2 === 0 ? '1px solid var(--line-soft)' : 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: i < 3 ? 'var(--accent)' : 'var(--bg-sunk)',
                    color: i < 3 ? 'white' : 'var(--ink-3)',
                    fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>
                      購買 {item.count} 次 · 共 {item.qty} 件
                    </div>
                    <div className="bar" style={{ marginTop: 5, height: 3 }}>
                      <div className="bar-fill" style={{ width: ((item.amount / maxAmt) * 100) + '%', background: 'var(--accent)' }} />
                    </div>
                  </div>
                  <div className="font-mono" style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {fmtMoney(item.amount, 'TWD', { sign: false })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 商家對統一編號 */}
      <div className="card">
        <div className="card-head">
          <div><h3 className="card-title">商家統計表</h3><div className="card-sub" style={{ marginTop: 4 }}>Merchant Table</div></div>
        </div>
        <div style={{ padding: '6px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', padding: '8px 22px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            <span>商家</span>
            <span style={{ textAlign: 'right' }}>次數</span>
            <span style={{ textAlign: 'right' }}>總金額</span>
            <span style={{ textAlign: 'right' }}>平均</span>
            <span style={{ textAlign: 'right' }}>占比</span>
          </div>
          {topMerchants.map((m) => {
            const cat = findCategory(m.category, 'expense');
            return (
              <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', padding: '10px 22px', borderBottom: '1px solid var(--line-soft)', fontSize: 13, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: cat.color,
                  }} />
                  {m.name}
                </span>
                <span className="font-mono" style={{ textAlign: 'right' }}>{m.count}</span>
                <span className="font-mono" style={{ textAlign: 'right', fontWeight: 500 }}>{fmtMoney(m.amount, 'TWD', { sign: false })}</span>
                <span className="font-mono dim" style={{ textAlign: 'right' }}>{fmtMoney(m.amount / m.count, 'TWD', { sign: false })}</span>
                <span className="font-mono dim" style={{ textAlign: 'right' }}>{((m.amount / totalAmount) * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── KPI 卡 ─────────────────────────────────────────────────────────
function KPICard({ label, en, value, unit, sub, accent }) {
  return (
    <div className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: accent }} />
      <div className="page-eyebrow" style={{ marginBottom: 6 }}>{label} · {en}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>
        {value}{unit && <span style={{ fontSize: 14, color: 'var(--ink-4)', marginLeft: 4, fontFamily: 'var(--sans)' }}>{unit}</span>}
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

// ── 品項名稱正規化（去除規格、店別）──
function normalizeItem(name) {
  return name
    .replace(/\s*\d+(\.\d+)?(ml|公升|L|入|顆|杯|大|中|小|×\d+)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── 智慧洞察 ──
function generateInsights({ invoices, topMerchants, topItems, timeBuckets, weekData, avgTicket, totalAmount, trackedPct }) {
  const insights = [];

  if (topMerchants.length > 0) {
    const top = topMerchants[0];
    insights.push({
      glyph: '★', color: '#C66D4A',
      title: `最常光顧：${top.name}`,
      text: `共消費 ${top.count} 次、累計 ${fmtMoney(top.amount, 'TWD', { sign: false })}，平均每次 ${fmtMoney(top.amount / top.count, 'TWD', { sign: false })}。`,
    });
  }

  // 時段分析
  const topBucket = [...timeBuckets].sort((a, b) => b.amount - a.amount)[0];
  if (topBucket && topBucket.amount > 0) {
    const pct = Math.round((topBucket.amount / totalAmount) * 100);
    insights.push({
      glyph: '◐', color: topBucket.color,
      title: `「${topBucket.label}」是你最捨得花錢的時段`,
      text: `${topBucket.en} 時段佔總支出 ${pct}%、共 ${topBucket.count} 筆，平均每筆 ${fmtMoney(topBucket.amount / Math.max(topBucket.count, 1), 'TWD', { sign: false })}。`,
    });
  }

  // 週末 vs 平日
  const weekendAmt = weekData[0].amount + weekData[6].amount;
  const weekdayAmt = weekData.slice(1, 6).reduce((s, d) => s + d.amount, 0);
  const weekendDaily = weekendAmt / 2;
  const weekdayDaily = weekdayAmt / 5;
  if (weekendDaily > weekdayDaily * 1.3 && weekendAmt > 0) {
    insights.push({
      glyph: '◆', color: '#7A6B8B',
      title: '週末花費比平日高出明顯',
      text: `週末平均每日 ${fmtMoney(weekendDaily, 'TWD', { sign: false })}，比平日 (${fmtMoney(weekdayDaily, 'TWD', { sign: false })}) 多 ${Math.round((weekendDaily / Math.max(weekdayDaily, 1) - 1) * 100)}%。`,
    });
  } else if (weekdayDaily > weekendDaily * 1.3 && weekdayAmt > 0) {
    insights.push({
      glyph: '▢', color: '#5E8B7A',
      title: '你是平日消費型',
      text: `平日平均每日 ${fmtMoney(weekdayDaily, 'TWD', { sign: false })}，遠高於週末 (${fmtMoney(weekendDaily, 'TWD', { sign: false })})。`,
    });
  }

  // 品項
  if (topItems.length > 0) {
    const item = topItems[0];
    insights.push({
      glyph: '◈', color: '#5E8B6E',
      title: `最常買：${item.name}`,
      text: `已購買 ${item.count} 次、共 ${item.qty} 件，累計花費 ${fmtMoney(item.amount, 'TWD', { sign: false })}。`,
    });
  }

  // 平均單筆
  insights.push({
    glyph: '◉', color: '#8B6F47',
    title: `平均每張發票 ${fmtMoney(avgTicket, 'TWD', { sign: false })}`,
    text: `共 ${invoices.length} 張發票，發票覆蓋你 ${Math.round(trackedPct)}% 的本期支出。${trackedPct < 50 ? '建議多用載具歸戶提升追蹤率。' : '追蹤率良好，繼續保持。'}`,
  });

  // 連續消費
  const dateSet = new Set(invoices.map((t) => t.date));
  let maxStreak = 0, curStreak = 0;
  const sortedDates = [...dateSet].sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) { curStreak = 1; }
    else {
      const prev = new Date(sortedDates[i - 1]);
      const cur = new Date(sortedDates[i]);
      if ((cur - prev) / 86400000 === 1) curStreak++;
      else curStreak = 1;
    }
    maxStreak = Math.max(maxStreak, curStreak);
  }
  if (maxStreak >= 3) {
    insights.push({
      glyph: '↻', color: '#A87C2C',
      title: `最長連續消費 ${maxStreak} 天`,
      text: `你最長有 ${maxStreak} 天連續產生發票紀錄，記帳習慣很穩定。`,
    });
  }

  return insights.slice(0, 6);
}

Object.assign(window, { InvoiceAnalytics });
