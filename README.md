# 記帳 · Ledger

一個溫暖質感的個人記帳網頁 · 支援多帳戶、多幣別、電子發票自動匯入與深度分析。

## 🌐 線上使用

**👉 [https://你的帳號.github.io/ledger/](https://你的帳號.github.io/ledger/)**

> 推到 GitHub 後，把上方網址改成你自己的 Pages URL。

開啟即用，無需註冊。所有資料儲存在你的瀏覽器，不會上傳到任何伺服器。

---

## ✨ 功能

- 🏦 **多帳戶多幣別** — 台灣 (TWD)、美國 (USD)、通用（雙幣顯示），匯率自動換算
- 💸 **完整記帳** — 新增 / 刪除 / 篩選 / 搜尋交易、跨帳戶轉帳、CSV 匯出
- 🧾 **電子發票自動匯入** — 掃描 QR、輸入號碼、財政部 CSV，或連結載具自動同步
- 📊 **發票深度分析** — 商家排行、品項統計、消費時段 / 星期分佈、智慧洞察
- 📈 **報告圖表** — 圓餅、長條、折線；預算進度條與警示
- 🎨 **個人化** — 深色模式、主色調、襯線標題、版面密度可調

---

## 💡 使用小提示

- 第一次開啟會載入示範資料；可在「設定」頁清空
- 「電子發票」頁點「連結載具」，可體驗自動同步功能
- 右下角 **Tweaks** 面板可即時調整主題與外觀
- 所有資料只存在瀏覽器，清除瀏覽器資料會一併刪除

---

<details>
<summary>👨‍💻 開發者資訊</summary>

純前端 SPA：React 18 + Babel Standalone + 純 SVG 圖表，無建置流程。
直接用瀏覽器開 `index.html` 就能執行。

```
.
├── index.html / 記帳.html          # 入口
├── styles.css                      # 主題樣式
├── store.jsx                       # 資料層
├── charts.jsx                      # SVG 圖表
├── tweaks-panel.jsx                # Tweaks 控制
├── pages-dashboard.jsx
├── pages-transactions.jsx
├── pages-accounts-reports.jsx
├── pages-invoice.jsx
├── pages-invoice-data.jsx
└── pages-invoice-analytics.jsx
```

</details>

---

MIT License
