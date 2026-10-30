# 小型雙推 USV 自主航行系統｜成果展示

國立臺灣海洋大學輪機工程學系 張席暢，115 年度大學生暑期學習實務體驗計畫（實作類）。

展示網站：<https://zhang-xichang.github.io/AutoShip/>（GitHub Pages，來源為 `main` 分支的 `docs/`）

## 內容

| 路徑 | 說明 |
|---|---|
| `docs/index.html` | 展示網站首頁：平台、架構、導引與控制、三航線實船測試回放、討論 |
| `docs/architecture/` | 4 張互動式架構圖（Archify），含簡報用 PNG／SVG |
| `docs/diagrams/` | 四層系統架構、開發時間軸 |
| `docs/assets/data/sea-trials.js` | 2026-09-09 實船紀錄摘要（相對首筆定位的公尺座標，不含經緯度） |
| `docs/assets/js/site-config.js` | 影片、報告、原始碼、聯絡信箱連結；留空則不顯示 |

## 本機預覽

```bash
python -m http.server 8000
# 開啟 http://localhost:8000/docs/
```

純靜態網站，不依賴任何外部資源。圖中的程式碼連結指向私人倉庫 `danielqwer/NewShip` 的 commit `6e0cef6`，需有存取權才能開啟。
