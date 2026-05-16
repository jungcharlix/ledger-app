// pages-report-view.jsx — 完整視覺化報表（可列印 / 存 PDF）

const { useState: useStateRV, useMemo: useMemoRV } = React;

function ReportView({ ledger, onClose }) {
  const { state } = ledger;
  const [period, setPeriod] = useStateRV('month'); // month | year | all
  const now = new Date();

  const periodTxs = useMemoRV(() => {
    return state.transactions.filter((t) => {
      if (period === 'all') return true;
      if (period === 'month') return ym(t.date) === ym(now);
      return t.date.startsWith(now.getFullYear().toString());
    });
  }, [state.transactions, period]);

  const periodLabel = period === 'month'
    ? now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
    : period === 'year' ? now.getFullYear() + ' 年' : '全部紀錄';

  // ─── 統計 ───
  const income = periodTxs.filter((t) => t.type === 'income')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const expense = periodTxs.filter((t) => t.type === 'expense')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  // 分類
  const catMap = {};
  periodTxs.filter((t) => t.type === 'expense').forEach((t) => {
    const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
    catMap[t.category] = (catMap[t.category] || 0) + v;
  });
  const catData = Object.entries(catMap).map(([id, value]) => {
    const c = findCategory(id, 'expense');
    return { id, value, color: c.color, label: c.label };
  }).sort((a, b) => b.value - a.value);

  // 月度（過去 12 個月）
  const monthSeries = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = d.toISOString().slice(0, 7);
    const txs = state.transactions.filter((t) => ym(t.date) === key);
    return {
      key, label: (d.getMonth() + 1) + '月',
      income: txs.filter((t) => t.type === 'income').reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0),
      expense: txs.filter((t) => t.type === 'expense').reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0),
    };
  });
  const maxMonth = Math.max(...monthSeries.flatMap((m) => [m.income, m.expense]), 1);

  // 帳戶餘額
  const accBalances = state.accounts.map((a) => ({
    account: a,
    balance: accountBalance(a, state.transactions, state.fxRate),
    txnCount: state.transactions.filter((t) => t.account === a.id).length,
  }));
  const totalTWD = accBalances.reduce(
    (s, b) => s + convertTo(b.balance, b.account.currency, 'TWD', state.fxRate), 0
  );

  // 商家排行（純發票）
  const merchantMap = {};
  periodTxs.filter((t) => t.merchant).forEach((t) => {
    if (!merchantMap[t.merchant]) merchantMap[t.merchant] = { name: t.merchant, count: 0, amount: 0 };
    merchantMap[t.merchant].count++;
    merchantMap[t.merchant].amount += t.amount;
  });
  const topMerchants = Object.values(merchantMap).sort((a, b) => b.amount - a.amount).slice(0, 10);

  // 預算狀態
  const budgetRows = state.budgets.map((b) => {
    const spent = periodTxs
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
    return { ...b, spent, cat: findCategory(b.category, 'expense') };
  });

  // 排序後的所有交易
  const sortedTxs = [...periodTxs].sort((a, b) => b.date.localeCompare(a.date));

  const handlePrint = () => {
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing'), 500);
    }, 100);
  };

  return (
    <div className="report-view">
      {/* 工具列（列印時隱藏）*/}
      <div className="report-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>← 返回</button>
          <span className="font-serif" style={{ fontSize: 18, fontWeight: 500 }}>視覺化報表</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seg">
            <button className={'seg-btn ' + (period === 'month' ? 'active' : '')} onClick={() => setPeriod('month')}>本月</button>
            <button className={'seg-btn ' + (period === 'year' ? 'active' : '')} onClick={() => setPeriod('year')}>今年</button>
            <button className={'seg-btn ' + (period === 'all' ? 'active' : '')} onClick={() => setPeriod('all')}>全部</button>
          </div>
          <button className="btn btn-primary" onClick={handlePrint}>↥ 列印 / 存 PDF</button>
        </div>
      </div>

      <div className="report-paper">
        {/* 封面 */}
        <header className="report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="report-eyebrow">FINANCIAL STATEMENT</div>
              <h1 className="report-h1">記帳 · 視覺化報表</h1>
              <div className="report-sub">{periodLabel} · 共 {periodTxs.length} 筆交易</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="report-eyebrow">產出日期</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 4 }}>
                {now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--mono)' }}>
                1 USD = {state.fxRate.toFixed(2)} TWD
              </div>
            </div>
          </div>
        </header>

        {/* KPI */}
        <section className="report-section">
          <h2 className="report-h2">概覽 · Overview</h2>
          <div className="report-kpi-grid">
            <ReportKPI label="Total Income" zh="總收入" value={fmtMoney(income, 'TWD', { sign: false })} color="var(--positive)" />
            <ReportKPI label="Total Expense" zh="總支出" value={fmtMoney(expense, 'TWD', { sign: false })} color="var(--negative)" />
            <ReportKPI label="Net" zh="淨額" value={(net >= 0 ? '+' : '') + fmtMoney(net, 'TWD', { sign: false })} color={net >= 0 ? 'var(--positive)' : 'var(--negative)'} />
            <ReportKPI label="Savings Rate" zh="儲蓄率" value={savingsRate + '%'} color="var(--ink)" />
          </div>
        </section>

        {/* 帳戶餘額 */}
        <section className="report-section">
          <h2 className="report-h2">帳戶 · Accounts</h2>
          <div className="report-table">
            <div className="report-tr report-th">
              <span>帳戶</span>
              <span style={{ textAlign: 'right' }}>幣別</span>
              <span style={{ textAlign: 'right' }}>餘額</span>
              <span style={{ textAlign: 'right' }}>TWD 換算</span>
              <span style={{ textAlign: 'right' }}>交易數</span>
            </div>
            {accBalances.map((b) => (
              <div key={b.account.id} className="report-tr">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: b.account.color }} />
                  {b.account.name}
                </span>
                <span className="font-mono" style={{ textAlign: 'right' }}>{b.account.currency}</span>
                <span className="font-mono" style={{ textAlign: 'right' }}>{fmtMoney(b.balance, b.account.currency, { sign: false })}</span>
                <span className="font-mono" style={{ textAlign: 'right' }}>
                  {fmtMoney(convertTo(b.balance, b.account.currency, 'TWD', state.fxRate), 'TWD', { sign: false })}
                </span>
                <span className="font-mono" style={{ textAlign: 'right' }}>{b.txnCount}</span>
              </div>
            ))}
            <div className="report-tr report-tfoot">
              <span style={{ fontWeight: 600 }}>總計</span>
              <span></span><span></span>
              <span className="font-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                {fmtMoney(totalTWD, 'TWD', { sign: false })}
              </span>
              <span className="font-mono" style={{ textAlign: 'right' }}>{state.transactions.length}</span>
            </div>
          </div>
        </section>

        {/* 12 個月收支 */}
        <section className="report-section report-keep">
          <h2 className="report-h2">月度收支對照 · 12 Months</h2>
          <div className="report-bars">
            {monthSeries.map((m) => {
              const incH = (m.income / maxMonth) * 100;
              const expH = (m.expense / maxMonth) * 100;
              return (
                <div key={m.key} className="report-bar-group">
                  <div className="report-bars-wrap" style={{ height: 110 }}>
                    <div className="report-bar" style={{ height: incH + '%', background: 'var(--positive)' }} />
                    <div className="report-bar" style={{ height: expH + '%', background: 'var(--accent)' }} />
                  </div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{m.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--positive)', borderRadius: 2 }} />收入</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} />支出</span>
          </div>
        </section>

        {/* 分類 */}
        <section className="report-section report-keep">
          <h2 className="report-h2">支出分類 · By Category</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <DonutChart data={catData} size={220} thickness={30} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div className="muted" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500 }}>{fmtMoney(expense, 'TWD', { sign: false })}</div>
              </div>
            </div>
            <div>
              {catData.map((c) => (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                      {c.label}
                    </span>
                    <span className="font-mono">{fmtMoney(c.value, 'TWD', { sign: false })} <span className="muted">({Math.round(c.value / expense * 100)}%)</span></span>
                  </div>
                  <div className="bar"><div className="bar-fill" style={{ width: ((c.value / expense) * 100) + '%', background: c.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 商家排行 */}
        {topMerchants.length > 0 && (
          <section className="report-section report-keep">
            <h2 className="report-h2">商家消費 Top {topMerchants.length} · Top Merchants</h2>
            <div className="report-table">
              <div className="report-tr report-th" style={{ gridTemplateColumns: '30px 2fr 1fr 1fr 1fr' }}>
                <span>#</span><span>商家</span>
                <span style={{ textAlign: 'right' }}>次數</span>
                <span style={{ textAlign: 'right' }}>累計</span>
                <span style={{ textAlign: 'right' }}>平均</span>
              </div>
              {topMerchants.map((m, i) => (
                <div key={m.name} className="report-tr" style={{ gridTemplateColumns: '30px 2fr 1fr 1fr 1fr' }}>
                  <span className="font-mono" style={{ color: 'var(--ink-4)' }}>{i + 1}</span>
                  <span>{m.name}</span>
                  <span className="font-mono" style={{ textAlign: 'right' }}>{m.count}</span>
                  <span className="font-mono" style={{ textAlign: 'right' }}>{fmtMoney(m.amount, 'TWD', { sign: false })}</span>
                  <span className="font-mono" style={{ textAlign: 'right' }}>{fmtMoney(m.amount / m.count, 'TWD', { sign: false })}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 預算 */}
        {budgetRows.length > 0 && (
          <section className="report-section report-keep">
            <h2 className="report-h2">預算執行 · Budget Status</h2>
            <div className="report-table">
              <div className="report-tr report-th" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 70px' }}>
                <span>分類</span>
                <span style={{ textAlign: 'right' }}>預算</span>
                <span style={{ textAlign: 'right' }}>已用</span>
                <span style={{ textAlign: 'right' }}>剩餘</span>
                <span style={{ textAlign: 'right' }}>%</span>
              </div>
              {budgetRows.map((b) => {
                const pct = Math.round((b.spent / b.limit) * 100);
                return (
                  <div key={b.id} className="report-tr" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 70px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: b.cat.color }} />
                      {b.cat.label}
                    </span>
                    <span className="font-mono" style={{ textAlign: 'right' }}>{fmtMoney(b.limit, 'TWD', { sign: false })}</span>
                    <span className="font-mono" style={{ textAlign: 'right' }}>{fmtMoney(b.spent, 'TWD', { sign: false })}</span>
                    <span className="font-mono" style={{ textAlign: 'right', color: b.limit - b.spent < 0 ? 'var(--negative)' : 'inherit' }}>
                      {fmtMoney(b.limit - b.spent, 'TWD', { sign: false })}
                    </span>
                    <span className="font-mono" style={{ textAlign: 'right', color: pct > 100 ? 'var(--negative)' : pct > 80 ? 'var(--warn)' : 'var(--positive)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 全部交易 */}
        <section className="report-section">
          <h2 className="report-h2">交易明細 · All Transactions</h2>
          <div className="report-table">
            <div className="report-tr report-th" style={{ gridTemplateColumns: '90px 1.4fr 1fr 0.8fr 1fr' }}>
              <span>日期</span><span>備註</span><span>分類</span>
              <span style={{ textAlign: 'right' }}>帳戶</span>
              <span style={{ textAlign: 'right' }}>金額</span>
            </div>
            {sortedTxs.map((t) => {
              const cat = findCategory(t.category, t.type === 'income' ? 'income' : 'expense');
              const acc = findAccount(state.accounts, t.account);
              const isIncome = t.type === 'income' || t.type === 'transfer-in';
              return (
                <div key={t.id} className="report-tr" style={{ gridTemplateColumns: '90px 1.4fr 1fr 0.8fr 1fr' }}>
                  <span className="font-mono" style={{ fontSize: 11 }}>{t.date}</span>
                  <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note || cat.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                    {cat.label}
                  </span>
                  <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--ink-3)' }}>{acc.name}</span>
                  <span className="font-mono" style={{ textAlign: 'right', color: isIncome ? 'var(--positive)' : 'inherit' }}>
                    {isIncome ? '+' : '−'}{fmtMoney(t.amount, t.currency, { sign: false })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="report-footer">
          <span>記帳 · Ledger</span>
          <span>產出於 {now.toISOString().slice(0, 16).replace('T', ' ')}</span>
        </footer>
      </div>
    </div>
  );
}

function ReportKPI({ label, zh, value, color }) {
  return (
    <div className="report-kpi">
      <div style={{ height: 3, background: color, borderRadius: 2, marginBottom: 12 }} />
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-4)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{zh}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500, marginTop: 8, color }}>{value}</div>
    </div>
  );
}

Object.assign(window, { ReportView });
