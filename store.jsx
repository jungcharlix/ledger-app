// store.jsx — global app state, persisted to localStorage

const LEDGER_KEY = 'ledger.v1';
const PROFILES_KEY = 'ledger.profiles.v1';
const ACTIVE_PROFILE_KEY = 'ledger.activeProfile';

// ── Profile (使用者檔案) ────────────────────────────────────────────────
const DEFAULT_PROFILE = { id: 'default', name: '我的帳本', color: '#C66D4A', icon: '◐', createdAt: new Date().toISOString() };

function profileDataKey(profileId) {
  // 預設 profile 仍用舊 key 以維持向後相容
  return profileId === 'default' ? LEDGER_KEY : LEDGER_KEY + '.' + profileId;
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {}
  // 第一次：建預設 profile
  const list = [DEFAULT_PROFILE];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  return list;
}

function saveProfiles(list) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}

function loadActiveProfileId() {
  try {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (id) return id;
  } catch (e) {}
  return 'default';
}

function saveActiveProfileId(id) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

function useProfiles() {
  const [profiles, setProfiles] = React.useState(loadProfiles);
  const [activeId, setActiveId] = React.useState(loadActiveProfileId);

  React.useEffect(() => { saveProfiles(profiles); }, [profiles]);
  React.useEffect(() => { saveActiveProfileId(activeId); }, [activeId]);

  const active = profiles.find((p) => p.id === activeId) || profiles[0];

  const addProfile = (data) => {
    const newP = {
      id: 'p' + Date.now().toString(36),
      name: data.name || '新使用者',
      color: data.color || '#7A8B5C',
      icon: data.icon || '◇',
      createdAt: new Date().toISOString(),
    };
    setProfiles((ps) => [...ps, newP]);
    setActiveId(newP.id);
    return newP;
  };

  const updateProfile = (id, patch) => {
    setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deleteProfile = (id) => {
    if (profiles.length <= 1) { showToast && showToast('至少要保留一個使用者'); return false; }
    setProfiles((ps) => ps.filter((p) => p.id !== id));
    localStorage.removeItem(profileDataKey(id));
    if (activeId === id) setActiveId(profiles.find((p) => p.id !== id).id);
    return true;
  };

  const switchProfile = (id) => setActiveId(id);

  return { profiles, active, activeId, addProfile, updateProfile, deleteProfile, switchProfile };
}

// ── Categories ────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', label: '餐飲', en: 'Food', icon: '◐', color: '#C66D4A' },
    { id: 'transport', label: '交通', en: 'Transport', icon: '◇', color: '#7A8B5C' },
    { id: 'shopping', label: '購物', en: 'Shopping', icon: '◈', color: '#B8895E' },
    { id: 'rent', label: '居住', en: 'Housing', icon: '▢', color: '#8B6F47' },
    { id: 'utility', label: '水電', en: 'Utilities', icon: '◉', color: '#6B7B8C' },
    { id: 'entertainment', label: '娛樂', en: 'Entertainment', icon: '◆', color: '#A35E7A' },
    { id: 'health', label: '醫療', en: 'Health', icon: '✚', color: '#5E8B7A' },
    { id: 'subscription', label: '訂閱', en: 'Subscription', icon: '↻', color: '#7A6B8B' },
    { id: 'travel', label: '旅遊', en: 'Travel', icon: '✈', color: '#4A7A8B' },
    { id: 'other', label: '其他', en: 'Other', icon: '○', color: '#8B8478' },
  ],
  income: [
    { id: 'salary', label: '薪資', en: 'Salary', icon: '◆', color: '#5E8B6E' },
    { id: 'bonus', label: '獎金', en: 'Bonus', icon: '★', color: '#8B7E5E' },
    { id: 'investment', label: '投資', en: 'Investment', icon: '↗', color: '#5E7A8B' },
    { id: 'refund', label: '退款', en: 'Refund', icon: '↺', color: '#8B6E5E' },
    { id: 'other-income', label: '其他', en: 'Other', icon: '○', color: '#8B8478' },
  ],
};

