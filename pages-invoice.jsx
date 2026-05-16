// pages-invoice.jsx — 電子發票匯入主畫面

const { useState: useStateInv } = React;

function InvoicePage({ ledger, onNav }) {
  const { state } = ledger;
  const carrier = state.carrier || { connected: false, autoSync: false, code: '', lastSync: null, syncCount: 0 };
  const [tab, setTab] = useStateInv('import'); // import | analytics
  const [mode, setMode] = useStateInv('scan'); // scan | qr | csv
  const [parsed, setParsed] = useStateInv(null); // 已解析的發票
  const [scanning, setScanning] = useStateInv(false);
  const [qrLeft, setQrLeft] = useStateInv('');
  const [error, setError] = useStateInv('');
  const [linking, setLinking] = useStateInv(false);
  const [syncing, setSyncing] = useStateInv(false);

  // 已匯入的發票號碼（去重用）
  const importedNumbers = useMemoI(() => {
    return new Set(state.transactions.filter((t) => t.invoice).map((t) => t.invoice));
  }, [state.transactions]);

  // 預設帳戶（用於自動匯入）
  const defaultAccount = state.accounts.find((a) => a.region === 'TW')?.id || state.accounts[0]?.id;

  // 手動觸發同步
  const performSync = (silent = false) => {
    return new Promise((resolve) => {
      if (!silent) setSyncing(true);
      setTimeout(() => {
        const pool = DEMO_INVOICES.filter((inv) => !importedNumbers.has(inv.number));
        // 模擬：每次隨機抽 1-3 張新發票
        const count = Math.min(pool.length, Math.floor(Math.random() * 3) + 1);
        const picked = pool.slice(0, count);
        picked.forEach((inv) => importInvoice(ledger, inv, { account: defaultAccount }));
        ledger.updateCarrier({
          lastSync: new Date().toISOString(),
          syncCount: (carrier.syncCount || 0) + picked.length,
        });
        if (!silent) setSyncing(false);
        if (picked.length > 0) {
          showToast('✓ 自動同步 ' + picked.length + ' 張新發票');
        } else if (!silent) {
          showToast('已是最新 · 沒有新發票');
        }
        resolve(picked.length);
      }, silent ? 600 : 1400);
    });
  };

  // 自動同步：每 25 秒檢查一次
  React.useEffect(() => {
    if (!carrier.connected || !carrier.autoSync) return;
    const timer = setInterval(() => performSync(true), 25000);
    return () => clearInterval(timer);
  }, [carrier.connected, carrier.autoSync, state.transactions.length]);

  // 連結載具：模擬掃描手機條碼
  const linkCarrier = () => {
    setLinking(true);
    setTimeout(() => {
      // 隨機產生一組「手機條碼」（真實格式為 / + 7 位英數）
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '/';
      for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
      ledger.updateCarrier({ connected: true, code, autoSync: true, lastSync: new Date().toISOString() });
      setLinking(false);
      showToast('✓ 載具已連結 · 自動同步已開啟');
      // 連結後立刻同步一次
      setTimeout(() => performSync(true), 500);
    }, 1600);
  };

  const unlinkCarrier = () => {
    if (!confirm('解除載具連結？已匯入的發票會保留，但不會再自動同步。')) return;
    ledger.updateCarrier({ connected: false, autoSync: false, code: '' });
    showToast('已解除連結');
  };

  const importedCount = state.transactions.filter((t) => t.invoice).length;
  const importedThisMonth = state.transactions
    .filter((t) => t.invoice && ym(t.date) === ym(new Date()));
  const importedAmount = importedThisMonth.reduce((s, t) => s + t.amount, 0);

  // 模擬掃描
  const startScan = () => {
    setScanning(true);
    setError('');
    setTimeout(() => {
      const pool = DEMO_INVOICES.filter((inv) => !importedNumbers.has(inv.number));
      if (pool.length === 0) {
        setScanning(false);
        setError('所有範例發票都已匯入了，可使用「重置示範資料」再試');
        return;
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setScanning(false);
      setParsed(picked);
    }, 1800);
  };

  const submitQR = () => {
    setError('');
    const r = parseQR(qrLeft);
    if (!r.ok) { setError(r.error); return; }
    if (importedNumbers.has(r.invoice.number)) {
      setError('此發票已匯入過：' + r.invoice.number);
      return;
    }
    setParsed(r.invoice);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    // 模擬：直接吐出尚未匯入的所有 demo 發票供確認
    const pool = DEMO_INVOICES.filter((inv) => !importedNumbers.has(inv.number));
    if (pool.length === 0) { setError('沒有新發票可匯入'); return; }
    showToast('已解析 ' + pool.length + ' 張發票');
    setParsed({ batch: true, invoices: pool });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">e-Invoice · 電子發票</div>
          <h1 className="page-title">自動匯入發票</h1>
          <div className="page-subtitle">掃描 QR · 貼上左右碼 · 匯入財政部 CSV · 自動辨識商家分類</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="page-eyebrow">已匯入 · This month</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, marginTop: 4 }}>
            {importedThisMonth.length} 張 · {fmtMoney(importedAmount, 'TWD', { sign: false })}
          </div>
        </div>
      </div>

      {/* 分頁 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 24, gap: 0 }}>
        <TabButton active={tab === 'import'} onClick={() => setTab('import')} glyph="↥" label="匯入發票" en="Import" />
        <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')} glyph="◍" label="發票分析" en="Analytics"
          badge={importedCount > 0 ? importedCount : null} />
      </div>

      {tab === 'analytics' ? <InvoiceAnalytics ledger={ledger} /> : (
      <React.Fragment>

      {/* 載具連結 hero */}
      <CarrierCard
        carrier={carrier}
        linking={linking}
        syncing={syncing}
        onLink={linkCarrier}
        onUnlink={unlinkCarrier}
        onToggleAuto={(v) => ledger.updateCarrier({ autoSync: v })}
        onSyncNow={() => performSync(false)}
      />

      {/* 三種匯入方式 */}
      <div style={{ marginBottom: 14, padding: '6px 2px' }}>
        <div className="page-eyebrow">Manual Import · 手動匯入方式</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
        <ImportModeCard
          active={mode === 'scan'} onClick={() => { setMode('scan'); setParsed(null); setError(''); }}
          glyph="◱" title="掃描 QR Code" en="Scan QR" desc="使用相機對準發票上的 QR 碼" />
        <ImportModeCard
          active={mode === 'qr'} onClick={() => { setMode('qr'); setParsed(null); setError(''); }}
          glyph="≡" title="輸入發票號碼" en="Enter Code" desc="貼上發票左碼或號碼" />
        <ImportModeCard
          active={mode === 'csv'} onClick={() => { setMode('csv'); setParsed(null); setError(''); }}
          glyph="↥" title="財政部 CSV" en="MOF CSV" desc="從載具歸戶下載的明細檔" />
      </div>

      {/* 主區 */}
      {!parsed && (
        <div className="card" style={{ marginBottom: 16 }}>
          {mode === 'scan' && (
            <div style={{ padding: 36, textAlign: 'center' }}>
              <div style={{
                width: 280, height: 280, margin: '0 auto 24px', position: 'relative',
                background: scanning ? 'linear-gradient(135deg, #1A1612 0%, #2A241D 100%)' : 'var(--bg-sunk)',
                borderRadius: 16, border: '2px dashed var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {scanning && <ScanAnimation />}
                {!scanning && (
                  <div style={{ color: 'var(--ink-4)', fontFamily: 'var(--serif)', fontSize: 80 }}>◱</div>
                )}
              </div>
              <h3 className="font-serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>
                {scanning ? '掃描中…' : '對準發票 QR Code'}
              </h3>
              <p className="muted" style={{ margin: '0 0 20px', fontSize: 13 }}>
                {scanning ? '正在識別發票內容，請稍候' : '系統會自動辨識號碼、商家、品項與金額'}
              </p>
              <button className="btn btn-primary" onClick={startScan} disabled={scanning} style={{ padding: '10px 24px' }}>
                {scanning ? '掃描中…' : '開始掃描（模擬）'}
              </button>
            </div>
          )}

          {mode === 'qr' && (
            <div style={{ padding: 32, maxWidth: 540 }}>
              <h3 className="font-serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>輸入發票號碼</h3>
              <p className="muted" style={{ margin: '0 0 20px', fontSize: 13 }}>
                請輸入發票號碼（例：AB-12345678）。系統會比對財政部資料庫並抓取明細。
              </p>
              <div className="field" style={{ marginBottom: 14 }}>
                <span className="field-label">Invoice Number · 發票號碼</span>
                <input className="input" placeholder="AB-12345678"
                  value={qrLeft} onChange={(e) => setQrLeft(e.target.value)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 16, letterSpacing: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <button className="btn btn-primary" onClick={submitQR}>查詢發票</button>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  範例：{DEMO_INVOICES.slice(0, 3).map((i) => i.number).join(' · ')}
                </span>
              </div>
            </div>
          )}

          {mode === 'csv' && (
            <div style={{ padding: 32, maxWidth: 540 }}>
              <h3 className="font-serif" style={{ fontSize: 20, fontWeight: 500, margin: '0 0 6px' }}>上傳財政部 CSV</h3>
              <p className="muted" style={{ margin: '0 0 20px', fontSize: 13 }}>
                從「財政部電子發票整合服務平台 → 載具歸戶 → 消費明細下載」匯出的 CSV 檔。
              </p>
              <label className="card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 36, cursor: 'pointer', borderStyle: 'dashed', background: 'var(--bg-sunk)',
              }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 48, color: 'var(--ink-4)', marginBottom: 8 }}>↥</div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>拖曳檔案到此或點擊選擇</div>
                <div className="muted" style={{ fontSize: 12 }}>支援 .csv · 最大 10 MB</div>
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
              </label>
              <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                <strong style={{ color: 'var(--ink-2)' }}>提示：</strong>
                建議在「財政部電子發票」App 中將載具歸戶後，每月匯出一次 CSV 即可一次匯入所有發票。
              </div>
            </div>
          )}

          {error && (
            <div style={{ margin: '0 24px 24px', padding: 12, background: 'var(--negative-soft)', color: 'var(--negative)', borderRadius: 8, fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}
        </div>
      )}

      {/* 解析結果 */}
      {parsed && !parsed.batch && (
        <InvoiceConfirm invoice={parsed} ledger={ledger} onCancel={() => setParsed(null)}
          onConfirm={(opts) => { importInvoice(ledger, parsed, opts); setParsed(null); showToast('已匯入 1 張發票'); }} />
      )}
      {parsed && parsed.batch && (
        <BatchImport invoices={parsed.invoices} ledger={ledger} onCancel={() => setParsed(null)}
          onConfirm={(picks, opts) => {
            picks.forEach((inv) => importInvoice(ledger, inv, opts));
            setParsed(null);
            showToast('已匯入 ' + picks.length + ' 張發票');
          }} />
      )}

      {/* 已匯入歷史 */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">匯入紀錄</h3>
            <div className="card-sub" style={{ marginTop: 4 }}>Imported History · 共 {importedCount} 張</div>
          </div>
        </div>
        {importedCount === 0 ? (
          <div className="empty">
            <div className="empty-glyph">◱</div>
            <div>還沒有匯入任何電子發票</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>試試上方掃描或輸入號碼</div>
          </div>
        ) : (
          state.transactions.filter((t) => t.invoice).slice(0, 12).map((t) => (
            <div key={t.id} className="txn-row" style={{ gridTemplateColumns: '36px 1fr auto auto' }}>
              <div className="txn-icon" style={{ background: findCategory(t.category, 'expense').color }}>
                {findCategory(t.category, 'expense').icon}
              </div>
              <div className="txn-main">
                <div className="txn-note">{t.merchant || t.note}</div>
                <div className="txn-meta">
                  <span className="font-mono">{t.invoice}</span>
                  <span className="divider-dot">·</span>
                  <span>{t.date}</span>
                  <span className="divider-dot">·</span>
                  <span>{findCategory(t.category, 'expense').label}</span>
                  {t.itemCount && <><span className="divider-dot">·</span><span>{t.itemCount} 品項</span></>}
                </div>
              </div>
              <div className="txn-amount negative">−{fmtMoney(t.amount, t.currency, { sign: false })}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => { if (confirm('刪除這筆？')) { ledger.deleteTxn(t.id); showToast('已刪除'); } }}>×</button>
            </div>
          ))
        )}
      </div>
      </React.Fragment>
      )}
    </div>
  );
}

