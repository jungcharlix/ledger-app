// pages-invoice.jsx — 台灣電子發票自動匯入

const { useState: useStateI, useMemo: useMemoI } = React;

// ── 商家自動分類字典 ──
const MERCHANT_RULES = [
  { match: /7-?eleven|統一超商|7-11|seven/i, cat: 'food', note: '便利商店' },
  { match: /全家|family\s?mart/i, cat: 'food', note: '便利商店' },
  { match: /萊爾富|hi-?life/i, cat: 'food', note: '便利商店' },
  { match: /ok\s?mart/i, cat: 'food', note: '便利商店' },
  { match: /全聯|pxmart/i, cat: 'food', note: '超市' },
  { match: /家樂福|carrefour/i, cat: 'food', note: '量販' },
  { match: /好市多|costco/i, cat: 'shopping', note: '量販' },
  { match: /中油|台塑|加油站/i, cat: 'transport', note: '加油' },
  { match: /高鐵|台鐵|捷運|悠遊卡|一卡通/i, cat: 'transport', note: '大眾運輸' },
  { match: /uber|計程車|台灣大車隊/i, cat: 'transport', note: '叫車' },
  { match: /鼎泰豐|麥當勞|肯德基|星巴克|路易莎|cama/i, cat: 'food', note: '餐廳/咖啡' },
  { match: /誠品|博客來|墊腳石/i, cat: 'shopping', note: '書店' },
  { match: /momo|蝦皮|pchome|露天/i, cat: 'shopping', note: '網購' },
  { match: /uniqlo|zara|h&m|gu|net/i, cat: 'shopping', note: '服飾' },
  { match: /威秀|秀泰|in89|喜滿客/i, cat: 'entertainment', note: '電影' },
  { match: /台電|自來水|中華電信|台灣大|遠傳/i, cat: 'utility', note: '帳單' },
  { match: /診所|醫院|藥局|屈臣氏|康是美|cosmed/i, cat: 'health', note: '醫療/藥妝' },
];

function guessCategory(merchant) {
  for (const r of MERCHANT_RULES) {
    if (r.match.test(merchant)) return { category: r.cat, hint: r.note };
  }
  return { category: 'other', hint: null };
}

// ── 假設性發票範本（demo data）──
const DEMO_INVOICES = [
  {
    number: 'AB-12345678', merchant: '統一超商 永和店', taxId: '03540099',
    date: '2026-05-09', time: '08:42', amount: 156,
    items: [
      { name: '思樂冰大杯', qty: 1, price: 35 },
      { name: '茶葉蛋', qty: 2, price: 26 },
      { name: '御飯糰 鮪魚', qty: 1, price: 45 },
      { name: '光泉鮮乳 250ml', qty: 1, price: 24 },
    ],
  },
  {
    number: 'CD-87654321', merchant: '全聯福利中心 中山店', taxId: '77419348',
    date: '2026-05-08', time: '19:23', amount: 1247,
    items: [
      { name: '雞蛋 10入', qty: 2, price: 89 },
      { name: '吐司 全麥', qty: 1, price: 65 },
      { name: '牛奶 統一鮮乳 1L', qty: 2, price: 95 },
      { name: '蘋果 富士', qty: 1, price: 199 },
      { name: '雞胸肉', qty: 1, price: 148 },
      { name: '青菜 高麗菜', qty: 1, price: 79 },
      { name: '洗衣精補充包', qty: 1, price: 289 },
    ],
  },
  {
    number: 'EF-22334455', merchant: '台灣中油 信義站', taxId: '03707901',
    date: '2026-05-07', time: '17:08', amount: 1800,
    items: [{ name: '92無鉛汽油 60公升', qty: 1, price: 1800 }],
  },
  {
    number: 'GH-99887766', merchant: '鼎泰豐 信義店', taxId: '22555105',
    date: '2026-05-06', time: '12:34', amount: 2560,
    items: [
      { name: '小籠包 10顆', qty: 1, price: 280 },
      { name: '蝦肉小籠包', qty: 1, price: 320 },
      { name: '蛋炒飯', qty: 1, price: 220 },
      { name: '酸辣湯', qty: 2, price: 120 },
      { name: '空心菜', qty: 1, price: 180 },
      { name: '茶資/服務費', qty: 1, price: 320 },
    ],
  },
  {
    number: 'IJ-11223344', merchant: '誠品書店 信義店', taxId: '03244509',
    date: '2026-05-05', time: '15:12', amount: 890,
    items: [
      { name: '原子習慣', qty: 1, price: 380 },
      { name: '雜誌 BRUTUS', qty: 1, price: 420 },
      { name: '明信片 ×2', qty: 2, price: 45 },
    ],
  },
  {
    number: 'KL-55667788', merchant: '星巴克 微風南山店', taxId: '12345678',
    date: '2026-05-09', time: '10:15', amount: 285,
    items: [
      { name: '美式咖啡 大杯', qty: 1, price: 130 },
      { name: '可頌', qty: 1, price: 75 },
      { name: '優格 蜂蜜', qty: 1, price: 80 },
    ],
  },
  // 自動同步「新發現」用 — 起始不會出現在已匯入紀錄
  { number: 'MN-44556677', merchant: '全家便利商店 復興店', taxId: '22099131',
    date: '2026-05-12', time: '07:38', amount: 95,
    items: [{ name: 'Let\'s Café 大杯拿鐵', qty: 1, price: 55 }, { name: '麵包 紅豆', qty: 1, price: 40 }] },
  { number: 'OP-33445566', merchant: 'Uniqlo 信義店', taxId: '24531037',
    date: '2026-05-13', time: '14:22', amount: 1490,
    items: [{ name: 'AIRism T-Shirt', qty: 2, price: 590 }, { name: '休閒褲', qty: 1, price: 990 }, { name: '會員折扣', qty: 1, price: -680 }] },
  { number: 'QR-77889900', merchant: '威秀影城 信義店', taxId: '12677001',
    date: '2026-05-13', time: '20:45', amount: 680,
    items: [{ name: '電影票 ×2', qty: 2, price: 280 }, { name: '爆米花套餐', qty: 1, price: 120 }] },
  { number: 'ST-66554433', merchant: '路易莎咖啡 南港店', taxId: '54321098',
    date: '2026-05-14', time: '09:20', amount: 165,
    items: [{ name: '冰拿鐵 大杯', qty: 1, price: 85 }, { name: '貝果 燻雞', qty: 1, price: 80 }] },
  { number: 'UV-22113344', merchant: '中華電信 內湖服務中心', taxId: '03657101',
    date: '2026-05-15', time: '10:00', amount: 1399,
    items: [{ name: '4G 月租費 5/15-6/14', qty: 1, price: 1399 }] },
];