// ── Seed data ─────────────────────────────────────────────────────────────
function seed() {
  const today = new Date();
  const d = (offset) => {
    const x = new Date(today);
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };
  const accounts = [
    { id: 'tw', name: '台灣帳戶', en: 'Taiwan', currency: 'TWD', region: 'TW', color: '#C66D4A', icon: '島', opening: 0 },
    { id: 'us', name: '美國帳戶', en: 'United States', currency: 'USD', region: 'US', color: '#4A7A8B', icon: '★', opening: 0 },
    { id: 'shared', name: '通用帳戶', en: 'Shared', currency: 'TWD', region: 'INTL', color: '#7A8B5C', icon: '◈', opening: 0, dualCurrency: true },
  ];
  const txns = [
    { account: 'tw', type: 'income', category: 'salary', amount: 65000, currency: 'TWD', date: d(2), note: '月薪 April', tags: ['月薪'] },
    { account: 'tw', type: 'expense', category: 'food', amount: 285, currency: 'TWD', date: d(0), note: '永和豆漿早餐', tags: [] },
    { account: 'tw', type: 'expense', category: 'food', amount: 1240, currency: 'TWD', date: d(1), note: '聚餐 — 鼎泰豐', tags: ['聚餐'] },
    { account: 'tw', type: 'expense', category: 'transport', amount: 180, currency: 'TWD', date: d(0), note: 'MRT 悠遊卡儲值', tags: [] },
    { account: 'tw', type: 'expense', category: 'rent', amount: 22000, currency: 'TWD', date: d(4), note: '房租 5月', tags: ['固定'] },
    { account: 'tw', type: 'expense', category: 'utility', amount: 1850, currency: 'TWD', date: d(3), note: '台電 + 水費', tags: ['固定'] },
    { account: 'tw', type: 'expense', category: 'shopping', amount: 3200, currency: 'TWD', date: d(6), note: '誠品書店', tags: [] },
    { account: 'tw', type: 'expense', category: 'subscription', amount: 390, currency: 'TWD', date: d(8), note: 'Spotify Premium', tags: ['訂閱'] },
    { account: 'us', type: 'income', category: 'salary', amount: 4200, currency: 'USD', date: d(5), note: 'Consulting — April', tags: ['Freelance'] },
    { account: 'us', type: 'expense', category: 'food', amount: 18.50, currency: 'USD', date: d(0), note: 'Blue Bottle Coffee', tags: [] },
    { account: 'us', type: 'expense', category: 'food', amount: 64.20, currency: 'USD', date: d(2), note: 'Trader Joe\'s', tags: [] },
    { account: 'us', type: 'expense', category: 'transport', amount: 32.00, currency: 'USD', date: d(1), note: 'Uber to airport', tags: [] },
    { account: 'us', type: 'expense', category: 'subscription', amount: 9.99, currency: 'USD', date: d(7), note: 'Netflix', tags: ['訂閱'] },
    { account: 'us', type: 'expense', category: 'subscription', amount: 20.00, currency: 'USD', date: d(9), note: 'ChatGPT Plus', tags: ['訂閱'] },
    { account: 'us', type: 'expense', category: 'shopping', amount: 156.30, currency: 'USD', date: d(11), note: 'Uniqlo', tags: [] },
    { account: 'shared', type: 'expense', category: 'travel', amount: 4800, currency: 'TWD', date: d(7), note: '東京旅遊 — 住宿訂金', tags: ['旅遊', '日本'] },
    { account: 'shared', type: 'expense', category: 'entertainment', amount: 680, currency: 'TWD', date: d(3), note: '電影 + 爆米花', tags: [] },
    { account: 'shared', type: 'income', category: 'investment', amount: 2400, currency: 'TWD', date: d(10), note: 'ETF 配息', tags: ['被動收入'] },
    // older for charts
    ...Array.from({ length: 24 }, (_, i) => {
      const day = 14 + i;
      const cats = ['food', 'transport', 'shopping', 'food', 'entertainment'];
      const acc = ['tw', 'tw', 'us', 'shared', 'tw'][i % 5];
      const cur = acc === 'us' ? 'USD' : 'TWD';
      const amt = cur === 'USD' ? Math.round((Math.random() * 80 + 5) * 100) / 100 : Math.round(Math.random() * 1500 + 100);
      return {
        account: acc, type: 'expense', category: cats[i % cats.length],
        amount: amt, currency: cur, date: d(day),
        note: ['午餐', '咖啡', '計程車', '雜貨', 'Coffee', 'Lunch'][i % 6], tags: [],
      };
    }),
  ].map((t, i) => ({ ...t, id: 't' + Date.now().toString(36) + i }));

  const budgets = [
    { id: 'b1', category: 'food', limit: 12000, currency: 'TWD', period: 'monthly' },
    { id: 'b2', category: 'transport', limit: 3000, currency: 'TWD', period: 'monthly' },
    { id: 'b3', category: 'entertainment', limit: 2500, currency: 'TWD', period: 'monthly' },
    { id: 'b4', category: 'shopping', limit: 5000, currency: 'TWD', period: 'monthly' },
    { id: 'b5', category: 'subscription', limit: 1500, currency: 'TWD', period: 'monthly' },
  ];

  const recurring = [
    { id: 'r1', account: 'tw', type: 'income', category: 'salary', amount: 65000, currency: 'TWD', label: '月薪', cadence: '每月 5 日', next: '2026-05-05' },
    { id: 'r2', account: 'tw', type: 'expense', category: 'rent', amount: 22000, currency: 'TWD', label: '房租', cadence: '每月 1 日', next: '2026-06-01' },
    { id: 'r3', account: 'us', type: 'expense', category: 'subscription', amount: 9.99, currency: 'USD', label: 'Netflix', cadence: '每月 12 日', next: '2026-05-12' },
    { id: 'r4', account: 'us', type: 'expense', category: 'subscription', amount: 20.00, currency: 'USD', label: 'ChatGPT Plus', cadence: '每月 9 日', next: '2026-05-09' },
    { id: 'r5', account: 'tw', type: 'expense', category: 'subscription', amount: 390, currency: 'TWD', label: 'Spotify', cadence: '每月 8 日', next: '2026-05-08' },
  ];

  const carrier = {
    connected: false,
    code: '',
    autoSync: false,
    lastSync: null,
    syncCount: 0,
  };

  return {
    accounts, transactions: txns, budgets, recurring, fxRate: 31.8, carrier,
    categories: {
      expense: DEFAULT_CATEGORIES.expense.map((c) => ({ ...c })),
      income: DEFAULT_CATEGORIES.income.map((c) => ({ ...c })),
    },
  };
}

