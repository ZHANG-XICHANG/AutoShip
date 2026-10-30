# NewShip 雙推進器 USV 架構展示

大學專題「整合 LOS 導引之小型雙推雙舵 USV 自主航行系統」的互動式架構圖。

開啟 `index.html` 瀏覽全部圖表（啟用 GitHub Pages 後可直接以網址分享）。

| 檔案 | 內容 |
|---|---|
| `01-system-architecture.html` | 系統架構：岸端、ESP32-S3 韌體、Jetson AutoShip |
| `02-control-loop.html` | LOS 導引與差速控制資料流 |
| `03-mission-lifecycle.html` | MissionController 任務狀態機 |
| `04-remote-start-sequence.html` | 下達目標與遠端啟動時序 |
| `exports/*.png` | 4 倍解析度 PNG（淺色），可直接放進 PowerPoint |
| `exports/*-light.svg`、`*-dark.svg` | 向量圖 |
| `source/*.json` | [Archify](https://github.com/tt-a1i/archify) 圖表原始檔 |

## 程式碼依據

- 圖中每個元件都附有程式碼引用，對應 [danielqwer/NewShip](https://github.com/danielqwer/NewShip) 的 commit `6e0cef639c66b1337cab41684087d38822cb5ce3`。
- 成果標題中的 VO 避障，在該版本程式碼中查無實作，因此未繪製。

## 重新產生

在 NewShip 專案根目錄執行（`<archify>` 為 Archify 安裝路徑）：

```bash
node <archify>/bin/archify.mjs finalize architecture source/01-system-architecture.json \
  docs/architecture/01-system-architecture.html --repo-root . --quality showcase
```

其他圖表依序把類型換成 `dataflow`、`lifecycle`、`sequence`。
