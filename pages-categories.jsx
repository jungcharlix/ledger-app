// pages-categories.jsx — 自訂分類管理

const { useState: useStateCat } = React;

// 豐富圖示庫
const ICON_LIBRARY = [
  // 符號類
  '◐', '◑', '◒', '◓', '◇', '◈', '◆', '◊', '○', '◉', '●', '◌', '◍',
  '◎', '◯', '◖', '◗', '▢', '▣', '▤', '▥', '▦', '▧', '▨', '▩', '▪', '▫',
  '★', '☆', '✦', '✧', '✪', '✫', '✬', '❋', '❉', '❊', '❀', '✿',
  '♠', '♣', '♥', '♦', '♪', '♫', '♬', '☼', '☽', '☾',
  // 箭頭
  '↗', '↘', '↙', '↖', '↑', '↓', '←', '→', '↻', '↺', '⇄', '⇅', '⇆',
  // 功能/物件
  '✈', '⌂', '⌘', '⚐', '⚑', '⚓', '⌛', '⌚', '☂', '☕', '✄', '✉', '⚙',
  '✚', '⚕', '☘', '⚘', '⚛', '⚜', '⚡', '☁', '☀', '❄',
  // 中文字符
  '島', '車', '食', '住', '電', '錢', '書', '愛', '樂', '心', '茶', '酒', '夢',
  '工', '醫', '寵', '禮', '行', '休', '學', '美',
];

const COLOR_PRESETS = [
  '#C66D4A', '#B85C38', '#D87C58', '#E2A36F',
  '#A35E7A', '#7A6B8B', '#5E6A8B', '#4A7A8B',
  '#5E8B7A', '#7A8B5C', '#8FAA78', '#A8B580',
  '#B8895E', '#8B6F47', '#756547', '#5E4A3A',
  '#6B7B8C', '#8B8478', '#9B8C6E', '#D4A659',
];

