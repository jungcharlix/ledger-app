// pages-accounts-reports.jsx — accounts mgmt, account detail, reports, budgets

const { useState: useStateA } = React;

// ── ACCOUNTS LIST / MANAGE ────────────────────────────────────────────
function AccountsPage({ ledger, onNav }) {
  const { state } = ledger;
  const [editing, setEditing] = useStateA(null); // account id or 'new'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Accounts · 帳戶</div>
          <h1 className="page-title">我的帳戶</h1>
          <div className="page-subtitle">管理你的台灣、美國與其他帳戶 · 跨幣別追蹤</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>＋ 新增帳戶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {state.accounts.map((a) => {
          const bal = accountBalance(a, state.transactions, state.fxRate);
          const txnCount = state.transactions.filter((t) => t.account === a.id).length;
          const altCur = a.currency === 'TWD' ? 'USD' : 'TWD';
          return (
            <div key={a.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onNav('account:' + a.id)}>
              <div style={{ background: a.color, height: 80, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 22px', color: 'white' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 36, opacity: 0.95 }}>{a.icon}</div>
                <div style={{ marginLeft: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{a.en} · {a.currency}</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 10, right: 10, color: 'white' }} onClick={(e) => { e.stopPropagation(); setEditing(a.id); }}>✎ 編輯</button>
              </div>
              <div style={{ padding: 22 }}>
                <div className="k-stat-label">Balance</div>
                <div className="k-stat-value" style={{ fontSize: 26, marginTop: 4 }}>{fmtMoney(bal, a.currency, { sign: false })}</div>
                <div className="k-stat-aux" style={{ marginTop: 4 }}>≈ {fmtMoney(convertTo(bal, a.currency, altCur, state.fxRate), altCur, { sign: false })}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 11.5 }}>{txnCount} 筆交易</span>
                  {regionChip(a.region)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <AccountEditor ledger={ledger} accountId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AccountEditor({ ledger, accountId, onClose }) {
  const existing = accountId ? ledger.state.accounts.find((a) => a.id === accountId) : null;
  const [name, setName] = useStateA(existing?.name || '');
  const [en, setEn] = useStateA(existing?.en || '');
  const [currency, setCurrency] = useStateA(existing?.currency || 'TWD');
  const [region, setRegion] = useStateA(existing?.region || 'INTL');
  const [color, setColor] = useStateA(existing?.color || '#C66D4A');
  const [icon, setIcon] = useStateA(existing?.icon || '◈');
  const [opening, setOpening] = useStateA(String(existing?.opening || 0));
  const [dual, setDual] = useStateA(!!existing?.dualCurrency);

  const colors = ['#C66D4A', '#4A7A8B', '#7A8B5C', '#B8895E', '#A35E7A', '#5E8B7A', '#8B6F47', '#7A6B8B'];
  const icons = ['◈', '◇', '◆', '★', '島', '◐', '▢', '◉'];

  const save = () => {
    if (!name.trim()) { showToast('請輸入名稱'); return; }
    const data = { name, en, currency, region, color, icon, opening: parseFloat(opening) || 0, dualCurrency: dual };
    if (accountId) ledger.updateAccount(accountId, data);
    else ledger.addAccount(data);
    showToast(accountId ? '已更新' : '已新增帳戶');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="page-eyebrow">{accountId ? 'Edit Account' : 'New Account'}</div>
          <h2 className="font-serif" style={{ fontSize: 26, margin: '6px 0 0', fontWeight: 500 }}>{accountId ? '編輯帳戶' : '新增帳戶'}</h2>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><span className="field-label">名稱</span><input className="input" placeholder="台灣帳戶" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><span className="field-label">英文名</span><input className="input" placeholder="Taiwan" value={en} onChange={(e) => setEn(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field"><span className="field-label">幣別</span>
              <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}><option>TWD</option><option>USD</option></select>
            </div>
            <div className="field"><span className="field-label">地區</span>
              <select className="select" value={region} onChange={(e) => setRegion(e.target.value)}><option value="TW">TW · 台灣</option><option value="US">US · 美國</option><option value="INTL">INTL · 通用</option></select>
            </div>
            <div className="field"><span className="field-label">期初金額</span>
              <input className="input" type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <span className="field-label">顏色</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? '3px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">圖示</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {icons.map((i) => (
                <button key={i} onClick={() => setIcon(i)} className="btn" style={{
                  width: 38, height: 38, padding: 0, fontFamily: 'var(--serif)', fontSize: 16,
                  background: icon === i ? color : 'var(--bg-card)',
                  color: icon === i ? 'white' : 'var(--ink)',
                  borderColor: icon === i ? color : 'var(--line)',
                }}>{i}</button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={dual} onChange={(e) => setDual(e.target.checked)} />
            雙幣別顯示（同時顯示 TWD 與 USD）
          </label>
        </div>
        <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {accountId && <button className="btn btn-ghost" style={{ color: 'var(--negative)' }} onClick={() => { if (confirm('刪除這個帳戶？相關交易會一併刪除。')) { ledger.deleteAccount(accountId); showToast('已刪除'); onClose(); } }}>刪除帳戶</button>}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={save}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT DETAIL ─────────────────────────────────────────────────────
function AccountDetailPage({ ledger, accountId, onNav }) {
  const { state } = ledger;
  const acc = state.accounts.find((a) => a.id === accountId);
  if (!acc) return <div className="empty">找不到帳戶</div>;
  const txns = state.transactions.filter((t) => t.account === accountId);
  const balance = accountBalance(acc, state.transactions, state.fxRate);
  const altCur = acc.currency === 'TWD' ? 'USD' : 'TWD';

  // running balance line chart (last 14 days)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return ymd(d);
  });
  let running = balance;
  // walk backward to compute past balances
  const futureBalances = {};
  futureBalances[ymd(new Date())] = balance;
  // simpler: compute balance at each day
  const balanceOn = (date) => {
    let b = acc.opening || 0;
    txns.filter((t) => t.date <= date).forEach((t) => {
      const a = convertTo(t.amount, t.currency, acc.currency, state.fxRate);
      if (t.type === 'income' || t.type === 'transfer-in') b += a;
      else b -= a;
    });
    return b;
  };
  const lineData = [{
    label: 'Balance', color: acc.color,
    points: days.map((d, i) => ({ x: i, y: balanceOn(d), label: d.slice(8) })),
  }];

  // monthly income/expense bars
  const monthInc = txns.filter((t) => t.type === 'income' && ym(t.date) === ym(new Date()))
    .reduce((s, t) => s + t.amount, 0);
  const monthExp = txns.filter((t) => t.type === 'expense' && ym(t.date) === ym(new Date()))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <button className="btn btn-ghost" style={{ marginBottom: 14 }} onClick={() => onNav('accounts')}>← 帳戶總覽</button>
      <div className="page-header">
        <div>
          <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 12, background: acc.color, borderRadius: 3, display: 'inline-block' }} />
            {acc.en} · {acc.currency}
          </div>
          <h1 className="page-title">{acc.name}</h1>
          <div className="page-subtitle">{txns.length} 筆交易 · 自第一筆起</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => onNav({ name: 'add', prefill: { account: accountId } })}>＋ 新增交易</button>
          <button className="btn" onClick={() => onNav('transfer')}>轉帳</button>
        </div>
      </div>

      {/* hero */}
      <div className="card card-pad" style={{ marginBottom: 16, background: `linear-gradient(135deg, ${acc.color}10 0%, var(--bg-card) 60%)` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 28 }}>
          <div className="k-stat">
            <span className="k-stat-label">Current Balance · 目前餘額</span>
            <span className="k-stat-value" style={{ fontSize: 38 }}>{fmtMoney(balance, acc.currency, { sign: false })}</span>
            <span className="k-stat-aux">≈ {fmtMoney(convertTo(balance, acc.currency, altCur, state.fxRate), altCur, { sign: false })}</span>
          </div>
          <div className="k-stat">
            <span className="k-stat-label">本月收入</span>
            <span className="k-stat-value" style={{ color: 'var(--positive)' }}>{fmtMoney(monthInc, acc.currency, { sign: false })}</span>
          </div>
          <div className="k-stat">
            <span className="k-stat-label">本月支出</span>
            <span className="k-stat-value">{fmtMoney(monthExp, acc.currency, { sign: false })}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3 className="card-title">餘額走勢 · 14 日</h3><span className="card-sub">{acc.currency}</span></div>
        <div style={{ padding: '18px 22px 22px' }}><LineChart series={lineData} height={200} /></div>
      </div>

      <div className="card">
        <div className="card-head"><h3 className="card-title">所有交易</h3><span className="card-sub">{txns.length} 筆</span></div>
        {txns.length === 0 ? (
          <div className="empty"><div className="empty-glyph">○</div><div>還沒有任何交易</div></div>
        ) : txns.map((t) => <TxnRow key={t.id} txn={t} ledger={ledger} />)}
      </div>
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────────────
function ReportsPage({ ledger }) {
  const { state } = ledger;
  const [period, setPeriod] = useStateA('month'); // month | year
  const now = new Date();

  // monthly bars: last 6 months income vs expense
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: d.toISOString().slice(0, 7), label: (d.getMonth() + 1) + '月' };
  });
  const monthData = months.map((m) => {
    const txs = state.transactions.filter((t) => ym(t.date) === m.key);
    const inc = txs.filter((t) => t.type === 'income').reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
    const exp = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
    return { ...m, income: inc, expense: exp };
  });
  const maxBar = Math.max(...monthData.flatMap((m) => [m.income, m.expense]), 1);

  // category donut for chosen period
  const periodMatch = period === 'month' ? ym(now) : now.getFullYear().toString();
  const periodTxs = state.transactions.filter((t) => {
    if (period === 'month') return ym(t.date) === periodMatch;
    return t.date.startsWith(periodMatch);
  });
  const catTotals = {};
  periodTxs.filter((t) => t.type === 'expense').forEach((t) => {
    const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    catTotals[t.category] = (catTotals[t.category] || 0) + v;
  });
  const donutData = Object.entries(catTotals).map(([id, value]) => {
    const c = findCategory(id, 'expense');
    return { id, value, color: c.color, label: c.label };
  }).sort((a, b) => b.value - a.value);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  // by account
  const accBreakdown = state.accounts.map((a) => {
    const txs = periodTxs.filter((t) => t.account === a.id);
    const exp = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
    return { account: a, expense: exp };
  });
  const accMax = Math.max(...accBreakdown.map((b) => b.expense), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Reports · 報告</div>
          <h1 className="page-title">分析與報告</h1>
          <div className="page-subtitle">理解你的金錢流向 · 找出可調整的空間</div>
        </div>
        <div className="seg">
          <button className={'seg-btn ' + (period === 'month' ? 'active' : '')} onClick={() => setPeriod('month')}>本月</button>
          <button className={'seg-btn ' + (period === 'year' ? 'active' : '')} onClick={() => setPeriod('year')}>今年</button>
        </div>
      </div>

      {/* monthly bars */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div><h3 className="card-title">收支對照 · 近 6 個月</h3><div className="card-sub" style={{ marginTop: 4 }}>Income vs Expense</div></div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: 'var(--positive)', borderRadius: 2 }} />收入</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} />支出</span>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 220 }}>
            {monthData.map((m) => {
              const incH = (m.income / maxBar) * 180;
              const expH = (m.expense / maxBar) * 180;
              const net = m.income - m.expense;
              return (
                <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="font-mono" style={{ fontSize: 11, color: net >= 0 ? 'var(--positive)' : 'var(--accent)' }}>
                    {net >= 0 ? '+' : ''}{(net / 1000).toFixed(0)}k
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 184 }}>
                    <div style={{ width: 18, height: incH, background: 'var(--positive)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: 18, height: expH, background: 'var(--accent)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* donut */}
        <div className="card">
          <div className="card-head">
            <div><h3 className="card-title">支出分類占比</h3><div className="card-sub" style={{ marginTop: 4 }}>By Category</div></div>
            <span className="font-mono dim" style={{ fontSize: 12 }}>{period === 'month' ? periodMatch : periodMatch}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, padding: 24 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart data={donutData} size={240} thickness={32} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="muted" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500 }}>{fmtMoney(donutTotal, 'TWD', { sign: false })}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              {donutData.map((d) => (
                <div key={d.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                    <span style={{ flex: 1 }}>{d.label}</span>
                    <span className="font-mono dim">{fmtMoney(d.value, 'TWD', { sign: false })}</span>
                  </div>
                  <div className="bar" style={{ marginTop: 4 }}>
                    <div className="bar-fill" style={{ width: ((d.value / donutTotal) * 100) + '%', background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* by account */}
        <div className="card">
          <div className="card-head"><h3 className="card-title">帳戶支出</h3><span className="card-sub">By Account</span></div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {accBreakdown.map((b) => (
              <div key={b.account.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: b.account.color }} />
                    {b.account.name}
                  </span>
                  <span className="font-mono">{fmtMoney(b.expense, 'TWD', { sign: false })}</span>
                </div>
                <div className="bar"><div className="bar-fill" style={{ width: ((b.expense / accMax) * 100) + '%', background: b.account.color }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BUDGETS ───────────────────────────────────────────────────────────
function BudgetsPage({ ledger }) {
  const { state } = ledger;
  const thisMonth = ym(new Date());
  const monthExp = state.transactions.filter((t) => t.type === 'expense' && ym(t.date) === thisMonth);
  const spentByCat = {};
  monthExp.forEach((t) => {
    const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    spentByCat[t.category] = (spentByCat[t.category] || 0) + v;
  });

  const totalBudget = state.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = state.budgets.reduce((s, b) => s + (spentByCat[b.category] || 0), 0);
  const totalPct = (totalSpent / totalBudget) * 100;

  const [editing, setEditing] = useStateA(null);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Budgets · 預算</div>
          <h1 className="page-title">本月預算</h1>
          <div className="page-subtitle">已使用 {fmtMoney(totalSpent, 'TWD', { sign: false })} / {fmtMoney(totalBudget, 'TWD', { sign: false })} · 還剩 {Math.max(0, totalBudget - totalSpent).toLocaleString()} 元</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>＋ 新增預算</button>
      </div>

      {/* overall */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <div className="page-eyebrow">Overall · 整月</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500, marginTop: 4 }}>
              {fmtMoney(totalSpent, 'TWD', { sign: false })} <span style={{ color: 'var(--ink-4)', fontSize: 18 }}>/ {fmtMoney(totalBudget, 'TWD', { sign: false })}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: 24, color: totalPct > 100 ? 'var(--negative)' : totalPct > 80 ? 'var(--warn)' : 'var(--positive)' }}>
              {Math.round(totalPct)}%
            </div>
            <div className="muted" style={{ fontSize: 11.5 }}>
              {totalPct > 100 ? '已超出預算 ⚠' : totalPct > 80 ? '接近預算 · 注意' : '在預算內 ✓'}
            </div>
          </div>
        </div>
        <div className="bar" style={{ height: 10 }}>
          <div className={'bar-fill ' + (totalPct > 100 ? 'over' : totalPct > 80 ? '' : 'safe')} style={{ width: Math.min(100, totalPct) + '%' }} />
        </div>
      </div>

      {/* per-category */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {state.budgets.map((b) => {
          const cat = findCategory(b.category, 'expense');
          const spent = spentByCat[b.category] || 0;
          const pct = (spent / b.limit) * 100;
          const remaining = b.limit - spent;
          return (
            <div key={b.id} className="card card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="txn-icon" style={{ background: cat.color, width: 36, height: 36, fontSize: 16 }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{cat.label}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{cat.en} · 每月</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(b.id)}>✎</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span className="font-mono" style={{ fontSize: 18, fontWeight: 500 }}>{fmtMoney(spent, 'TWD', { sign: false })}</span>
                <span className="muted font-mono" style={{ fontSize: 12 }}>/ {fmtMoney(b.limit, 'TWD', { sign: false })}</span>
              </div>
              <div className="bar"><div className={'bar-fill ' + (pct > 100 ? 'over' : pct > 80 ? '' : 'safe')} style={{ width: Math.min(100, pct) + '%' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5 }}>
                <span className={pct > 100 ? '' : 'muted'} style={{ color: pct > 100 ? 'var(--negative)' : '' }}>
                  {pct > 100 ? '超出 ' + fmtMoney(-remaining, 'TWD', { sign: false }) : '剩 ' + fmtMoney(remaining, 'TWD', { sign: false })}
                </span>
                <span className="muted font-mono">{Math.round(pct)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <BudgetEditor ledger={ledger} budgetId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BudgetEditor({ ledger, budgetId, onClose }) {
  const existing = budgetId ? ledger.state.budgets.find((b) => b.id === budgetId) : null;
  const [category, setCategory] = useStateA(existing?.category || 'food');
  const [limit, setLimit] = useStateA(String(existing?.limit || 5000));
  const save = () => {
    const lim = parseFloat(limit);
    if (!lim || lim <= 0) { showToast('請輸入有效金額'); return; }
    ledger.setBudget({ category, limit: lim, currency: 'TWD', period: 'monthly' });
    showToast('已儲存預算');
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
          <h2 className="font-serif" style={{ fontSize: 26, margin: 0, fontWeight: 500 }}>{budgetId ? '編輯預算' : '新增預算'}</h2>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <span className="field-label">分類</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(98px, 1fr))', gap: 8 }}>
              {DEFAULT_CATEGORIES.expense.map((c) => (
                <button key={c.id} className="btn" onClick={() => setCategory(c.id)} style={{
                  flexDirection: 'column', padding: '12px 6px', gap: 6,
                  borderColor: category === c.id ? c.color : 'var(--line)',
                  borderWidth: category === c.id ? 2 : 1,
                  background: category === c.id ? c.color + '18' : 'var(--bg-card)',
                }}>
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: c.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 12 }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">每月預算上限（TWD）</span>
            <input className="input" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
        </div>
        <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between' }}>
          {budgetId && <button className="btn btn-ghost" style={{ color: 'var(--negative)' }} onClick={() => { ledger.deleteBudget(budgetId); showToast('已刪除'); onClose(); }}>刪除</button>}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={save}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS ───────────────────────────────────────────────────────────
function SettingsPage({ ledger, onOpenReport }) {
  const { state } = ledger;
  const [fx, setFx] = useStateA(String(state.fxRate));
  const [importPreview, setImportPreview] = useStateA(null);

  // ── JSON 匯出 ──
  const exportJSON = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledger-backup-' + ymd(new Date()) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ 已下載備份');
  };

  // ── JSON 匯入 ──
  const handleJSONUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const data = parsed.data || parsed; // 容許舊格式
        if (!data.accounts || !data.transactions) {
          throw new Error('檔案結構不正確（缺少 accounts 或 transactions）');
        }
        setImportPreview({
          data,
          stats: {
            accounts: data.accounts?.length || 0,
            transactions: data.transactions?.length || 0,
            budgets: data.budgets?.length || 0,
            recurring: data.recurring?.length || 0,
          },
          exportedAt: parsed.exportedAt,
          fileName: file.name,
        });
      } catch (err) {
        showToast('✗ 檔案格式錯誤：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 清空，方便重複選同檔
  };

  const doImport = (mode) => {
    if (!importPreview) return;
    const incoming = importPreview.data;
    if (mode === 'replace') {
      ledger.setState({
        accounts: incoming.accounts || [],
        transactions: incoming.transactions || [],
        budgets: incoming.budgets || [],
        recurring: incoming.recurring || [],
        fxRate: incoming.fxRate || 31.8,
        carrier: incoming.carrier || { connected: false, autoSync: false },
      });
      showToast('✓ 已取代所有資料');
    } else {
      // 合併：用 id 為主鍵，舊資料保留、新資料疊加
      ledger.setState((s) => {
        const merge = (a, b, key = 'id') => {
          const ids = new Set(a.map((x) => x[key]));
          return [...a, ...(b || []).filter((x) => !ids.has(x[key]))];
        };
        return {
          ...s,
          accounts: merge(s.accounts, incoming.accounts),
          transactions: merge(s.transactions, incoming.transactions),
          budgets: merge(s.budgets, incoming.budgets),
          recurring: merge(s.recurring, incoming.recurring),
        };
      });
      showToast('✓ 已合併匯入');
    }
    setImportPreview(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Settings · 設定</div>
          <h1 className="page-title">設定與資料</h1>
          <div className="page-subtitle">匯率、週期性收支、匯入匯出、報表產出</div>
        </div>
      </div>

      {/* 視覺化報表 */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--accent-soft) 200%)' }}>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 6 }}>Visual Report · 視覺化報表</div>
            <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>產出完整圖表報表</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13, maxWidth: 540, lineHeight: 1.6 }}>
              將 KPI、月度收支、分類圓餅、商家排行、預算狀態、完整交易明細整合成一份雜誌風報表。可直接列印或存成 PDF。
            </p>
          </div>
          <button className="btn btn-primary" onClick={onOpenReport} style={{ padding: '14px 24px', fontSize: 14 }}>
            開啟報表 →
          </button>
        </div>
      </div>

      {/* 資料備份與還原 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h3 className="card-title">資料備份 / 還原</h3>
            <div className="card-sub" style={{ marginTop: 4 }}>JSON Backup · 完整保留所有帳戶、交易、預算、載具設定</div>
          </div>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <button className="card card-pad" onClick={exportJSON} style={{
            cursor: 'pointer', textAlign: 'left', border: '1px solid var(--line)', background: 'var(--bg-elev)',
            display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--positive)' }}>↓</div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>匯出 JSON 備份</div>
            <div className="muted" style={{ fontSize: 12 }}>
              下載完整資料 · {state.transactions.length} 筆交易 · {state.accounts.length} 帳戶
            </div>
          </button>
          <label className="card card-pad" style={{
            cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--bg-elev)',
            display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
          }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--accent)' }}>↑</div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>匯入 JSON 紀錄</div>
            <div className="muted" style={{ fontSize: 12 }}>選擇之前的備份檔，可合併或取代現有資料</div>
            <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleJSONUpload} />
          </label>
        </div>
        <div style={{ padding: '0 24px 22px' }}>
          <div className="muted" style={{ fontSize: 11.5, padding: 10, background: 'var(--bg-sunk)', borderRadius: 6, lineHeight: 1.6 }}>
            💡 建議定期匯出備份。資料只存在瀏覽器，清除快取或更換裝置會遺失。
          </div>
        </div>
      </div>

      {/* 匯率設定 */}
      <div className="card card-pad" style={{ marginBottom: 16, maxWidth: 540 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>匯率設定</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <span className="field-label">1 USD =</span>
            <input className="input" type="number" step="0.01" value={fx} onChange={(e) => setFx(e.target.value)} />
          </div>
          <span className="font-serif" style={{ fontSize: 18, paddingBottom: 12 }}>TWD</span>
          <button className="btn btn-primary" onClick={() => { ledger.setFx(parseFloat(fx) || 31.8); showToast('匯率已更新'); }}>更新</button>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>跨幣別交易與雙幣顯示會使用此匯率</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3 className="card-title">週期性收支</h3><span className="card-sub">Recurring</span></div>
        {state.recurring.map((r) => {
          const cat = findCategory(r.category, r.type);
          const acc = findAccount(state.accounts, r.account);
          return (
            <div key={r.id} className="txn-row" style={{ gridTemplateColumns: '36px 1fr auto auto auto' }}>
              <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
              <div className="txn-main">
                <div className="txn-note">{r.label}</div>
                <div className="txn-meta"><span>{r.cadence}</span><span className="divider-dot">·</span><span>下次 {r.next}</span><span className="divider-dot">·</span><span>{acc.name}</span></div>
              </div>
              <div className={'txn-amount ' + (r.type === 'income' ? 'positive' : 'negative')}>
                {r.type === 'income' ? '+' : '−'}{fmtMoney(r.amount, r.currency, { sign: false })}
              </div>
              <span className="chip">已啟用</span>
            </div>
          );
        })}
      </div>

      <div className="card card-pad" style={{ maxWidth: 540 }}>
        <h3 className="card-title" style={{ marginBottom: 14 }}>資料</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={() => { if (confirm('重置所有資料為示範資料？')) { ledger.reset(); showToast('已重置'); } }}>重置示範資料</button>
          <button className="btn" onClick={() => { if (confirm('清空所有資料？無法復原。')) { localStorage.removeItem('ledger.v1'); location.reload(); } }} style={{ color: 'var(--negative)' }}>清空所有資料</button>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>所有資料存於瀏覽器本機 localStorage</div>
      </div>

      {/* 匯入預覽 modal */}
      {importPreview && (
        <div className="modal-backdrop" onClick={() => setImportPreview(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
              <div className="page-eyebrow">JSON Backup · 預覽</div>
              <h2 className="font-serif" style={{ fontSize: 24, margin: '6px 0 4px', fontWeight: 500 }}>確認匯入</h2>
              <div className="muted" style={{ fontSize: 12 }}>{importPreview.fileName}</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                <ImportStat label="帳戶" value={importPreview.stats.accounts} />
                <ImportStat label="交易" value={importPreview.stats.transactions} />
                <ImportStat label="預算" value={importPreview.stats.budgets} />
                <ImportStat label="週期" value={importPreview.stats.recurring} />
              </div>
              {importPreview.exportedAt && (
                <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
                  備份時間：{new Date(importPreview.exportedAt).toLocaleString('zh-TW')}
                </div>
              )}
              <div style={{ padding: 14, background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--ink-2)' }}>合併</strong>：保留現有資料，加入備份檔中不存在的項目（依 ID 比對）<br />
                <strong style={{ color: 'var(--ink-2)' }}>取代</strong>：清除現有資料，用備份檔完全覆蓋
              </div>
            </div>
            <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={() => setImportPreview(null)}>取消</button>
              <button className="btn" onClick={() => doImport('merge')}>合併匯入</button>
              <button className="btn btn-primary" onClick={() => { if (confirm('確定要取代所有現有資料？無法復原。')) doImport('replace'); }}>取代</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportStat({ label, value }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg-sunk)', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div className="muted" style={{ fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { AccountsPage, AccountDetailPage, ReportsPage, BudgetsPage, SettingsPage });
