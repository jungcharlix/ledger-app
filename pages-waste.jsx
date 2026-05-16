// pages-waste.jsx — 浪費與檢討專區

const { useState: useStateW, useMemo: useMemoW } = React;

const WASTE_REASONS = [
  { id: 'impulse', label: '衝動購物', en: 'Impulse', icon: '⚡', color: '#B85C38' },
  { id: 'unused', label: '買了沒用', en: 'Unused', icon: '◌', color: '#8B6F47' },
  { id: 'duplicate', label: '重複購買', en: 'Duplicate', icon: '⇆', color: '#A35E7A' },
  { id: 'overpay', label: '價格過高', en: 'Overpriced', icon: '↑', color: '#7A6B8B' },
  { id: 'subscription', label: '忘記取消', en: 'Forgotten Sub', icon: '↻', color: '#A87C2C' },
  { id: 'fastfood', label: '亂吃外食', en: 'Junk Food', icon: '◐', color: '#C66D4A' },
  { id: 'other', label: '其他遺憾', en: 'Other', icon: '○', color: '#756547' },
];

function WastePage({ ledger }) {
  const { state } = ledger;
  const [scope, setScope] = useStateW('month'); // month | 90d | all
  const [marking, setMarking] = useStateW(null); // txn 物件，用於選擇浪費原因

  const now = new Date();
  const cutoff = new Date(now);
  if (scope === 'month') cutoff.setDate(1);
  else if (scope === '90d') cutoff.setDate(cutoff.getDate() - 90);
  else cutoff.setFullYear(cutoff.getFullYear() - 10);
  const cutoffStr = ymd(cutoff);

  const allExpensesInScope = state.transactions.filter(
    (t) => t.type === 'expense' && t.date >= cutoffStr
  );
  const wasted = allExpensesInScope.filter((t) => t.waste);
  const nonWaste = allExpensesInScope.filter((t) => !t.waste);

  const wastedTotal = wasted.reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const allTotal = allExpensesInScope.reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const wastePct = allTotal > 0 ? (wastedTotal / allTotal) * 100 : 0;

  // 原因分析
  const reasonMap = {};
  wasted.forEach((t) => {
    const r = t.wasteReason || 'other';
    if (!reasonMap[r]) reasonMap[r] = { count: 0, amount: 0 };
    reasonMap[r].count++;
    reasonMap[r].amount += convertTo(t.amount, t.currency, 'TWD', state.fxRate);
  });
  const reasonList = WASTE_REASONS.map((r) => ({
    ...r, count: reasonMap[r.id]?.count || 0, amount: reasonMap[r.id]?.amount || 0,
  })).sort((a, b) => b.amount - a.amount);

  // 分類分析
  const catMap = {};
  wasted.forEach((t) => {
    const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    if (!catMap[t.category]) catMap[t.category] = { count: 0, amount: 0 };
    catMap[t.category].count++;
    catMap[t.category].amount += v;
  });
  const catReasonList = Object.entries(catMap).map(([id, v]) => ({
    ...findCategory(id, 'expense'), ...v,
  })).sort((a, b) => b.amount - a.amount);

  // 重複商家偵測
  const merchantMap = {};
  wasted.forEach((t) => {
    const m = t.merchant || t.note || t.category;
    if (!merchantMap[m]) merchantMap[m] = { count: 0, amount: 0, last: t.date };
    merchantMap[m].count++;
    merchantMap[m].amount += convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    if (t.date > merchantMap[m].last) merchantMap[m].last = t.date;
  });
  const repeatOffenders = Object.entries(merchantMap)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // 計算可以「省下」的等價物
  const equivalents = computeEquivalents(wastedTotal);

  // 大型支出（候選浪費名單）
  const sortedAll = [...nonWaste].sort((a, b) =>
    convertTo(b.amount, b.currency, 'TWD', state.fxRate) - convertTo(a.amount, a.currency, 'TWD', state.fxRate)
  );
  const candidates = sortedAll.slice(0, 6);

  // 反省訊息
  const reflection = generateReflection({ wasted, wastedTotal, wastePct, reasonList, catReasonList, repeatOffenders, scope });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Waste & Review · 浪費與檢討</div>
          <h1 className="page-title">後悔花的錢</h1>
          <div className="page-subtitle">標記讓你後悔的支出 · 從中找出可以改善的習慣</div>
        </div>
        <div className="seg">
          <button className={'seg-btn ' + (scope === 'month' ? 'active' : '')} onClick={() => setScope('month')}>本月</button>
          <button className={'seg-btn ' + (scope === '90d' ? 'active' : '')} onClick={() => setScope('90d')}>90 日</button>
          <button className={'seg-btn ' + (scope === 'all' ? 'active' : '')} onClick={() => setScope('all')}>全部</button>
        </div>
      </div>

      {/* Hero */}
      <div className="card" style={{
        marginBottom: 16, position: 'relative', overflow: 'hidden',
        background: wasted.length === 0
          ? 'linear-gradient(135deg, var(--positive-soft) 0%, var(--bg-card) 100%)'
          : 'linear-gradient(135deg, #3D2A20 0%, #1A1612 100%)',
        color: wasted.length === 0 ? 'var(--ink)' : '#F0E8D6',
      }}>
        {wasted.length > 0 && (
          <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(216,124,88,0.35) 0%, transparent 65%)' }} />
        )}
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 8, fontWeight: 600 }}>
              {scope === 'month' ? '本月浪費' : scope === '90d' ? '近 90 日浪費' : '累計浪費'}
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {fmtMoney(wastedTotal, 'TWD', { sign: false })}
            </div>
            <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13, lineHeight: 1.6, maxWidth: 480 }}>
              {wasted.length === 0
                ? '✓ 還沒有標記任何浪費的支出。你可以從下方候選清單或交易頁面標記讓你後悔的消費。'
                : `${wasted.length} 筆被標記的支出 · 佔本期總支出 ${wastePct.toFixed(1)}%`}
            </div>
          </div>
          {wasted.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55, fontWeight: 600 }}>
                如果省下來可以…
              </div>
              {equivalents.map((eq, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.92 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: '#D87C58' }}>{eq.glyph}</span>
                  <span style={{ fontSize: 14 }}>{eq.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 反省 */}
      {reflection && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
          <div className="page-eyebrow" style={{ marginBottom: 8 }}>Reflection · 反省筆記</div>
          <div className="font-serif" style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            {reflection}
          </div>
        </div>
      )}

      {/* 原因分析 + 分類分析 */}
      {wasted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="card">
            <div className="card-head"><h3 className="card-title">後悔原因</h3><span className="card-sub">Why Wasted</span></div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reasonList.filter((r) => r.count > 0).map((r) => (
                <div key={r.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 7, background: r.color,
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontSize: 13,
                    }}>{r.icon}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{r.label}</span>
                    <span className="muted font-mono" style={{ fontSize: 11.5 }}>×{r.count}</span>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{fmtMoney(r.amount, 'TWD', { sign: false })}</span>
                  </div>
                  <div className="bar"><div className="bar-fill" style={{ width: ((r.amount / wastedTotal) * 100) + '%', background: r.color }} /></div>
                </div>
              ))}
              {reasonList.filter((r) => r.count > 0).length === 0 && (
                <div className="muted" style={{ textAlign: 'center', padding: 20 }}>標記時可選擇後悔原因</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3 className="card-title">浪費分類</h3><span className="card-sub">By Category</span></div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {catReasonList.slice(0, 6).map((c) => (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 7, background: c.color,
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontSize: 13,
                    }}>{c.icon}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{c.label}</span>
                    <span className="muted font-mono" style={{ fontSize: 11.5 }}>×{c.count}</span>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{fmtMoney(c.amount, 'TWD', { sign: false })}</span>
                  </div>
                  <div className="bar"><div className="bar-fill" style={{ width: ((c.amount / wastedTotal) * 100) + '%', background: c.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 重複商家警報 */}
      {repeatOffenders.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div><h3 className="card-title">⚠ 重複後悔的商家</h3><div className="card-sub" style={{ marginTop: 4 }}>Repeat Offenders · 在此消費後悔超過一次</div></div>
          </div>
          <div style={{ padding: '6px 0' }}>
            {repeatOffenders.slice(0, 6).map((m) => (
              <div key={m.name} className="txn-row" style={{ gridTemplateColumns: '32px 1fr auto auto' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6, background: 'var(--negative-soft)',
                  color: 'var(--negative)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 500,
                }}>{m.count}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>最近一次 {m.last} · 後悔 {m.count} 次</div>
                </div>
                <div className="font-mono" style={{ fontSize: 13.5, fontWeight: 500 }}>{fmtMoney(m.amount, 'TWD', { sign: false })}</div>
                <span className="chip" style={{ background: 'var(--negative-soft)', color: 'var(--negative)', borderColor: 'transparent' }}>
                  下次三思 ✋
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已標記浪費清單 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div><h3 className="card-title">浪費清單</h3><div className="card-sub" style={{ marginTop: 4 }}>Marked as Wasted · 共 {wasted.length} 筆</div></div>
        </div>
        {wasted.length === 0 ? (
          <div className="empty">
            <div className="empty-glyph">○</div>
            <div>還沒有標記任何浪費的支出</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>從下方候選清單或交易頁面標記</div>
          </div>
        ) : wasted.slice(0, 20).map((t) => {
          const cat = findCategory(t.category, 'expense');
          const reason = WASTE_REASONS.find((r) => r.id === t.wasteReason) || WASTE_REASONS[6];
          return (
            <div key={t.id} className="txn-row" style={{ gridTemplateColumns: '36px 1fr auto auto auto' }}>
              <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
              <div className="txn-main">
                <div className="txn-note">{t.note || cat.label}</div>
                <div className="txn-meta">
                  <span>{t.date}</span>
                  <span className="divider-dot">·</span>
                  <span>{cat.label}</span>
                  <span className="divider-dot">·</span>
                  <span style={{ color: reason.color, fontWeight: 500 }}>{reason.icon} {reason.label}</span>
                </div>
              </div>
              <div className="txn-amount" style={{ color: 'var(--negative)' }}>−{fmtMoney(t.amount, t.currency, { sign: false })}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setMarking(t)}>原因</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { ledger.unmarkWaste(t.id); showToast('已取消標記'); }}>取消</button>
            </div>
          );
        })}
      </div>

      {/* 候選清單 */}
      {candidates.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">候選清單</h3><div className="card-sub" style={{ marginTop: 4 }}>Largest Expenses · 點旗子標記為浪費</div></div>
          </div>
          {candidates.map((t) => {
            const cat = findCategory(t.category, 'expense');
            return (
              <div key={t.id} className="txn-row" style={{ gridTemplateColumns: '36px 1fr auto auto' }}>
                <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
                <div className="txn-main">
                  <div className="txn-note">{t.note || cat.label}</div>
                  <div className="txn-meta">
                    <span>{t.date}</span>
                    <span className="divider-dot">·</span>
                    <span>{cat.label}</span>
                    {t.merchant && <><span className="divider-dot">·</span><span>{t.merchant}</span></>}
                  </div>
                </div>
                <div className="txn-amount negative">−{fmtMoney(t.amount, t.currency, { sign: false })}</div>
                <button className="btn btn-sm" onClick={() => setMarking(t)} style={{ color: 'var(--negative)', borderColor: 'var(--negative-soft)' }}>
                  ⚑ 標記
                </button>
              </div>
            );
          })}
        </div>
      )}

      {marking && (
        <WasteMarkModal
          txn={marking}
          ledger={ledger}
          onClose={() => setMarking(null)}
        />
      )}
    </div>
  );
}

// ── 標記 modal ──
function WasteMarkModal({ txn, ledger, onClose }) {
  const [reason, setReason] = useStateW(txn.wasteReason || 'impulse');
  const cat = findCategory(txn.category, 'expense');
  const save = () => {
    ledger.markWaste(txn.id, reason);
    showToast('已標記為浪費');
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="page-eyebrow">Mark as Waste · 標記原因</div>
          <h2 className="font-serif" style={{ fontSize: 22, margin: '6px 0 4px', fontWeight: 500 }}>為什麼後悔？</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{txn.note || cat.label}</div>
              <div className="muted" style={{ fontSize: 11.5 }}>{txn.date} · {cat.label}</div>
            </div>
            <div className="font-mono" style={{ fontWeight: 500 }}>−{fmtMoney(txn.amount, txn.currency, { sign: false })}</div>
          </div>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {WASTE_REASONS.map((r) => (
              <button key={r.id} className="btn" onClick={() => setReason(r.id)} style={{
                padding: '12px 12px', justifyContent: 'flex-start', gap: 10,
                borderColor: reason === r.id ? r.color : 'var(--line)',
                borderWidth: reason === r.id ? 2 : 1,
                background: reason === r.id ? r.color + '18' : 'var(--bg-card)',
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 7, background: r.color,
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 13,
                }}>{r.icon}</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                  <div className="muted" style={{ fontSize: 10.5 }}>{r.en}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save} style={{ background: 'var(--negative)', borderColor: 'var(--negative)' }}>⚑ 標記為浪費</button>
        </div>
      </div>
    </div>
  );
}

// ── 等價物換算（如果省下來可以買什麼）──
function computeEquivalents(amount) {
  if (amount <= 0) return [];
  const candidates = [
    { unit: 130, glyph: '☕', label: '杯星巴克美式咖啡' },
    { unit: 280, glyph: '◐', label: '張電影票' },
    { unit: 89, glyph: '◆', label: '本書' },
    { unit: 1500, glyph: '↗', label: '次台北–台中高鐵' },
    { unit: 8000, glyph: '⌘', label: '副 AirPods Pro' },
    { unit: 35000, glyph: '✈', label: '張東京來回機票' },
  ].sort(() => Math.random() - 0.5);

  const results = [];
  for (const c of candidates) {
    const n = Math.floor(amount / c.unit);
    if (n >= 1) {
      results.push({ glyph: c.glyph, text: `${n.toLocaleString()} ${c.label}` });
      if (results.length >= 3) break;
    }
  }
  if (results.length === 0) {
    results.push({ glyph: '◇', text: '雖然不多，但都是浪費' });
  }
  return results;
}

// ── 反省訊息生成 ──
function generateReflection({ wasted, wastedTotal, wastePct, reasonList, catReasonList, repeatOffenders, scope }) {
  if (wasted.length === 0) return null;
  const periodTxt = scope === 'month' ? '這個月' : scope === '90d' ? '近 90 天' : '到目前為止';

  const topReason = reasonList.filter((r) => r.count > 0)[0];
  const topCat = catReasonList[0];

  const parts = [`${periodTxt}你標記了 ${wasted.length} 筆後悔的支出，總共「${fmtMoney(wastedTotal, 'TWD', { sign: false })}」`];

  if (wastePct > 0) {
    parts.push(`，佔了總支出 ${wastePct.toFixed(1)}%`);
  }
  parts.push('。');

  if (topReason) {
    parts.push(`其中最常出現的是「${topReason.label}」(${topReason.count} 次)`);
  }
  if (topCat) {
    parts.push(`，集中在「${topCat.label}」分類`);
  }
  parts.push('。');

  if (repeatOffenders.length > 0) {
    parts.push(`留意：你在「${repeatOffenders[0].name}」已經後悔了 ${repeatOffenders[0].count} 次，下次經過時記得停下來想想。`);
  } else if (wastePct < 5) {
    parts.push('整體浪費比例不高，繼續保持。');
  } else if (wastePct > 20) {
    parts.push('浪費比例偏高，建議重新審視這個分類的消費模式。');
  } else {
    parts.push('意識到這些是進步的第一步。');
  }

  return parts.join('');
}

Object.assign(window, { WastePage, WASTE_REASONS, WasteMarkModal });
