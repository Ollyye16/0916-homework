# AIoT-DA DIC-1: 個人入口網站與動態時鐘儀表板 (Personal Portal & Live Timekeeper)

> **課程名稱**：AIoT 與數據分析（AIoT & Data Analytics, AIoT-DA）  
> **課堂實作**：DIC-1 (Do in Class 1) — 個人入口網站與動態時鐘儀表板（Personal Portal & Live Timekeeper）  
> **授課單元**：Lecture 2 — 瀏覽器、現代 Web 核心與非同步資料流（L2Web）  
> **作業作者**：Olly (AIoT & Data Analytics Master Student)  
> **作業儲存庫**：[https://github.com/Ollyye16/0916-homework](https://github.com/Ollyye16/0916-homework)  
> **GitHub Pages 線上展示**：[https://ollyye16.github.io/0916-homework/](https://ollyye16.github.io/0916-homework/)  
> **示範教師**：Huan Chen 老師 ([原示範專案](https://github.com/huanchen1107/0916-2))

---

## 🌟 專案設計特色與架構

本專案依據 DIC-1 規格要求打造，兼具**原創視覺風格**與**全端架構深度**：
1. **AIoT 工業級微型儀表板（Futuristic Edge Dashboard）**：
   - 區隔於原範例之單一置中大鐘與隱藏抽屜，採用高質感模組化深色流體玻璃擬態（Glassmorphism）。
   - 將 **動態時間樞紐**、**台中即時微氣候**、**Olly 個人身分卡**、**AIoT 邊緣遙測** 與 **三大專案牆** 有機整合於同一視窗。
2. **雙軌相容架構（Dual-Track Architecture）**：
   - **根目錄純靜態（Zero Dependency）**：符合標準 Vanilla HTML5 / CSS3 / ES6+，可直接於瀏覽器本機開啟，並零門檻無縫部署至 **GitHub Pages**。
   - **後端擴充（C# .NET Minimal API）**：於 `backend/` 目錄提供高效能微服務，具備伺服器時間、Open-Meteo 快取代理、AIoT 遙測數據流與 Swagger UI。

---

## 📋 功能實作對照表 (Requirements Compliance)

| 規格編號 | 功能模組 | 實作說明 | 狀態 |
| :--- | :--- | :--- | :---: |
| **FR-1** | **高精度動態時鐘** | 50ms 流暢更新（時/分/秒/毫秒/UNIX Timestamp）、時段問候語、Day-of-Year 與 ISO Week 計算、12/24 小時制切換 | ✅ 已完成 |
| **FR-1.2** | **SVG 秒數進度環** | 圓形向量進度環，隨每分鐘秒數平滑轉動並搭配青色發光效果 | ✅ 已完成 |
| **FR-1.6** | **個人身分可編輯** | 姓名 (`Olly`) 與標語可直接在網頁上點擊編輯，並自動保存至 LocalStorage | ✅ 已完成 |
| **FR-2** | **即時氣象串接** | 串接免金鑰 **Open-Meteo API**，預設為台中市（24.1477, 120.6736），支援台北/新竹/台南/高雄預設點與 GPS 定位，含離線快取降級 | ✅ 已完成 |
| **FR-4** | **非同步專案資料載入** | 以 `fetch('./projects.json')` 非同步載入 Edge AI、ESP32 監測網與 C# 儀表板三大專案，動態生成 DOM 卡片 | ✅ 已完成 |
| **FR-5** | **統一狀態管理** | 透過 `localStorage['aiot_user_state']` 統一持久化儲存偏好設定 | ✅ 已完成 |
| **FR-6** | **Web Audio 機械音效** | 採用瀏覽器原生 Web Audio API 合成時鐘秒針機械滴答聲（零外部音效檔依賴） | ✅ 已完成 |
| **FR-7** | **Zen 專注時鐘模式** | 支援頂部按鈕切換或鍵盤快捷鍵 <kbd>Z</kbd> / <kbd>ESC</kbd> 隱藏干擾元素，化身桌面時鐘 | ✅ 已完成 |
| **BONUS** | **C# .NET 後端** | `backend/` 內建 .NET Minimal API，支援 Swagger、CORS、天氣代理與遙測端點 | ✅ 已完成 |

---

## 🚀 快速開始 (Quick Start)

### 1. 純前端本機運行（最簡便）
無需安裝 Node.js 或建置工具，直接使用任一現代瀏覽器開啟專案根目錄的 `index.html`：
```bash
# Windows 直接雙擊 index.html，或以 VS Code Live Server 開啟
start index.html
```

### 2. 啟動 C# .NET Minimal API 後端（加分項展示）
若欲啟動 C# 後端微服務提供 API 服務：
```bash
# 進入 backend 目錄
cd backend

# 還原套件並運行
dotnet run
```
啟動後：
- 服務網址：`http://localhost:5000`
- Swagger API 文件：`http://localhost:5000/swagger`
- API 端點：
  - `GET /api/time`：伺服器高精度時間與時區資訊
  - `GET /api/weather?city=taichung`：Open-Meteo 天氣代理與記憶體快取
  - `GET /api/telemetry`：AIoT 邊緣感測器遙測數值串流

---

## 🌐 部署至 GitHub Pages 教學

1. **推送程式碼至 GitHub 儲存庫**：
   ```bash
   git add .
   git commit -m "feat: complete AIoT personal portal with C# backend"
   git push -u origin main
   ```
2. **啟用 GitHub Pages**：
   - 開啟 GitHub 倉庫頁面：`https://github.com/Ollyye16/0916-homework`
   - 點擊上方 **Settings** ➔ 側邊欄點選 **Pages**。
   - 在 **Build and deployment** 下方的 **Branch** 選擇 `main` 分支與 `/(root)` 目錄。
   - 點擊 **Save**。
3. **線上驗收網址**：
   約 1~2 分鐘後即可透過 `https://ollyye16.github.io/0916-homework/` 直接公開預覽！

---

## 📂 專案檔案結構

```
0916-homework/
├── .agents/                    # 專案 Skill 設定 (含 grill-me 與 grilling)
├── backend/                    # C# ASP.NET Core Minimal API 後端
│   ├── AiotBackend.csproj      # .NET 專案檔 (啟用 OpenAPI/Swagger)
│   └── Program.cs              # API 路由與控制器邏輯
├── index.html                  # 儀表板結構 (語意化 HTML5)
├── style.css                   # Cyber Glassmorphism 樣式與響應式排版
├── app.js                      # 動態時鐘引擎、氣象 API 與非同步資料流
├── projects.json               # AIoT 作品集資料集 (JSON)
├── .gitignore                  # Git 忽略清單 (排除 C# bin/obj 等)
└── README.md                   # 專案詳細說明文件
```

---
*Developed for AIoT & Data Analytics (AIoT-DA) Lecture 2 Milestone.*