function loadState(profileId) {
  const key = profileDataKey(profileId || 'default');
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return seed();
}

function saveState(s, profileId) {
  const key = profileDataKey(profileId || 'default');
  try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {}
}

// ── Hook ──────────────────────────────────────────────────────────────────
function useLedger(profileId) {
  const id = profileId || 'default';
  const [state, setState] = React.useState(() => loadState(id));

  // 切換 profile：重新載入資料
  React.useEffect(() => {
    setState(loadState(id));
  }, [id]);

  React.useEffect(() => { saveState(state, id); }, [state, id]);

  const addTxn = (txn) => setState((s) => ({
    ...s,
    transactions: [{ ...txn, id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }, ...s.transactions],
  }));
  const deleteTxn = (id) => setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  const updateTxn = (id, patch) => setState((s) => ({
    ...s, transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));

  const addAccount = (a) => setState((s) => ({
    ...s,
    accounts: [...s.accounts, { ...a, id: 'a' + Date.now().toString(36) }],
  }));
  const updateAccount = (id, patch) => setState((s) => ({
    ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  }));
  const deleteAccount = (id) => setState((s) => ({
    ...s,
    accounts: s.accounts.filter((a) => a.id !== id),
    transactions: s.transactions.filter((t) => t.account !== id),
  }));

  const transfer = ({ from, to, amount, fromCurrency, toCurrency, date, note }) => {
    const ts = Date.now();
    const id1 = 'tx' + ts.toString(36) + 'a';
    const id2 = 'tx' + ts.toString(36) + 'b';
    const tags = ['轉帳'];
    setState((s) => ({
      ...s,
      transactions: [
        { id: id1, account: from, type: 'transfer-out', category: 'transfer', amount, currency: fromCurrency, date, note: note || `轉至 ${to}`, tags, _pair: id2 },
        { id: id2, account: to, type: 'transfer-in', category: 'transfer', amount, currency: toCurrency, date, note: note || `來自 ${from}`, tags, _pair: id1 },
        ...s.transactions,
      ],
    }));
  };

  const setBudget = (b) => setState((s) => {
    const exists = s.budgets.find((x) => x.category === b.category);
    if (exists) return { ...s, budgets: s.budgets.map((x) => (x.category === b.category ? { ...x, ...b } : x)) };
    return { ...s, budgets: [...s.budgets, { ...b, id: 'b' + Date.now().toString(36) }] };
  });
  const deleteBudget = (id) => setState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) }));

  const setFx = (rate) => setState((s) => ({ ...s, fxRate: rate }));

  const updateCarrier = (patch) => setState((s) => ({
    ...s,
    carrier: { ...(s.carrier || {}), ...patch },
  }));

  // 分類管理
  const addCategory = (type, cat) => setState((s) => {
    const cats = s.categories || { expense: DEFAULT_CATEGORIES.expense, income: DEFAULT_CATEGORIES.income };
    const newCat = { ...cat, id: cat.id || ('c' + Date.now().toString(36)) };
    return { ...s, categories: { ...cats, [type]: [...(cats[type] || []), newCat] } };
  });
  const updateCategory = (type, id, patch) => setState((s) => {
    const cats = s.categories || { expense: DEFAULT_CATEGORIES.expense, income: DEFAULT_CATEGORIES.income };
    return { ...s, categories: { ...cats, [type]: cats[type].map((c) => c.id === id ? { ...c, ...patch } : c) } };
  });
  const deleteCategory = (type, id, migrateTo) => setState((s) => {
    const cats = s.categories || { expense: DEFAULT_CATEGORIES.expense, income: DEFAULT_CATEGORIES.income };
    const target = migrateTo || (type === 'income' ? 'other-income' : 'other');
    return {
      ...s,
      categories: { ...cats, [type]: cats[type].filter((c) => c.id !== id) },
      transactions: s.transactions.map((t) => t.category === id ? { ...t, category: target } : t),
    };
  });

  // 浪費標記
  const markWaste = (id, reason = '') => setState((s) => ({
    ...s,
    transactions: s.transactions.map((t) => t.id === id ? { ...t, waste: true, wasteReason: reason || t.wasteReason || '' } : t),
  }));
  const unmarkWaste = (id) => setState((s) => ({
    ...s,
    transactions: s.transactions.map((t) => t.id === id ? { ...t, waste: false, wasteReason: '' } : t),
  }));
  const reset = () => { localStorage.removeItem(profileDataKey(id)); setState(seed()); };

  return {
    state, setState,
    addTxn, deleteTxn, updateTxn,
    addAccount, updateAccount, deleteAccount,
    transfer,
    setBudget, deleteBudget,
    setFx, reset,
    updateCarrier,
    addCategory, updateCategory, deleteCategory,
    markWaste, unmarkWaste,
  };
}

