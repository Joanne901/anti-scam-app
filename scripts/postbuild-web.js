// 網頁版打包後處理：GitHub Pages 設定 + iPhone「加入主畫面」圖示
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const { expo } = require('../app.json');
const base = (expo.experiments?.baseUrl || '').replace(/\/$/, '');

// GitHub Pages 預設會忽略底線開頭的資料夾（_expo），要關掉 Jekyll
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const indexPath = path.join(dist, 'index.html');
const tags = [
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
  `<link rel="icon" type="image/png" sizes="192x192" href="${base}/icon-192.png" />`,
  `<meta name="apple-mobile-web-app-title" content="${expo.web?.shortName || expo.name}" />`,
].join('');
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, 'utf8').replace('</head>', tags + '</head>'));
