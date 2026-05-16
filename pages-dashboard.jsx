// pages.jsx — every page-level view

const { useState, useMemo, useEffect } = React;

// ── helpers ───────────────────────────────────────────────────────────
function regionChip(region) {
  const map = { TW: { cls: 'chip-tw', label: 'TW · 台灣' }, US: { cls: 'chip-us', label: 'US · 美國' }, INTL: { cls: 'chip-intl', label: 'INTL · 通用' } };
  const m = map[region] || { cls: '', label: region };
  return <span className={'chip ' + m.cls}>{m.label}</span>;
}

function CategoryDot({ catId, type, size = 32 }) {
  const c = findCategory(catId, type);
  return (
    <span className="txn-icon" style={{ background: c.color, width: size, height: size, fontSize: size * 0.5 }}>{c.icon}</span>
  );
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
function Dashboard({ ledger, onNav }) {
  const { state } = ledger;
  const totalTWD = state.accounts.reduce(
    (s, a) => s + convertTo(accountBalance(a, state.transactions, state.fxRate), a.currency, 'TWD', state.fxRate), 0
  );
  const totalUSD = totalTWD / state.fxRate;

  const thisMonth = ym(new Date());
  const monthTxns = state.transactions.filter((t) => ym(t.date) === thisMonth && (t.type === 'income' || t.type === 'expense'));
  const monthIncome = monthTxns.filter((t) => t.type === 'income')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const monthExpense = monthTxns.filter((t) => t.type === 'expense')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);

  // last 7 days line
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return ymd(d);
  });
  const dailyExp = days.map((d) => state.transactions
    .filter((t) => t.date === d && t.type === 'expense')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0));
  const lineSeries = [{
    label: 'Daily', color: 'var(--accent)',
    points: days.map((d, i) => ({ x: i, y: dailyExp[i], label: d.slice(5).replace('-', '/') })),
  }];

  // category breakdown for donut
  const catTotals = {};
  monthTxns.filter((t) => t.type === 'expense').forEach((t) => {
    const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    catTotals[t.category] = (catTotals[t.category] || 0) + v;
  });
  const donutData = Object.entries(catTotals)
    .map(([id, value]) => {
      const c = findCategory(id, 'expense');
      return { id, value, color: c.color, label: c.label };
    })
    .sort((a, b) => b.value - a.value);
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const recent = state.transactions.slice(0, 6);

  // upcoming recurring
  const upcoming = [...state.recurring]
    .sort((a, b) => new Date(a.next) - new Date(b.next))
    .slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">May 2026 · 五月</div>
          <h1 className="page-title">早安，五月</h1>
          <div className="page-subtitle">這個月你已經記錄了 {monthTxns.length} 筆交易 · 共 {state.accounts.length} 個帳戶</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => onNav('add')}>＋ 新增交易</button>
          <button className="btn" onClick={() => onNav('transfer')}>轉帳</button>
        </div>
      </div>

      {/* hero balance */}
      <div className="card card-pad" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elev) 100%)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 32 }}>
          <div className="k-stat">
            <span className="k-stat-label">Net Worth · 總資產</span>
            <span className="k-stat-value">{fmtMoney(totalTWD, 'TWD', { sign: false })}</span>
            <span className="k-stat-aux">≈ {fmtMoney(totalUSD, 'USD', { sign: false })} · 匯率 {state.fxRate.toFixed(2)}</span>
          </div>
          <div className="k-stat">
            <span className="k-stat-label">Income · 本月收入</span>
            <span className="k-stat-value" style={{ color: 'var(--positive)' }}>{fmtMoney(monthIncome, 'TWD', { sign: false })}</span>
            <span className="k-stat-aux">{monthTxns.filter((t) => t.type === 'income').length} 筆</span>
          </div>
          <div className="k-stat">
            <span className="k-stat-label">Expense · 本月支出</span>
            <span className="k-stat-value">{fmtMoney(monthExpense, 'TWD', { sign: false })}</span>
            <span className="k-stat-aux">每日平均 {fmtMoney(monthExpense / new Date().getDate(), 'TWD', { sign: false })}</span>
          </div>
        </div>
      </div>

      {/* accounts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {state.accounts.map((a) => {
          const bal = accountBalance(a, state.transactions, state.fxRate);
          const txnCount = state.transactions.filter((t) => t.account === a.id).length;
          const altCur = a.currency === 'TWD' ? 'USD' : 'TWD';
          return (
            <div key={a.id} className="card card-pad" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                 onClick={() => onNav('account:' + a.id)}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: a.color, opacity: 0.08 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 18 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{a.en} · {a.currency}</div>
                  </div>
                </div>
                {regionChip(a.region)}
              </div>
              <div className="k-stat-value" style={{ fontSize: 26 }}>{fmtMoney(bal, a.currency, { sign: false })}</div>
              {(a.dualCurrency || a.region === 'INTL') && (
                <div className="k-stat-aux" style={{ marginTop: 4 }}>
                  ≈ {fmtMoney(convertTo(bal, a.currency, altCur, state.fxRate), altCur, { sign: false })}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
                <span className="muted" style={{ fontSize: 11.5 }}>{txnCount} 筆交易</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>查看 →</span>
              </div>
            </div>
          );
        })}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, color: 'var(--ink-4)', cursor: 'pointer', borderStyle: 'dashed' }}
             onClick={() => onNav('accounts')}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32, marginBottom: 6 }}>＋</div>
          <div style={{ fontSize: 13 }}>新增帳戶</div>
        </div>
      </div>

      {/* charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">本月支出分類</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>By Category</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('reports')}>詳細 →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, padding: 22 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart data={donutData} size={220} thickness={28} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="muted" style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500 }}>{fmtMoney(donutTotal, 'TWD', { sign: false })}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              {donutData.slice(0, 6).map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{d.label}</span>
                  <span className="font-mono dim">{fmtMoney(d.value, 'TWD', { sign: false })}</span>
                  <span className="muted" style={{ fontSize: 11, width: 38, textAlign: 'right' }}>{Math.round((d.value / donutTotal) * 100)}%</span>
                </div>
              ))}
              {donutData.length === 0 && <div className="empty" style={{ padding: 20 }}>尚無支出</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">近 7 日支出</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>Daily Spend</div>
            </div>
            <span className="font-mono dim" style={{ fontSize: 12 }}>TWD</span>
          </div>
          <div style={{ padding: '18px 22px 22px' }}>
            <LineChart series={lineSeries} height={220} />
          </div>
        </div>
      </div>

      {/* recent + upcoming */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">近期交易</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>Recent Activity</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('transactions')}>全部 →</button>
          </div>
          {recent.map((t) => <TxnRow key={t.id} txn={t} ledger={ledger} />)}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">即將到期</h3>
              <div className="card-sub" style={{ marginTop: 4 }}>Recurring</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('settings')}>管理 →</button>
          </div>
          <div style={{ padding: '6px 0' }}>
            {upcoming.map((r) => {
              const cat = findCategory(r.category, r.type);
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{r.cadence} · {new Date(r.next).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="font-mono" style={{ fontSize: 13, color: r.type === 'income' ? 'var(--positive)' : 'var(--ink)' }}>
                    {r.type === 'income' ? '+' : '−'}{fmtMoney(r.amount, r.currency, { sign: false })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TXN ROW ────────────────────────────────────────────────────────────
function TxnRow({ txn, ledger, onClick }) {
  const acc = findAccount(ledger.state.accounts, txn.account);
  const cat = findCategory(txn.category, txn.type === 'income' ? 'income' : 'expense');
  const isIncome = txn.type === 'income' || txn.type === 'transfer-in';
  const isTransfer = txn.type === 'transfer-out' || txn.type === 'transfer-in';
  const isExpense = txn.type === 'expense';
  const altCur = txn.currency === 'TWD' ? 'USD' : 'TWD';
  const altAmount = convertTo(txn.amount, txn.currency, altCur, ledger.state.fxRate);
  const [showWasteModal, setShowWasteModal] = React.useState(false);

  return (
    <div className="txn-row" onClick={onClick} style={{ gridTemplateColumns: '36px 1fr auto auto auto' }}>
      <div className="txn-icon" style={{ background: isTransfer ? 'var(--ink-3)' : cat.color, position: 'relative' }}>
        {isTransfer ? '⇄' : cat.icon}
        {txn.waste && (
          <span style={{
            position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%',
            background: 'var(--negative)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, border: '2px solid var(--bg-card)',
          }}>!</span>
        )}
      </div>
      <div className="txn-main">
        <div className="txn-note">
          {txn.note || cat.label}
          {txn.waste && <span style={{ color: 'var(--negative)', marginLeft: 6, fontSize: 11 }}>· 已標記浪費</span>}
        </div>
        <div className="txn-meta">
          <span>{relTime(txn.date)}</span>
          <span className="divider-dot">·</span>
          <span>{acc.name}</span>
          <span className="divider-dot">·</span>
          <span>{isTransfer ? '轉帳' : cat.label}</span>
          {txn.tags && txn.tags.map((tag) => (
            <span key={tag} className="chip" style={{ padding: '1px 7px', fontSize: 10.5, marginLeft: 4 }}>{tag}</span>
          ))}
        </div>
      </div>
      <div>
        <div className={'txn-amount ' + (isIncome ? 'positive' : 'negative')}>
          {isIncome ? '+' : '−'}{fmtMoney(txn.amount, txn.currency, { sign: false })}
        </div>
        <div className="txn-aux">≈ {fmtMoney(altAmount, altCur, { sign: false })}</div>
      </div>
      {isExpense && (
        <button
          className="btn btn-ghost btn-icon"
          title={txn.waste ? '取消浪費標記' : '標記為浪費'}
          onClick={(e) => {
            e.stopPropagation();
            if (txn.waste) { ledger.unmarkWaste(txn.id); showToast('已取消'); }
            else setShowWasteModal(true);
          }}
          style={{ color: txn.waste ? 'var(--negative)' : 'var(--ink-4)', fontSize: 13 }}
        >⚑</button>
      )}
      <button className="btn btn-ghost btn-icon" title="刪除" onClick={(e) => { e.stopPropagation(); if (confirm('刪除這筆交易？')) { ledger.deleteTxn(txn.id); showToast('已刪除'); } }}>×</button>

      {showWasteModal && window.WasteMarkModal && (
        <WasteMarkModal txn={txn} ledger={ledger} onClose={() => setShowWasteModal(false)} />
      )}
    </div>
  );
}

Object.assign(window, { Dashboard, TxnRow, regionChip, CategoryDot, showToast });
