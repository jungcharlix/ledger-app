# 記帳 · Ledger

一個溫暖質感的個人記帳網頁，支援多帳戶、多幣別、電子發票自動匯入與深度分析。

> 純前端 SPA，無需後端、無需資料庫，所有資料儲存在瀏覽器 localStorage。

![type: prototype](https://img.shields.io/badge/type-prototype-c66d4a) ![stack: React](https://img.shields.io/badge/stack-React%2018-7a8b5c) ![lang: zh--TW](https://img.shields.io/badge/lang-zh--TW-8b6f47)

---

## ✨ 功能

### 核心
- **多帳戶** — 預設台灣 (TWD)、美國 (USD)、通用（雙幣顯示）；可自由新增、編輯、刪除
- **多幣別** — 跨幣別交易自動換算，匯率可調整
- **完整 CRUD** — 新增 / 刪除 / 篩選 / 搜尋交易；即時更新餘額
- **帳戶轉帳** — 跨幣別自動換算
- **資料持久化** — 全部存於 localStorage

### 報告與分析
- **總覽 Dashboard** — 餘額、本月收支、近 7 日趨勢
- **分類圓餅圖、收支長條圖、餘額折線圖**
- **預算進度條** — >80% 黃色提醒、>100% 紅色警示
- **CSV 匯出**

### 🧾 電子發票自動匯入
- **掃描 QR Code**（模擬相機）
- **輸入發票號碼**（左碼解析）
- **財政部 CSV 批次匯入**
- **手機條碼載具連結** — 連結後每 25 秒自動同步新發票
- **商家自動分類辨識**（7-11、全聯、中油、星巴克、誠品⋯）
- **防重複匯入**

### 📊 發票分析儀表板
- KPI：張數 / 累計金額 / 平均單筆 / 最大單筆 / 支出覆蓋率
- 智慧洞察（最常光顧商家、最捨得花的時段、週末 vs 平日⋯）
- 商家排行、品項排行（品項名稱自動正規化合併）
- 消費時段（早午晚夜）、星期分佈
- 商家統計表（次數、總額、平均、占比）

### 🎨 Tweaks 面板
- 深色 / 淺色模式
- 主色 Hue 調整（0–360°）
- 襯線標題開關
- 圓角、密度、換算金額顯示

---

## 🚀 部署到 GitHub Pages

### 方法 A — Web 介面
1. 在 GitHub 建一個新 repo（例如 `ledger`）
2. 解壓 zip → 拖曳所有檔案到 repo 上傳
3. 進入 repo → **Settings** → **Pages**
4. **Source** 選 `Deploy from a branch`
5. **Branch** 選 `main` / `(root)` → **Save**
6. 等 1 分鐘左右，網址會出現在頁面上方
7. 訪問 `https://你的帳號.github.io/ledger/` 即可

### 方法 B — 命令列
```bash
cd 解壓目錄
git init
git add .
git commit -m "Initial commit: 記帳 App"
git branch -M main
git remote add origin https://github.com/你的帳號/ledger.git
git push -u origin main

# 然後到 GitHub Settings → Pages 啟用
```

---

## 📁 檔案結構

```
.
├── index.html                      # GitHub Pages 預設入口
├── 記帳.html                       # 應用主檔（內容與 index.html 相同）
├── styles.css                      # 全站樣式 + CSS Variables 主題
├── store.jsx                       # 資料層（帳戶、交易、預算、載具）
├── charts.jsx                      # SVG 圖表（圓餅、長條、折線）
├── tweaks-panel.jsx                # Tweaks 控制面板
├── pages-dashboard.jsx             # 總覽頁
├── pages-transactions.jsx          # 交易列表 + 新增 + 轉帳
├── pages-accounts-reports.jsx      # 帳戶、帳戶詳情、報告、預算、設定
├── pages-invoice.jsx               # 電子發票匯入主畫面
├── pages-invoice-data.jsx          # 範例發票 + 商家分類字典
└── pages-invoice-analytics.jsx     # 發票分析儀表板
```

---

## 🛠️ 技術

- React 18 + Babel Standalone（無建置流程）
- 純 SVG 圖表（無第三方圖表庫）
- CSS Variables 主題系統（light / dark）
- localStorage 持久化

---

## 📝 重置資料

設定頁有「重置示範資料」與「清空所有資料」兩個按鈕。
或瀏覽器 DevTools → Application → Local Storage → 刪除 `ledger.v1`。

---

## 📜 License

MIT — 自由使用與修改