// ── QR 內容解析（簡化模擬，真實格式為 "AB12345678..." 編碼）──
function parseQR(left, right) {
  // demo: 接受 "AB-12345678" 或 "AB12345678" 兩種寫法
  const code = (left || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const normalized = code.replace('-', '');
  const found = DEMO_INVOICES.find((inv) => inv.number.replace('-', '') === normalized);
  if (found) return { ok: true, invoice: found };
  return { ok: false, error: '查無此發票號碼。請使用範例：' + DEMO_INVOICES.slice(0, 2).map((i) => i.number).join('、') };
}

Object.assign(window, { DEMO_INVOICES, MERCHANT_RULES, guessCategory, parseQR, parseMOFCSV });

// ── 解析財政部 CSV ──
// 支援格式：
//   標頭含「發票號碼」「總金額」「商店店名」等欄位
//   逗號分隔，行尾 \r\n 或 \n
function parseMOFCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // 偵測 delimiter
  const delim = lines[0].includes('\t') ? '\t' : ',';

  // 解析標頭：找關鍵欄位的索引
  const headers = parseCSVLine(lines[0], delim).map((h) => h.trim().replace(/^"|"$/g, ''));
  const findCol = (...keywords) => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (keywords.some((kw) => h.includes(kw))) return i;
    }
    return -1;
  };
  const idx = {
    date: findCol('發票日期', '日期', '消費日期'),
    merchant: findCol('店名', '商家', '商店'),
    taxId: findCol('統編', '統一編號'),
    number: findCol('發票號碼', '號碼'),
    amount: findCol('總金額', '金額', '消費金額'),
    status: findCol('狀態'),
  };

  if (idx.number === -1 || idx.amount === -1) return [];

  const invoices = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delim);
    const number = (cols[idx.number] || '').trim().replace(/[^A-Z0-9-]/g, '');
    if (!number || number.length < 8) continue;
    const amount = parseFloat((cols[idx.amount] || '0').replace(/[",]/g, ''));
    if (!amount || isNaN(amount)) continue;
    const dateRaw = (cols[idx.date] || '').trim();
    const date = normalizeDate(dateRaw);
    const merchant = (cols[idx.merchant] || '').trim();
    const taxId = idx.taxId >= 0 ? (cols[idx.taxId] || '').trim() : '';

    // 嘗試把 8 位連號發票號碼格式化為 AB-12345678
    let invNum = number;
    if (/^[A-Z]{2}\d{8}$/.test(number)) invNum = number.slice(0, 2) + '-' + number.slice(2);

    invoices.push({
      number: invNum, merchant, taxId, date, time: '12:00',
      amount, items: [{ name: merchant + ' 消費', qty: 1, price: amount }],
    });
  }
  return invoices;
}

function parseCSVLine(line, delim = ',') {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === delim && !inQuote) {
      result.push(cur); cur = '';
    } else { cur += c; }
  }
  result.push(cur);
  return result.map((s) => s.replace(/^"|"$/g, ''));
}

function normalizeDate(raw) {
  if (!raw) return ymd(new Date());
  // 2026/05/12 or 2026-05-12 or 1140512 (民國年)
  raw = raw.trim();
  if (/^\d{7}$/.test(raw)) {
    // 民國年 YYYMMDD
    const y = parseInt(raw.slice(0, 3), 10) + 1911;
    return `${y}-${raw.slice(3, 5)}-${raw.slice(5, 7)}`;
  }
  if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/.test(raw)) {
    const [y, m, d] = raw.split(/[\/-]/);
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return raw;
}
