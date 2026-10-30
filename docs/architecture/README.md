# 架構展示（docs/architecture）

開啟 `index.html` 即可瀏覽全部圖表。

| 檔案 | 內容 |
|---|---|
| `01-system-architecture.html` | 系統架構：岸端、ESP32-S3 韌體、Jetson AutoShip |
| `02-control-loop.html` | LOS 導引與差速控制資料流 |
| `03-mission-lifecycle.html` | MissionController 任務狀態機 |
| `04-remote-start-sequence.html` | 下達目標與遠端啟動時序 |
| `exports/*.png` | 4 倍解析度 PNG（淺色），可直接放進 PowerPoint |
| `exports/*-light.svg`、`*-dark.svg` | 向量圖；PowerPoint 可「插入 → 圖片」後轉成圖形再編輯 |
| `source/*.json` | Archify 圖表原始檔 |

自動檢查紀錄（`*.finalize*.json` 等）含本機路徑，已移到專案根目錄的 `.archify/architecture-receipts/`，不隨網站發布。

## 程式碼依據

- 每個元件都附有程式碼引用（檔案與行號），對應 commit `6e0cef639c66b1337cab41684087d38822cb5ce3`。
- 工作區尚未提交的修改（例如遠端 START 改用獨立執行緒、規劃後等待新的 `$EXT`、移除 `heading.min_speed_kmh`）**未納入**。提交後可重新產生。
- 成果標題中的 VO 避障，在程式碼中找不到實作，因此未繪製。

## 重新產生

```bash
node <archify>/bin/archify.mjs finalize architecture docs/architecture/source/01-system-architecture.json \
  docs/architecture/01-system-architecture.html --repo-root . --quality showcase
```

其他圖表依序把類型換成 `dataflow`、`lifecycle`、`sequence`。若 commit 更新，請同步修改 JSON 中的 `meta.repository.revision` 與行號。
