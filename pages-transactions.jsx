// pages-transactions.jsx — list + filters + add/edit form + transfer

const { useState: useStateT, useMemo: useMemoT } = React;

// ── ADD TRANSACTION ────────────────────────────────────────────────────
function AddTransactionPage({ ledger, onDone, prefill }) {
  const accounts = ledger.state.accounts;
  const [type, setType] = useStateT(prefill?.type || 'expense');
  const [account, setAccount] = useStateT(prefill?.account || accounts[0]?.id || '');
  const acc = findAccount(accounts, account);
  const [currency, setCurrency] = useStateT(prefill?.currency || acc.currency);
  const [amount, setAmount] = useStateT(prefill?.amount || '');
  const [category, setCategory] = useStateT(prefill?.category || (type === 'income' ? 'salary' : 'food'));
  const [date, setDate] = useStateT(prefill?.date || ymd(new Date()));
  const [note, setNote] = useStateT(prefill?.note || '');
  const [tags, setTags] = useStateT(prefill?.tags?.join(', ') || '');

  React.useEffect(() => {
    setCurrency(acc.currency);
    if (type === 'income' && !DEFAULT_CATEGORIES.income.find((c) => c.id === category)) setCategory('salary');
    if (type === 'expense' && !DEFAULT_CATEGORIES.expense.find((c) => c.id === category)) setCategory('food');
  }, [account, type]);

  const cats = type === 'income' ? DEFAULT_CATEGORIES.income : DEFAULT_CATEGORIES.expense;

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast('請輸入金額'); return; }
    ledger.addTxn({ type, account, currency, amount: amt, category, date, note, tags: tags.split(',').map((s) => s.trim()).filter(Boolean) });
    showToast('已新增 · ' + fmtMoney(amt, currency, { sign: false }));
    onDone();
  };

  const altCur = currency === 'TWD' ? 'USD' : 'TWD';
  const altAmt = parseFloat(amount) ? convertTo(parseFloat(amount), currency, altCur, ledger.state.fxRate) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">New Entry · 記一筆</div>
          <h1 className="page-title">新增交易</h1>
          <div className="page-subtitle">把今天的花費或收入寫下來，未來的你會感謝你</div>
        </div>
        <button className="btn btn-ghost" onClick={onDone}>取消 ×</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 720 }}>
        {/* type segmented */}
        <div className="seg" style={{ marginBottom: 24 }}>
          {[
            { id: 'expense', label: '支出' },
            { id: 'income', label: '收入' },
          ].map((o) => (
            <button key={o.id} className={'seg-btn ' + (type === o.id ? 'active' : '')} onClick={() => setType(o.id)}>{o.label}</button>
          ))}
        </div>

        {/* amount + currency */}
        <div className="field" style={{ marginBottom: 28 }}>
          <span className="field-label">Amount · 金額</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink-4)' }}>{currency === 'TWD' ? 'NT$' : '$'}</span>
            <input
              className="input-large"
              style={{ flex: 1 }}
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="seg" style={{ flexShrink: 0 }}>
              {['TWD', 'USD'].map((c) => (
                <button key={c} className={'seg-btn ' + (currency === c ? 'active' : '')} onClick={() => setCurrency(c)}>{c}</button>
              ))}
            </div>
          </div>
          {amount && <div className="dim" style={{ fontSize: 12, marginTop: 8, fontFamily: 'var(--mono)' }}>≈ {fmtMoney(altAmt, altCur, { sign: false })} · 匯率 {ledger.state.fxRate.toFixed(2)}</div>}
        </div>

        {/* account */}
        <div className="field" style={{ marginBottom: 22 }}>
          <span className="field-label">Account · 帳戶</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {accounts.map((a) => (
              <button key={a.id}
                className="btn"
                style={{
                  padding: '10px 14px',
                  borderColor: account === a.id ? a.color : 'var(--line)',
                  borderWidth: account === a.id ? 2 : 1,
                  background: account === a.id ? 'var(--bg-elev)' : 'var(--bg-card)',
                }}
                onClick={() => setAccount(a.id)}
              >
                <span style={{ width: 18, height: 18, borderRadius: 4, background: a.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 11 }}>{a.icon}</span>
                {a.name} <span className="muted" style={{ fontSize: 11 }}>{a.currency}</span>
              </button>
            ))}
          </div>
        </div>

        {/* category */}
        <div className="field" style={{ marginBottom: 22 }}>
          <span className="field-label">Category · 分類</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(98px, 1fr))', gap: 8 }}>
            {cats.map((c) => (
              <button key={c.id}
                className="btn"
                style={{
                  flexDirection: 'column',
                  padding: '12px 6px',
                  gap: 6,
                  borderColor: category === c.id ? c.color : 'var(--line)',
                  borderWidth: category === c.id ? 2 : 1,
                  background: category === c.id ? c.color + '18' : 'var(--bg-card)',
                }}
                onClick={() => setCategory(c.id)}
              >
                <span style={{ width: 28, height: 28, borderRadius: 7, background: c.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 14 }}>{c.icon}</span>
                <span style={{ fontSize: 12 }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* date + note */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
          <div className="field">
            <span className="field-label">Date · 日期</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">Note · 備註</span>
            <input className="input" type="text" placeholder="這筆是…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 24 }}>
          <span className="field-label">Tags · 標籤（逗號分隔）</span>
          <input className="input" type="text" placeholder="月薪, 訂閱, 旅遊…" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--line-soft)', paddingTop: 18 }}>
          <button className="btn" onClick={onDone}>取消</button>
          <button className="btn btn-primary" onClick={submit}>儲存交易</button>
        </div>
      </div>
    </div>
  );
}

// ── TRANSFER ──────────────────────────────────────────────────────────
function TransferPage({ ledger, onDone }) {
  const accounts = ledger.state.accounts;
  const [from, setFrom] = useStateT(accounts[0]?.id || '');
  const [to, setTo] = useStateT(accounts[1]?.id || '');
  const [amount, setAmount] = useStateT('');
  const [date, setDate] = useStateT(ymd(new Date()));
  const [note, setNote] = useStateT('');

  const fromAcc = findAccount(accounts, from);
  const toAcc = findAccount(accounts, to);
  const sameCurrency = fromAcc.currency === toAcc.currency;
  const amt = parseFloat(amount) || 0;
  const convertedAmt = convertTo(amt, fromAcc.currency, toAcc.currency, ledger.state.fxRate);

  const submit = () => {
    if (!amt || amt <= 0) { showToast('請輸入金額'); return; }
    if (from === to) { showToast('不能轉到同一帳戶'); return; }
    ledger.transfer({
      from, to, amount: amt,
      fromCurrency: fromAcc.currency,
      toCurrency: toAcc.currency,
      date, note,
    });
    // store as converted on the inbound side; simplification: store source amount on both
    showToast('轉帳完成');
    onDone();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Transfer · 帳戶間移轉</div>
          <h1 className="page-title">轉帳</h1>
          <div className="page-subtitle">在你的帳戶之間移動資金 · 跨幣別自動換算</div>
        </div>
        <button className="btn btn-ghost" onClick={onDone}>取消 ×</button>
      </div>

      <div className="card card-pad" style={{ maxWidth: 640 }}>
        {/* from / to visual */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', gap: 14, alignItems: 'center', marginBottom: 28 }}>
          <AccountPickerCard label="From · 從" accounts={accounts} value={from} onChange={setFrom} />
          <div style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink-3)' }}>→</div>
          <AccountPickerCard label="To · 到" accounts={accounts} value={to} onChange={setTo} disabledId={from} />
        </div>

        <div className="field" style={{ marginBottom: 22 }}>
          <span className="field-label">Amount · 金額（{fromAcc.currency}）</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--ink-4)' }}>{fromAcc.currency === 'TWD' ? 'NT$' : '$'}</span>
            <input className="input-large" style={{ flex: 1 }} type="number" step="0.01" placeholder="0.00" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {!sameCurrency && amt > 0 && (
            <div style={{ marginTop: 10, padding: 12, background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{toAcc.name} 將收到</span>
                <span className="font-mono" style={{ color: 'var(--ink)' }}>{fmtMoney(convertedAmt, toAcc.currency, { sign: false })}</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--ink-4)' }}>匯率 1 USD = {ledger.state.fxRate.toFixed(2)} TWD</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 24 }}>
          <div className="field">
            <span className="field-label">Date · 日期</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">Note · 備註</span>
            <input className="input" type="text" placeholder="例如：信用卡還款" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--line-soft)', paddingTop: 18 }}>
          <button className="btn" onClick={onDone}>取消</button>
          <button className="btn btn-primary" onClick={submit}>確認轉帳</button>
        </div>
      </div>
    </div>
  );
}

function AccountPickerCard({ label, accounts, value, onChange, disabledId }) {
  const acc = findAccount(accounts, value);
  return (
    <div>
      <div className="field-label" style={{ marginBottom: 6 }}>{label}</div>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '14px 12px', borderColor: acc.color, borderWidth: 1.5 }}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id} disabled={a.id === disabledId}>
            {a.name} · {a.currency}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── TRANSACTIONS LIST ─────────────────────────────────────────────────
function TransactionsPage({ ledger, onNav }) {
  const { state } = ledger;
  const [search, setSearch] = useStateT('');
  const [filterAcc, setFilterAcc] = useStateT('all');
  const [filterType, setFilterType] = useStateT('all');
  const [filterCat, setFilterCat] = useStateT('all');

  const filtered = useMemoT(() => {
    return state.transactions.filter((t) => {
      if (filterAcc !== 'all' && t.account !== filterAcc) return false;
      if (filterType !== 'all') {
        if (filterType === 'income' && !(t.type === 'income' || t.type === 'transfer-in')) return false;
        if (filterType === 'expense' && !(t.type === 'expense' || t.type === 'transfer-out')) return false;
      }
      if (filterCat !== 'all' && t.category !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.note || '').toLowerCase().includes(q) &&
            !(t.tags || []).join(' ').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state.transactions, search, filterAcc, filterType, filterCat]);

  // group by date
  const groups = useMemoT(() => {
    const map = {};
    filtered.forEach((t) => { (map[t.date] = map[t.date] || []).push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalExpense = filtered.filter((t) => t.type === 'expense')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);
  const totalIncome = filtered.filter((t) => t.type === 'income')
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);

  const exportCSV = () => {
    const rows = [['Date', 'Account', 'Type', 'Category', 'Amount', 'Currency', 'Note', 'Tags']];
    filtered.forEach((t) => {
      const acc = findAccount(state.accounts, t.account);
      rows.push([t.date, acc.name, t.type, t.category, t.amount, t.currency, t.note || '', (t.tags || []).join(';')]);
    });
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transactions-' + ymd(new Date()) + '.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 已下載');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">All Transactions · 全部交易</div>
          <h1 className="page-title">交易紀錄</h1>
          <div className="page-subtitle">{filtered.length} 筆 · 收入 {fmtMoney(totalIncome, 'TWD', { sign: false })} · 支出 {fmtMoney(totalExpense, 'TWD', { sign: false })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportCSV}>↓ CSV</button>
          <button className="btn btn-primary" onClick={() => onNav('add')}>＋ 新增</button>
        </div>
      </div>

      {/* filters */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ flex: '1 1 220px', minWidth: 180 }} placeholder="🔍 搜尋備註、標籤…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="seg">
          <button className={'seg-btn ' + (filterType === 'all' ? 'active' : '')} onClick={() => setFilterType('all')}>全部</button>
          <button className={'seg-btn ' + (filterType === 'expense' ? 'active' : '')} onClick={() => setFilterType('expense')}>支出</button>
          <button className={'seg-btn ' + (filterType === 'income' ? 'active' : '')} onClick={() => setFilterType('income')}>收入</button>
        </div>
        <select className="select" value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)} style={{ minWidth: 140 }}>
          <option value="all">所有帳戶</option>
          {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ minWidth: 140 }}>
          <option value="all">所有分類</option>
          <optgroup label="支出">
            {DEFAULT_CATEGORIES.expense.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </optgroup>
          <optgroup label="收入">
            {DEFAULT_CATEGORIES.income.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </optgroup>
        </select>
        {(search || filterAcc !== 'all' || filterType !== 'all' || filterCat !== 'all') &&
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterAcc('all'); setFilterType('all'); setFilterCat('all'); }}>清除 ×</button>
        }
      </div>

      {groups.length === 0 ? (
        <div className="card empty">
          <div className="empty-glyph">○</div>
          <div>沒有符合條件的交易</div>
        </div>
      ) : (
        groups.map(([date, txns]) => {
          const dailySum = txns.reduce((s, t) => {
            const v = convertTo(t.amount, t.currency, 'TWD', state.fxRate);
            return s + (t.type === 'income' || t.type === 'transfer-in' ? v : -v);
          }, 0);
          return (
            <div key={date} className="card" style={{ marginBottom: 12 }}>
              <div style={{ padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--line-soft)', background: 'var(--bg-elev)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500 }}>{new Date(date).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <span className="muted" style={{ fontSize: 11.5, marginLeft: 10 }}>{date}</span>
                </div>
                <span className="font-mono" style={{ fontSize: 12.5, color: dailySum >= 0 ? 'var(--positive)' : 'var(--ink-3)' }}>
                  {dailySum >= 0 ? '+' : ''}{fmtMoney(dailySum, 'TWD', { sign: false })}
                </span>
              </div>
              {txns.map((t) => <TxnRow key={t.id} txn={t} ledger={ledger} />)}
            </div>
          );
        })
      )}
    </div>
  );
}

Object.assign(window, { AddTransactionPage, TransferPage, TransactionsPage });
