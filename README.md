# 防詐小衛 · iPhone App(已組好,可直接跑)

四個功能:查網址、驗訊息、詐騙手法圖鑑、緊急求助。

這個專案已經幫你建好、套件也指定好版本了,而且已用 Metro 打包驗證過可正常編譯。
你只要做三件事就能在 iPhone 上跑起來。

---

## 你那邊只剩三步

**前提**:電腦(Mac 或 Windows 皆可)裝了 Node.js 18 以上;電腦和 iPhone 連「同一個 Wi-Fi」。
檢查 Node:終端機打 `node -v`;沒有就到 https://nodejs.org 裝 LTS 版。

**1. 解壓縮後,進到資料夾裝套件**

```bash
cd anti-scam-app
npm install
```

> 為了讓檔案小,壓縮檔沒有附 node_modules(那東西幾百 MB 又綁作業系統),
> 所以這步會依 package-lock.json 幫你把正確版本裝回來,照做即可。

**2. iPhone 裝「Expo Go」**(App Store 搜尋 Expo Go)

**3. 啟動,然後用 iPhone 掃碼**

```bash
npx expo start
```

終端機會出現一個 QR code → iPhone 用內建「相機」App 對著掃 → 選擇用 Expo Go 開啟 → App 就跑在你手機上了。

> 改 code 存檔,手機畫面會自動更新(Fast Refresh)。
> 學校 / 公司 Wi-Fi 擋連線的話:用手機開熱點、電腦連那個熱點,或改用 `npx expo start --tunnel`。

---

## 檔案在哪、怎麼改

所有「內容」集中在 `data.js`,不用動邏輯就能擴充:

- 加關鍵字 / 改分類 → `data.js` 的 `PATTERNS`
- 加品牌官方網域比對 → `data.js` 的 `BRANDS`
- 改圖鑑 → `data.js` 的 `GUIDE`
- 改緊急步驟 → `data.js` 的 `STEPS`

其他:

- 判斷邏輯(網址 / 訊息) → `analyze.js`
- 截圖文字辨識(網頁版,在手機瀏覽器本機辨識,截圖不會上傳)
  - `public/ocr-worker.js`:背景執行緒,用 onnxruntime-web 跑 [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) PP-OCRv5 mobile 模型(偵測 + 辨識)
  - `public/models/`:模型與字典(Apache-2.0,PaddlePaddle 官方),第一次下載約 21MB,之後存在手機的 Cache Storage
  - `ocr.js`:主畫面這端,負責傳圖片給背景執行緒、逾時保護、整理結果(去掉時間、已讀等介面文字)
  - 備用引擎:Tesseract.js(PaddleOCR 無法啟動時使用)
- 顏色、深色模式 → `theme.js`
- 四個畫面 → `screens/`
- 進入點與分頁導航 → `App.js`

---

## 想變成主畫面上的獨立 App(不透過 Expo Go)?

先把上面跑起來再弄。方向是用 EAS Build 打包:

```bash
npm install -g eas-cli
eas login            # 需要一個免費 Expo 帳號
eas build -p ios --profile preview
```

- 免費 Apple ID:可裝到自己的 iPhone,但每 7 天要重簽一次。
- 付費 Apple Developer(99 美金 / 年):可長期安裝,也能用 TestFlight 給別人裝。

---

## 重要提醒

查網址、驗訊息都是在手機本地用「公開的釣魚特徵」判斷,**不連任何外部服務,也無法保證 100% 準確**。
最保險永遠是:自己開官方 App 或手動輸入官網,不要點別人給的連結;有疑慮打 **165**。

---

## 網頁版(GitHub Pages,傳連結就能用)

1. 在 GitHub 建一個叫 `anti-scam-app` 的 repo,把這個資料夾推上去(`main` 分支)。
2. repo 的 **Settings → Pages → Source** 選 **GitHub Actions**。
3. 之後每次 push,`.github/workflows/deploy.yml` 會自動打包並發布到
   `https://<你的帳號>.github.io/anti-scam-app/`

> repo 名稱若不是 `anti-scam-app`,要同步改 `app.json` 裡的 `experiments.baseUrl`。
> 在 LINE 分享時網址加上 `?openExternalBrowser=1`,會用手機瀏覽器開啟而不是 LINE 內建瀏覽器。
> 本機試網頁版:`npm run web`

### 加到手機主畫面(像 App 一樣使用)

「查網址」頁有一顆「加到主畫面」按鈕(第一次打開時上方也會跳出提示),iOS、Android 都按同一顆:

- **Android**(Chrome、Edge 等):直接跳出系統的安裝視窗,按「安裝」就好。
- **iPhone**:Apple 不允許網站自己加到主畫面,所以會跳出圖解步驟,並用箭頭指出「分享」按鈕的位置(Safari、Chrome、iOS 26 各有對應步驟)。
- **在 LINE 裡打開**:會自動跳到手機瀏覽器開啟,再按一次就能加。
- 相關程式:`install.js`(按鈕、圖解)、`pwa.js`(判斷手機與瀏覽器)

### 更新通知

每次 push 後重新部署,`scripts/postbuild-web.js` 會產生 `version.json`(含這次 commit 的標題)。
使用者開著網頁或從主畫面打開時,App 會檢查是否有新版,有的話跳出「有新版本」提示,
**commit 標題就是提示裡顯示的更新說明**,所以 commit 標題寫給使用者看得懂的話。