function CategoriesPage({ ledger }) {
  const { state } = ledger;
  const categories = state.categories || { expense: DEFAULT_CATEGORIES.expense, income: DEFAULT_CATEGORIES.income };
  const [editing, setEditing] = useStateCat(null); // { type, id?: string }
  const [activeType, setActiveType] = useStateCat('expense');

  const usage = (catId) => state.transactions.filter((t) => t.category === catId).length;
  const totalUsage = (catId) => state.transactions
    .filter((t) => t.category === catId)
    .reduce((s, t) => s + convertTo(t.amount, t.currency, 'TWD', state.fxRate), 0);

  const list = categories[activeType] || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Categories · 分類管理</div>
          <h1 className="page-title">分類管理</h1>
          <div className="page-subtitle">自訂顏色、圖示與名稱 · 變動會即時套用到所有圖表</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ type: activeType })}>＋ 新增分類</button>
      </div>

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={'seg-btn ' + (activeType === 'expense' ? 'active' : '')} onClick={() => setActiveType('expense')}>
          支出 · Expense ({categories.expense?.length || 0})
        </button>
        <button className={'seg-btn ' + (activeType === 'income' ? 'active' : '')} onClick={() => setActiveType('income')}>
          收入 · Income ({categories.income?.length || 0})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {list.map((c) => {
          const n = usage(c.id);
          const total = totalUsage(c.id);
          return (
            <div key={c.id} className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: c.color }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, marginTop: 6 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: c.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 22,
                }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{c.label}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{c.en || '—'}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ type: activeType, id: c.id })}>✎</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 12 }}>
                <span className="muted">使用 <strong style={{ color: 'var(--ink-2)' }}>{n}</strong> 次</span>
                <span className="font-mono" style={{ color: 'var(--ink-3)' }}>{fmtMoney(total, 'TWD', { sign: false })}</span>
              </div>
            </div>
          );
        })}
        <button className="card card-pad" onClick={() => setEditing({ type: activeType })} style={{
          minHeight: 140, border: '1px dashed var(--line)', background: 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-4)', cursor: 'pointer', gap: 4,
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 32 }}>＋</div>
          <div style={{ fontSize: 13 }}>新增 {activeType === 'expense' ? '支出' : '收入'} 分類</div>
        </button>
      </div>

      {editing && (
        <CategoryEditor
          ledger={ledger}
          type={editing.type}
          categoryId={editing.id}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CategoryEditor({ ledger, type, categoryId, onClose }) {
  const cats = ledger.state.categories || { expense: DEFAULT_CATEGORIES.expense, income: DEFAULT_CATEGORIES.income };
  const existing = categoryId ? cats[type].find((c) => c.id === categoryId) : null;

  const [label, setLabel] = useStateCat(existing?.label || '');
  const [en, setEn] = useStateCat(existing?.en || '');
  const [color, setColor] = useStateCat(existing?.color || COLOR_PRESETS[0]);
  const [icon, setIcon] = useStateCat(existing?.icon || '◇');
  const [iconInput, setIconInput] = useStateCat('');

  // HSL 拆解便於微調
  const hsl = hexToHSL(color);
  const setHSL = (h, s, l) => setColor(hslToHex(h, s, l));

  const usage = existing ? ledger.state.transactions.filter((t) => t.category === categoryId).length : 0;

  const save = () => {
    if (!label.trim()) { showToast('請輸入名稱'); return; }
    const data = { label: label.trim(), en: en.trim(), color, icon };
    if (categoryId) {
      ledger.updateCategory(type, categoryId, data);
      showToast('已更新');
    } else {
      ledger.addCategory(type, data);
      showToast('已新增分類');
    }
    onClose();
  };

  const remove = () => {
    if (usage > 0) {
      if (!confirm(`此分類有 ${usage} 筆交易使用中。刪除後會將這些交易轉到「其他」分類，確定？`)) return;
    } else {
      if (!confirm('確定刪除這個分類？')) return;
    }
    ledger.deleteCategory(type, categoryId);
    showToast('已刪除');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="page-eyebrow">{categoryId ? 'Edit Category' : 'New Category'}</div>
          <h2 className="font-serif" style={{ fontSize: 26, margin: '6px 0 0', fontWeight: 500 }}>
            {categoryId ? '編輯分類' : '新增分類'}
          </h2>
        </div>

        {/* 預覽 */}
        <div style={{ padding: 20, background: 'var(--bg-sunk)', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: color, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontSize: 26,
            boxShadow: '0 4px 12px ' + color + '40',
          }}>{icon}</div>
          <div>
            <div className="font-serif" style={{ fontSize: 18, fontWeight: 500 }}>{label || '分類名稱'}</div>
            <div className="muted" style={{ fontSize: 12 }}>{en || 'Category name'} · {color.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <span className="field-label">名稱</span>
              <input className="input" placeholder="例：寵物" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <span className="field-label">英文 / 副標</span>
              <input className="input" placeholder="Pets" value={en} onChange={(e) => setEn(e.target.value)} />
            </div>
          </div>

          {/* 顏色 */}
          <div className="field">
            <span className="field-label">顏色 · Color</span>
            {/* HSL Sliders */}
            <div style={{ padding: 14, background: 'var(--bg-sunk)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <HSLSlider label="色相 H" value={hsl.h} max={360} suffix="°"
                grad={`linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`}
                onChange={(v) => setHSL(v, hsl.s, hsl.l)} />
              <HSLSlider label="飽和度 S" value={hsl.s} max={100} suffix="%"
                grad={`linear-gradient(to right, hsl(${hsl.h}, 0%, ${hsl.l}%), hsl(${hsl.h}, 100%, ${hsl.l}%))`}
                onChange={(v) => setHSL(hsl.h, v, hsl.l)} />
              <HSLSlider label="亮度 L" value={hsl.l} max={100} suffix="%"
                grad={`linear-gradient(to right, #000, hsl(${hsl.h}, ${hsl.s}%, 50%), #fff)`}
                onChange={(v) => setHSL(hsl.h, hsl.s, v)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <input className="input" type="text" value={color}
                  onChange={(e) => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setColor(e.target.value); else setColor(e.target.value); }}
                  style={{ fontFamily: 'var(--mono)', flex: 1, textTransform: 'uppercase' }} />
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  style={{ width: 38, height: 38, border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }} />
              </div>
            </div>
            {/* 預設色 */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {COLOR_PRESETS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 26, height: 26, borderRadius: 7, background: c, cursor: 'pointer',
                  border: color.toLowerCase() === c.toLowerCase() ? '2px solid var(--ink)' : '1px solid var(--line)',
                  padding: 0,
                }} title={c} />
              ))}
            </div>
          </div>

          {/* 圖示 */}
          <div className="field">
            <span className="field-label">圖示 · Icon</span>
            <div style={{ padding: 14, background: 'var(--bg-sunk)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="貼上任何符號 / emoji / 文字" value={iconInput}
                  onChange={(e) => setIconInput(e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--serif)' }} />
                <button className="btn" onClick={() => {
                  const chars = Array.from(iconInput.trim());
                  if (chars.length > 0) { setIcon(chars[0]); setIconInput(''); }
                }}>套用</button>
              </div>
              <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>從圖示庫選擇 · 共 {ICON_LIBRARY.length} 個</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                {ICON_LIBRARY.map((i, idx) => (
                  <button key={i + idx} onClick={() => setIcon(i)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 6,
                    background: icon === i ? color : 'var(--bg-card)',
                    color: icon === i ? 'white' : 'var(--ink-2)',
                    border: icon === i ? '2px solid ' + color : '1px solid var(--line-soft)',
                    fontFamily: 'var(--serif)', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}>{i}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {categoryId ? (
            <button className="btn btn-ghost" style={{ color: 'var(--negative)' }} onClick={remove}>
              刪除分類 {usage > 0 && <span style={{ fontSize: 11, marginLeft: 4 }}>({usage} 筆使用中)</span>}
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={onClose}>取消</button>
            <button className="btn btn-primary" onClick={save}>儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HSLSlider({ label, value, max, suffix, grad, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
        <span>{label}</span>
        <span className="font-mono">{Math.round(value)}{suffix}</span>
      </div>
      <div style={{ position: 'relative', height: 12, borderRadius: 6, background: grad, overflow: 'hidden' }}>
        <input type="range" min="0" max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer',
        }} />
        <div style={{
          position: 'absolute', top: -2, height: 16, width: 4, borderRadius: 2,
          background: 'white', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          left: `calc(${(value / max) * 100}% - 2px)`, pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

// ── 顏色工具 ──
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

Object.assign(window, { CategoriesPage });
