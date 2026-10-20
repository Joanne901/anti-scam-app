// 網頁版打包後處理：GitHub Pages 設定、加到主畫面（iOS / Android）、版本資訊
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dist = path.join(__dirname, '..', 'dist');
const { expo } = require('../app.json');
const base = (expo.experiments?.baseUrl || '').replace(/\/$/, '');
const name = expo.web?.name || expo.name;
const shortName = expo.web?.shortName || name;
const themeColor = '#3b5bdb';

// GitHub Pages 預設會忽略底線開頭的資料夾（_expo），要關掉 Jekyll
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

// Android「安裝應用程式 / 加到主畫面」需要的 manifest
const manifest = {
  name,
  short_name: shortName,
  lang: 'zh-TW',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  background_color: '#eef0f6',
  theme_color: themeColor,
  icons: [
    { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${base}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// 版本資訊：App 會定期讀這個檔，和自己載入的程式比對，不同就提示使用者更新
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const bundle = (html.match(/_expo\/static\/js\/web\/[^"]+\.js/) || [''])[0];
let note = '';
try { note = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim(); } catch {}
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify({ bundle, note, time: new Date().toISOString() }));

// 讓頁面延伸到 iPhone 狀態列底下（藍色頁首一路到最上面），用 safe-area 留出狀態列的空間
html = html.replace(/<meta name="viewport" content="([^"]*)"/, (m, c) => c.includes('viewport-fit') ? m : `<meta name="viewport" content="${c}, viewport-fit=cover"`);
// 只留我們自己的 theme-color（淺色 / 深色各一），Expo 預設那個拿掉
html = html.replace(/<meta name="theme-color"[^>]*>/g, '');

const tags = [
  `<link rel="manifest" href="${base}/manifest.webmanifest" />`,
  `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${themeColor}" />`,
  `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#22306a" />`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
  `<link rel="icon" type="image/png" sizes="192x192" href="${base}/icon-192.png" />`,
  `<meta name="apple-mobile-web-app-capable" content="yes" />`,
  `<meta name="mobile-web-app-capable" content="yes" />`,
  `<meta name="apple-mobile-web-app-title" content="${shortName}" />`,
].join('');
html = html.replace('</head>', tags + '</head>');
fs.writeFileSync(indexPath, html);
