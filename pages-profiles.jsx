// pages-profiles.jsx — 使用者切換與管理

const { useState: useStateP } = React;

function ProfileSwitcher({ profiles, active, onSwitch, onManage }) {
  const [open, setOpen] = useStateP(false);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!e.target.closest('.profile-switcher')) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="profile-switcher" style={{ position: 'relative', marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 12px', borderRadius: 10,
        background: 'var(--bg-card)', border: '1px solid var(--line-soft)',
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
        fontFamily: 'inherit',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: active.color, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--serif)', fontSize: 16,
        }}>{active.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {active.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
            {profiles.length} 位使用者
          </div>
        </div>
        <span style={{ color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--mono)' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50,
          overflow: 'hidden',
        }}>
          {profiles.map((p) => (
            <button key={p.id}
              onClick={() => { onSwitch(p.id); setOpen(false); }}
              style={{
                width: '100%', padding: '10px 12px', border: 'none',
                background: p.id === active.id ? 'var(--bg-sunk)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit',
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: p.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 13,
              }}>{p.icon}</div>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{p.name}</span>
              {p.id === active.id && <span style={{ color: 'var(--positive)', fontSize: 12 }}>✓</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--line-soft)', padding: '6px 0' }}>
            <button onClick={() => { onManage(); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink-3)',
              }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, width: 28, textAlign: 'center' }}>⚙</span>
              管理使用者
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileManager({ profilesHook, onClose }) {
  const { profiles, active, addProfile, updateProfile, deleteProfile, switchProfile } = profilesHook;
  const [editing, setEditing] = useStateP(null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-eyebrow">Profiles · 使用者管理</div>
            <h2 className="font-serif" style={{ fontSize: 24, margin: '6px 0 4px', fontWeight: 500 }}>多使用者本機切換</h2>
            <div className="muted" style={{ fontSize: 12 }}>每位使用者擁有獨立的帳戶、交易、預算與設定</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profiles.map((p) => (
            <div key={p.id} className="card card-pad" style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 14,
              border: p.id === active.id ? '2px solid var(--ink)' : '1px solid var(--line-soft)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: p.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 18,
              }}>{p.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {p.name}
                  {p.id === active.id && <span className="chip" style={{ marginLeft: 8, background: 'var(--positive-soft)', color: 'var(--positive)', borderColor: 'transparent', fontSize: 10.5 }}>使用中</span>}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  建立於 {p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-TW') : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {p.id !== active.id && (
                  <button className="btn btn-sm" onClick={() => { switchProfile(p.id); showToast('已切換到 ' + p.name); onClose(); }}>切換</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>編輯</button>
              </div>
            </div>
          ))}

          <button className="btn" onClick={() => setEditing({ _new: true })} style={{
            padding: 14, justifyContent: 'center', borderStyle: 'dashed',
          }}>
            ＋ 新增使用者
          </button>
        </div>

        <div style={{ padding: 14, borderTop: '1px solid var(--line-soft)', background: 'var(--bg-sunk)' }}>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
            💡 多使用者資料儲存在同一個瀏覽器的 localStorage。換瀏覽器、換裝置不會帶過去。建議在「設定」頁面匯出 JSON 備份。
          </div>
        </div>

        {editing && (
          <ProfileEditor
            profile={editing._new ? null : editing}
            onSave={(data) => {
              if (editing._new) addProfile(data);
              else updateProfile(editing.id, data);
              setEditing(null);
            }}
            onDelete={editing._new ? null : () => {
              if (confirm(`刪除使用者「${editing.name}」？所有相關資料將被永久刪除，無法復原。`)) {
                if (deleteProfile(editing.id)) {
                  showToast('已刪除使用者');
                  setEditing(null);
                }
              }
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onSave, onDelete, onClose }) {
  const [name, setName] = useStateP(profile?.name || '');
  const [color, setColor] = useStateP(profile?.color || '#7A8B5C');
  const [icon, setIcon] = useStateP(profile?.icon || '◇');

  const colors = ['#C66D4A', '#B85C38', '#4A7A8B', '#5E7A8B', '#7A8B5C', '#5E8B6E', '#A35E7A', '#7A6B8B', '#B8895E', '#8B6F47'];
  const icons = ['◐', '◑', '◇', '◈', '◆', '★', '♥', '☘', '☼', '☾', '✦', '⚐', '島', '車', '茶', '我', '家', '心', '夢', '錢'];

  const save = () => {
    if (!name.trim()) { showToast('請輸入名稱'); return; }
    onSave({ name: name.trim(), color, icon });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 110 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="page-eyebrow">{profile ? 'Edit Profile' : 'New Profile'}</div>
          <h2 className="font-serif" style={{ fontSize: 22, margin: '6px 0 0', fontWeight: 500 }}>
            {profile ? '編輯使用者' : '新增使用者'}
          </h2>
        </div>

        {/* 預覽 */}
        <div style={{ padding: 22, background: 'var(--bg-sunk)', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13,
            background: color, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontSize: 22,
            boxShadow: '0 4px 12px ' + color + '40',
          }}>{icon}</div>
          <div>
            <div className="font-serif" style={{ fontSize: 18, fontWeight: 500 }}>{name || '使用者名稱'}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>獨立的記帳資料</div>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <span className="field-label">使用者名稱</span>
            <input className="input" placeholder="例：媽媽、家用、個人帳" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <span className="field-label">代表色</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {colors.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 30, height: 30, borderRadius: 8, background: c, cursor: 'pointer',
                  border: color === c ? '2px solid var(--ink)' : '1px solid var(--line)', padding: 0,
                }} />
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">圖示</span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {icons.map((i) => (
                <button key={i} onClick={() => setIcon(i)} className="btn" style={{
                  width: 36, height: 36, padding: 0, fontFamily: 'var(--serif)', fontSize: 16,
                  background: icon === i ? color : 'var(--bg-card)',
                  color: icon === i ? 'white' : 'var(--ink)',
                  borderColor: icon === i ? color : 'var(--line)',
                }}>{i}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between' }}>
          {onDelete ? (
            <button className="btn btn-ghost" style={{ color: 'var(--negative)' }} onClick={onDelete}>刪除使用者</button>
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

Object.assign(window, { ProfileSwitcher, ProfileManager });