function TabButton({ active, onClick, glyph, label, en, badge }) {
  return (
    <button onClick={onClick} style={{
      appearance: 'none', border: 'none', background: 'transparent',
      padding: '14px 22px', cursor: 'pointer',
      borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
      marginBottom: -1,
      display: 'flex', alignItems: 'center', gap: 10,
      color: active ? 'var(--ink)' : 'var(--ink-4)',
      fontFamily: 'inherit',
    }}>
      <span style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{glyph}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>{en}</div>
      </div>
      {badge != null && (
        <span style={{
          background: active ? 'var(--ink)' : 'var(--bg-sunk)',
          color: active ? 'var(--bg-elev)' : 'var(--ink-3)',
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
          padding: '2px 7px', borderRadius: 999, minWidth: 22, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}

function CarrierCard({ carrier, linking, syncing, onLink, onUnlink, onToggleAuto, onSyncNow }) {
  const connected = carrier.connected;
  const lastSyncTime = carrier.lastSync ? new Date(carrier.lastSync) : null;
  const lastSyncRel = lastSyncTime ? (() => {
    const diff = Math.round((Date.now() - lastSyncTime.getTime()) / 1000);
    if (diff < 60) return diff + ' 秒前';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分鐘前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小時前';
    return Math.floor(diff / 86400) + ' 天前';
  })() : '從未';

  if (!connected) {
    return (
      <div className="card" style={{
        marginBottom: 22,
        background: 'linear-gradient(135deg, #2A241D 0%, #1A1612 100%)',
        color: '#F0E8D6',
        border: '1px solid rgba(216, 124, 88, 0.3)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(216,124,88,0.25) 0%, transparent 60%)' }} />
        <div style={{ padding: '26px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 8 }}>
              Auto Sync · 自動同步
            </div>
            <h3 className="font-serif" style={{ fontSize: 26, fontWeight: 500, margin: '0 0 8px', color: '#F0E8D6' }}>
              連結手機條碼載具
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, opacity: 0.7, maxWidth: 540 }}>
              連結你的財政部手機條碼後，每次消費的電子發票會自動同步進記帳系統，無需再手動掃描。
              系統會自動辨識商家分類、防止重複匯入。
            </p>
            <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, opacity: 0.6 }}>
              <span>◆ 即時同步</span>
              <span>◆ 防重複匯入</span>
              <span>◆ 自動分類</span>
              <span>◆ 對獎通知</span>
            </div>
          </div>
          <button className="btn btn-primary"
            onClick={onLink} disabled={linking}
            style={{
              padding: '14px 24px', fontSize: 14,
              background: '#D87C58', borderColor: '#D87C58', color: '#1A1612',
              fontWeight: 600,
            }}>
            {linking ? '⟳ 連結中…' : '＋ 連結載具'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      marginBottom: 22,
      background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elev) 100%)',
      border: '1px solid var(--line)',
    }}>
      <div style={{ padding: '22px 26px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 22, alignItems: 'center' }}>
        {/* 條碼視覺 */}
        <div style={{
          width: 88, height: 88, borderRadius: 12, padding: 10,
          background: 'var(--ink)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative',
        }}>
          <svg width="64" height="44" viewBox="0 0 64 44">
            {Array.from({ length: 24 }).map((_, i) => {
              const w = [1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3][i % 12] * 0.9;
              const x = i * 2.6;
              return <rect key={i} x={x} y={0} width={w} height={44} fill="#F0E8D6" />;
            })}
          </svg>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#F0E8D6', letterSpacing: 1 }}>{carrier.code}</div>
          {(syncing || (carrier.autoSync && !syncing)) && (
            <div style={{
              position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%',
              background: syncing ? '#D87C58' : '#8FAA78',
              boxShadow: '0 0 8px ' + (syncing ? '#D87C58' : '#8FAA78'),
              animation: syncing ? 'pulse 1s ease infinite' : 'none',
            }} />
          )}
        </div>

        {/* 狀態 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="font-serif" style={{ fontSize: 18, fontWeight: 500 }}>手機條碼載具</span>
            <span className="chip" style={{
              background: syncing ? 'var(--accent-soft)' : carrier.autoSync ? 'var(--positive-soft)' : 'var(--bg-sunk)',
              color: syncing ? 'var(--accent)' : carrier.autoSync ? 'var(--positive)' : 'var(--ink-3)',
              borderColor: 'transparent',
            }}>
              {syncing ? '⟳ 同步中' : carrier.autoSync ? '● 自動同步開啟' : '○ 自動同步關閉'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--ink-3)' }}>
            <span><span className="muted">條碼</span> <span className="font-mono" style={{ color: 'var(--ink-2)' }}>{carrier.code}</span></span>
            <span><span className="muted">上次同步</span> <span style={{ color: 'var(--ink-2)' }}>{lastSyncRel}</span></span>
            <span><span className="muted">累計</span> <span style={{ color: 'var(--ink-2)' }}>{carrier.syncCount || 0} 張</span></span>
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
            {carrier.autoSync ? '系統每 25 秒檢查一次新發票，並自動匯入' : '已停用自動同步，可手動按右側按鈕同步'}
          </div>
        </div>

        {/* 控制 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <button className="btn btn-primary" onClick={onSyncNow} disabled={syncing} style={{ minWidth: 130, justifyContent: 'center' }}>
            {syncing ? '⟳ 同步中…' : '↻ 立即同步'}
          </button>
          <label className="btn" style={{ minWidth: 130, justifyContent: 'center', cursor: 'pointer', gap: 8 }}>
            <input type="checkbox" checked={!!carrier.autoSync} onChange={(e) => onToggleAuto(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 12 }}>自動同步</span>
          </label>
          <button className="btn btn-ghost btn-sm" onClick={onUnlink} style={{ color: 'var(--ink-4)' }}>
            解除連結
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
}

function ImportModeCard({ active, onClick, glyph, title, en, desc }) {  return (
    <button className="card" onClick={onClick} style={{
      cursor: 'pointer', padding: 22, textAlign: 'left',
      border: active ? '2px solid var(--ink)' : '1px solid var(--line-soft)',
      background: active ? 'var(--bg-elev)' : 'var(--bg-card)',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: active ? 'var(--ink)' : 'var(--bg-sunk)',
          color: active ? 'var(--bg-elev)' : 'var(--ink-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontSize: 22,
        }}>{glyph}</div>
        <div style={{ flex: 1 }}>
          <div className="font-serif" style={{ fontSize: 16, fontWeight: 500 }}>{title}</div>
          <div className="muted" style={{ fontSize: 11.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{en}</div>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>{desc}</div>
    </button>
  );
}

function ScanAnimation() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ opacity: 0.7 }}>
        {/* QR 框角 */}
        {[[10, 10], [150, 10], [10, 150]].map(([x, y], i) => (
          <g key={i} stroke="white" strokeWidth="3" fill="none">
            <path d={`M ${x} ${y + 24} L ${x} ${y} L ${x + 24} ${y}`} />
          </g>
        ))}
        {/* QR 點陣模擬 */}
        <g fill="white" opacity="0.5">
          {Array.from({ length: 64 }).map((_, i) => (
            <rect key={i} x={40 + (i % 8) * 12} y={40 + Math.floor(i / 8) * 12}
              width={Math.random() > 0.4 ? 8 : 0} height={8} />
          ))}
        </g>
        {/* 掃描線 */}
        <line x1="20" x2="160" stroke="#D87C58" strokeWidth="2">
          <animate attributeName="y1" values="20;160;20" dur="2s" repeatCount="indefinite" />
          <animate attributeName="y2" values="20;160;20" dur="2s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

// 確認單張發票
function InvoiceConfirm({ invoice, ledger, onCancel, onConfirm }) {
  const guess = guessCategory(invoice.merchant);
  const [category, setCategory] = useStateI(guess.category);
  const [account, setAccount] = useStateI(ledger.state.accounts.find((a) => a.region === 'TW')?.id || ledger.state.accounts[0]?.id);

  return (
    <div className="card" style={{ marginBottom: 16, border: '2px solid var(--ink)' }}>
      <div className="card-head" style={{ background: 'var(--ink)', color: 'var(--bg-elev)', borderRadius: '12px 12px 0 0' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>Parsed · 已解析</div>
          <h3 className="font-serif" style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 500 }}>{invoice.merchant}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-mono" style={{ fontSize: 13, opacity: 0.6 }}>{invoice.number}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500 }}>NT${invoice.amount.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
        {/* 明細 */}
        <div style={{ padding: 22, borderRight: '1px solid var(--line-soft)' }}>
          <div className="page-eyebrow" style={{ marginBottom: 10 }}>Items · 品項</div>
          {invoice.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line-soft)', fontSize: 13 }}>
              <span>{item.name} {item.qty > 1 && <span className="muted">×{item.qty}</span>}</span>
              <span className="font-mono">${(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 500 }}>
            <span>合計</span>
            <span className="font-mono">NT${invoice.amount.toLocaleString()}</span>
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
            統一編號 {invoice.taxId} · {invoice.date} {invoice.time}
          </div>
        </div>

        {/* 設定 */}
        <div style={{ padding: 22 }}>
          <div className="field" style={{ marginBottom: 18 }}>
            <span className="field-label">記入帳戶</span>
            <select className="select" value={account} onChange={(e) => setAccount(e.target.value)}>
              {ledger.state.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <span className="field-label">分類 {guess.hint && <span style={{ color: 'var(--positive)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', marginLeft: 6 }}>· 已自動辨識：{guess.hint}</span>}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {DEFAULT_CATEGORIES.expense.slice(0, 8).map((c) => (
                <button key={c.id} className="btn" onClick={() => setCategory(c.id)} style={{
                  padding: '8px 10px', justifyContent: 'flex-start',
                  borderColor: category === c.id ? c.color : 'var(--line)',
                  background: category === c.id ? c.color + '18' : 'var(--bg-card)',
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: c.color, color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 11, marginRight: 4 }}>{c.icon}</span>
                  <span style={{ fontSize: 12 }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onCancel}>取消</button>
            <button className="btn btn-primary" onClick={() => onConfirm({ category, account })}>確認匯入</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 批次匯入
function BatchImport({ invoices, ledger, onCancel, onConfirm }) {
  const [picks, setPicks] = useStateI(new Set(invoices.map((i) => i.number)));
  const [account, setAccount] = useStateI(ledger.state.accounts.find((a) => a.region === 'TW')?.id || ledger.state.accounts[0]?.id);
  const toggle = (num) => {
    const next = new Set(picks);
    if (next.has(num)) next.delete(num); else next.add(num);
    setPicks(next);
  };
  const total = invoices.filter((i) => picks.has(i.number)).reduce((s, i) => s + i.amount, 0);
  return (
    <div className="card" style={{ marginBottom: 16, border: '2px solid var(--ink)' }}>
      <div className="card-head" style={{ background: 'var(--ink)', color: 'var(--bg-elev)', borderRadius: '12px 12px 0 0' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>CSV Parsed · 批次匯入</div>
          <h3 className="font-serif" style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 500 }}>共 {invoices.length} 張發票</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, opacity: 0.6 }}>已選 {picks.size} 張</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 500 }}>NT${total.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="field-label" style={{ marginBottom: 0 }}>記入帳戶</span>
        <select className="select" value={account} onChange={(e) => setAccount(e.target.value)} style={{ flex: 1, maxWidth: 280 }}>
          {ledger.state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => setPicks(new Set(invoices.map((i) => i.number)))}>全選</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setPicks(new Set())}>全不選</button>
      </div>
      {invoices.map((inv) => {
        const guess = guessCategory(inv.merchant);
        const cat = findCategory(guess.category, 'expense');
        const checked = picks.has(inv.number);
        return (
          <label key={inv.number} className="txn-row" style={{ gridTemplateColumns: '24px 36px 1fr auto', cursor: 'pointer', opacity: checked ? 1 : 0.5 }}>
            <input type="checkbox" checked={checked} onChange={() => toggle(inv.number)} style={{ accentColor: 'var(--ink)' }} />
            <div className="txn-icon" style={{ background: cat.color }}>{cat.icon}</div>
            <div className="txn-main">
              <div className="txn-note">{inv.merchant}</div>
              <div className="txn-meta">
                <span className="font-mono">{inv.number}</span>
                <span className="divider-dot">·</span>
                <span>{inv.date}</span>
                <span className="divider-dot">·</span>
                <span>{inv.items.length} 品項</span>
                {guess.hint && <><span className="divider-dot">·</span><span style={{ color: 'var(--positive)' }}>↳ {cat.label}</span></>}
              </div>
            </div>
            <div className="txn-amount negative">−NT${inv.amount.toLocaleString()}</div>
          </label>
        );
      })}
      <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>取消</button>
        <button className="btn btn-primary" onClick={() => onConfirm(invoices.filter((i) => picks.has(i.number)), { account })} disabled={picks.size === 0}>
          匯入 {picks.size} 張
        </button>
      </div>
    </div>
  );
}

function importInvoice(ledger, invoice, opts) {
  const guess = guessCategory(invoice.merchant);
  ledger.addTxn({
    type: 'expense',
    account: opts.account,
    currency: 'TWD',
    amount: invoice.amount,
    category: opts.category || guess.category,
    date: invoice.date,
    time: invoice.time,
    note: invoice.merchant,
    merchant: invoice.merchant,
    invoice: invoice.number,
    taxId: invoice.taxId,
    itemCount: invoice.items.length,
    items: invoice.items,
    tags: ['電子發票'],
  });
}

Object.assign(window, { InvoicePage });