// ── Currency helpers ──────────────────────────────────────────────────────
function fmtMoney(amount, currency, opts = {}) {
  const n = Number(amount) || 0;
  const sign = opts.sign === false ? '' : (n < 0 ? '−' : '');
  const abs = Math.abs(n);
  const fixed = currency === 'TWD' ? 0 : 2;
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: fixed, maximumFractionDigits: fixed });
  const sym = currency === 'TWD' ? 'NT$' : currency === 'USD' ? '$' : (currency + ' ');
  return sign + sym + str;
}

function convertTo(amount, fromCur, toCur, fxRate) {
  if (fromCur === toCur) return amount;
  if (fromCur === 'USD' && toCur === 'TWD') return amount * fxRate;
  if (fromCur === 'TWD' && toCur === 'USD') return amount / fxRate;
  return amount;
}

function accountBalance(account, transactions, fxRate) {
  const txns = transactions.filter((t) => t.account === account.id);
  let balance = account.opening || 0;
  for (const t of txns) {
    const amt = convertTo(t.amount, t.currency, account.currency, fxRate);
    if (t.type === 'income' || t.type === 'transfer-in') balance += amt;
    else balance -= amt;
  }
  return balance;
}

function findCategory(catId, type) {
  // 優先讀取動態分類（user 自訂後 App 會塞到 window.__categories）
  const dyn = (typeof window !== 'undefined' && window.__categories) || null;
  if (dyn) {
    const list = type === 'income' ? dyn.income : dyn.expense;
    const found = list?.find((c) => c.id === catId);
    if (found) return found;
    // 也檢查另一邊（避免 income/expense 標反）
    const other = type === 'income' ? dyn.expense : dyn.income;
    const otherFound = other?.find((c) => c.id === catId);
    if (otherFound) return otherFound;
  }
  const list = type === 'income' ? DEFAULT_CATEGORIES.income : DEFAULT_CATEGORIES.expense;
  return list.find((c) => c.id === catId) || { id: catId, label: catId, en: catId, icon: '○', color: '#8B8478' };
}

function getCats(type) {
  const dyn = (typeof window !== 'undefined' && window.__categories) || null;
  if (dyn) return type === 'income' ? (dyn.income || []) : (dyn.expense || []);
  return type === 'income' ? DEFAULT_CATEGORIES.income : DEFAULT_CATEGORIES.expense;
}

function findAccount(accs, id) {
  return accs.find((a) => a.id === id) || { id, name: id, currency: 'TWD', color: '#888', icon: '?' };
}

// ── Date helpers ──────────────────────────────────────────────────────────
function ymd(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
function ym(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 7);
}
function relTime(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return diff + ' 天前';
  if (diff < 30) return Math.floor(diff / 7) + ' 週前';
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

Object.assign(window, {
  useLedger, useProfiles, profileDataKey,
  fmtMoney, convertTo, accountBalance,
  findCategory, findAccount, DEFAULT_CATEGORIES, getCats,
  ymd, ym, relTime, seed,
});
