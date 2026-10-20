// 截圖文字辨識（OCR）：全部在使用者自己的手機瀏覽器裡跑，圖片不會上傳到任何伺服器。只支援網頁版。
//
// 主要引擎：PaddleOCR PP-OCRv5 mobile（繁簡中文都認得，比 Tesseract 準很多），
//   在背景執行緒 public/ocr-worker.js 裡用 onnxruntime-web 跑，畫面不會卡住。
//   模型放在本站 public/models/（Apache-2.0，PaddlePaddle 官方），第一次下載後存在手機裡。
// 備用引擎：Tesseract.js，PaddleOCR 無法啟動（例如很舊的瀏覽器）時才用。
import { Platform } from 'react-native';

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export const ocrSupported = Platform.OS === 'web';

// 逾時保護：卡住就停掉背景執行緒並回報錯誤，不會一直轉圈
const STALL_MS = 60000;      // 準備階段超過這麼久沒有任何進度
const OCR_TIMEOUT_MS = 90000; // 單張截圖辨識最久等這麼久

// 本站根目錄（GitHub Pages 上是 /anti-scam-app/），從載入的程式檔位置推算
function siteBase(){
  const s = document.querySelector('script[src*="_expo/static/js/"]');
  return s ? s.src.split('_expo/')[0] : new URL('/', window.location.href).href;
}

let worker = null;
let initPromise = null;
let nextId = 1;
const pending = new Map();
let progressListener = null;
let lastProgress = 0; // 最後一次收到背景執行緒進度的時間，用來判斷有沒有卡住

function resetWorker(reason){
  if (worker) worker.terminate();
  worker = null;
  initPromise = null;
  for (const p of pending.values()) p.reject(new Error(reason));
  pending.clear();
}

function getWorker(){
  if (!worker) {
    worker = new Worker(siteBase() + 'ocr-worker.js', { type: 'module' });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') { lastProgress = Date.now(); progressListener && progressListener(m); return; }
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      m.ok ? p.resolve(m) : p.reject(new Error(m.error || '辨識失敗'));
    };
    worker.onerror = (e) => resetWorker((e && e.message) || '辨識引擎發生錯誤');
  }
  return worker;
}

function call(msg, transfer = []){
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id }, transfer);
  });
}

// 準備引擎（下載模型、建立辨識器）；只要還有進度就繼續等，太久沒動靜才判定卡住
function initEngine(){
  if (!initPromise) {
    lastProgress = Date.now();
    initPromise = new Promise((resolve, reject) => {
      const watch = setInterval(() => {
        if (Date.now() - lastProgress > STALL_MS) {
          clearInterval(watch);
          resetWorker('準備辨識引擎逾時');
          reject(new Error('準備辨識引擎逾時，請確認網路後再試一次'));
        }
      }, 2000);
      call({ type: 'init' }).then(resolve, reject).finally(() => clearInterval(watch));
    }).catch(e => { initPromise = null; throw e; });
  }
  return initPromise;
}

// 使用者一按「上傳截圖」就先開始準備，挑照片的時間就能下載好
export function warmupOcr(){
  if (!ocrSupported) return;
  initEngine().catch(() => {});
}

// 在主畫面把圖片解碼成像素，交給背景執行緒（轉移所有權，不複製）
async function toPixels(file){
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  if (bmp.close) bmp.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

let libPromise = null;
function loadTesseract(){
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT_SRC;
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => { libPromise = null; reject(new Error('無法載入文字辨識元件，請確認網路連線')); };
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

let tessPromise = null;
let progressCb = null;
function getTesseract(){
  if (!tessPromise) {
    tessPromise = loadTesseract().then(T => T.createWorker(['chi_tra', 'eng'], 1, {
      logger: (m) => progressCb && progressCb(m),
    })).catch(e => { tessPromise = null; throw e; });
  }
  return tessPromise;
}

// 中文 OCR 常在字與字之間插入空白，把它們去掉；保留英數之間的空白
const CJK = '[\\u3000-\\u303f\\u3400-\\u9fff\\uff00-\\uffef]';
function cleanText(raw){
  return raw
    .replace(new RegExp(`(${CJK})[ \\t]+(?=${CJK})`, 'g'), '$1')
    .replace(new RegExp(`(${CJK})[ \\t]+(?=[A-Za-z0-9])`, 'g'), '$1')
    .replace(new RegExp(`([A-Za-z0-9])[ \\t]+(?=${CJK})`, 'g'), '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 讓使用者從相簿 / 檔案挑一張圖，回傳 File（取消則回傳 null）
export function pickImage(){
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

// 辨識前先整理圖片。兩種做法各有擅長的截圖，所以兩種都會試：
//  bin   放大 + 二值化成白底黑字（深色模式先反白），對彩色背景、氣泡較穩
//  plain 只放大，保留原本的灰階細節，有些截圖反而辨識得更完整
async function preprocess(file, mode){
  const bmp = await createImageBitmap(file);
  const scale = Math.min(4, Math.max(1, 1600 / bmp.width));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  if (mode === 'plain') return canvas;

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const lum = new Uint8ClampedArray(w * h);
  let sum = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    lum[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    sum += lum[j];
  }
  const dark = sum / lum.length < 110;
  // 深色模式：字是亮的，門檻抓高；一般模式：字是深色的，門檻抓低
  for (let j = 0, i = 0; j < lum.length; j++, i += 4) {
    const v = dark ? (lum[j] > 150 ? 0 : 255) : (lum[j] < 120 ? 0 : 255);
    px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---- 辨識結果清理 ----
// 截圖裡除了對話，還有狀態列、頭像、時間、已讀、輸入框，OCR 會把它們讀成亂碼。
// 利用 Tesseract 給每個字 / 每行的信心分數，把沒把握的部分丟掉，再去掉聊天 App 的介面文字。
const LINE_MIN_CONF = 50;  // 整行平均信心低於這個就整行丟掉
const EDGE_MIN_CONF = 45;  // 行首行尾信心低於這個的字（多半是頭像、氣泡邊框）丟掉
const HAS_CJK = /[㐀-鿿]/;
const HAS_LINK = /(https?:|www\.|[a-z0-9-]+\.[a-z]{2,})/i;
const SYMBOLS_ONLY = /^[^\p{L}\p{N}【】「」（）()<>]+$/u;
// 中文旁邊的標點不需要空白：「查詢 , 您的」→「查詢,您的」
function tidyPunct(t){
  return t
    .replace(/([㐀-鿿])\s+(?=[,.:;!?()（）【】「」、。，：；！？])/g, '$1')
    .replace(/([,.:;!?()（）【】「」、。，：；！？])\s+(?=[㐀-鿿【「（(])/g, '$1');
}
const UI_LINE = [
  /^(上午|下午)?\s*\d{1,2}\s*[:：.]\s*\d{2}$/,  // 時間
  /^已讀/,
  /^<?\s*\d{1,3}\s*\+/,                        // LINE 標題列的未讀數「<99+」
];

function cleanLine(line){
  const words = [...line.words];
  const junk = (w) => w.confidence < EDGE_MIN_CONF || (SYMBOLS_ONLY.test(w.text) && w.confidence < 80);
  while (words.length && junk(words[0])) words.shift();
  while (words.length && junk(words[words.length - 1])) words.pop();
  let t = cleanText(words.map(w => w.text).join(' '))
    .replace(/(上午|下午)\s*\d{1,2}\s*[:：.]\s*\d{2}/g, '')
    .replace(/已讀/g, '')
    .replace(/^[^\p{L}\p{N}【「（(<]+/u, '')
    .replace(/[^\p{L}\p{N}。！？!?」】）)…]+$/u, '')
    .trim();
  if (!t) return null;
  if (line.confidence < LINE_MIN_CONF) return null;
  if (UI_LINE.some(re => re.test(t))) return null;
  // 沒有中文也不是網址的短行，幾乎都是介面圖示被讀成英文字母
  if (!HAS_CJK.test(t) && !HAS_LINK.test(t) && line.confidence < 85) return null;
  return { text: tidyPunct(t), bbox: line.bbox, h: line.bbox.y1 - line.bbox.y0 };
}

// 同一個對話氣泡裡被換行切斷的句子接回來（上下距離很近、左邊對齊），
// 「收款帳 / 戶」這種被切開的關鍵字才偵測得到
function joinLines(lines){
  const out = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    if (prev) {
      // 用單行高度判斷（不能用合併後的整塊高度，不然門檻會越滾越大）
      const h = Math.min(prev.h, l.h);
      const gap = l.bbox.y0 - prev.bbox.y1;
      const aligned = Math.abs(l.bbox.x0 - prev.bbox.x0) < h * 1.5;
      // 有網址的行不接，避免網址和下一行的中文黏在一起
      if (gap < h * 0.6 && aligned && !/[。！？!?]$/.test(prev.text) && !HAS_LINK.test(prev.text) && !HAS_LINK.test(l.text)) {
        prev.text += (/[A-Za-z0-9]$/.test(prev.text) && /^[A-Za-z0-9]/.test(l.text) ? ' ' : '') + l.text;
        prev.bbox = { ...prev.bbox, y1: l.bbox.y1 };
        prev.h = l.h;
        continue;
      }
    }
    out.push({ ...l });
  }
  return out;
}

// 中文 OCR 常見的形近字誤認，只收錄詐騙訊息常出現的詞，修正後關鍵字比對也比較準
const OCR_FIXES = [
// 只放「替換後不會誤傷正常詞」的組合（例如「可詢」不能換成「查詢」，會把「可詢問」改壞）
  ['買頁', '買賣'], ['頁家', '賣家'], ['責家', '賣家'],
  ['旨用', '冒用'], ['假旨', '假冒'],
  ['簽點', '簽署'], ['簽屠', '簽署'], ['簽屆', '簽署'],
  ['機檔', '機構'], ['背用', '費用'], ['音用', '費用'],
  ['託之條款', '託運條款'], ['旗運條款', '託運條款'],
  ['送結限制', '凍結限制'], ['依復', '恢復'], ['示完成聯結', '未完成聯結'],
  ['捉據', '單據'], ['認論', '認證'], ['認放', '認證'],
  ['聯聚', '聯繫'], ['青家', '賣家'],
];
function fixCommon(t){
  for (const [a, b] of OCR_FIXES) t = t.split(a).join(b);
  return t;
}

function extract(data){
  const lines = [];
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    const c = cleanLine(l);
    if (c) lines.push(c);
  }
  lines.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const text = fixCommon(joinLines(lines).map(l => l.text).join('\n'));
  // 分數：有把握的中文字數，用來挑兩種前處理裡比較好的那個
  let score = 0, total = 0;
  for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const w of l.words || []) {
    const n = (w.text.match(/[㐀-鿿]/g) || []).length;
    total += n;
    if (w.confidence >= 60) score += n;
  }
  return { text, score, sure: total ? score / total : 0 };
}

const STAGES = {
  'loading tesseract core': '載入辨識引擎',
  'initializing tesseract': '初始化',
  'loading language traineddata': '下載中文辨識模型（第一次較久）',
  'initializing api': '準備辨識',
  'recognizing text': '辨識文字中',
};

// ---- PaddleOCR 結果整理 ----
// PaddleOCR 字很準，要處理的主要是聊天 App 介面上的字：時間、已讀、未讀數、狀態列、圖示
const PADDLE_MIN_SCORE = 0.6;
const PADDLE_UI = [
  /^(上午|下午)?\s*\d{1,2}\s*[:：.]\s*\d{0,2}$/,  // 時間（含被截掉的「下午2:5」）
  /^已.$/,                                       // 已讀（含誤認的「已请、已锁」）
  /^\d{1,2}[:：]\d{2}\s*\d?$/,                   // 手機狀態列時間
];

function cleanPaddle(items, imgH){
  const lines = [];
  for (const it of items) {
    if (!it.text || it.score < PADDLE_MIN_SCORE) continue;
    const t = it.text.trim()
      .replace(/^<?\s*\d{1,3}\+\s*/, '')                          // LINE 標題列的「<99+」
      .replace(/\s*(上午|下午)\s*\d{1,2}\s*[:：.]\s*\d{0,2}$/, '')   // 黏在句尾的時間
      .trim();
    if (!t || PADDLE_UI.some(re => re.test(t))) continue;
    // 沒有中文、不是網址、也不是電話號碼的，多半是圖示（↓、Aa、Q）或電量
    if (!HAS_CJK.test(t) && !HAS_LINK.test(t) && !/\d{8,}/.test(t)) continue;
    const xs = it.poly.map(p => p[0]), ys = it.poly.map(p => p[1]);
    const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    // 畫面最上方（標題列）和最下方（輸入框）一兩個字的，是圖示被讀成字（例如「目」「十回」）
    if (imgH && t.length <= 2 && (bbox.y1 < imgH * 0.1 || bbox.y0 > imgH * 0.92)) continue;
    lines.push({ text: t, bbox, h: bbox.y1 - bbox.y0 });
  }
  lines.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  return joinLines(lines).map(l => l.text).join('\n');
}

const MB = (n) => (n / 1048576).toFixed(n > 10485760 ? 0 : 1);

async function recognizePaddle(file, onProgress){
  progressListener = (m) => {
    if (m.stage === 'download') onProgress({ label: `下載辨識模型 ${MB(m.loaded)} / ${MB(m.total)} MB（只需一次）`, pct: m.total ? Math.round(m.loaded / m.total * 60) : 5 });
    else if (m.stage === 'init') onProgress({ label: '準備辨識引擎', pct: 62 });
    else if (m.stage === 'det') onProgress({ label: '找出文字位置', pct: 68 });
    else if (m.stage === 'rec') onProgress({ label: `辨識文字 ${m.done} / ${m.total} 行`, pct: 70 + Math.round(m.done / m.total * 28) });
  };
  try {
    onProgress({ label: '準備辨識引擎', pct: 3 });
    await initEngine();
    const img = await toPixels(file);
    const job = call({ type: 'ocr', width: img.width, height: img.height, buffer: img.data.buffer }, [img.data.buffer]);
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => { resetWorker('辨識逾時'); reject(new Error('辨識逾時')); }, OCR_TIMEOUT_MS); });
    const res = await Promise.race([job, timeout]).finally(() => clearTimeout(timer));
    return fixCommon(cleanPaddle(res.items || [], res.image && res.image.height));
  } finally {
    progressListener = null;
  }
}

// onProgress({ label, pct })
export async function recognizeImage(file, onProgress = () => {}){
  try {
    return await recognizePaddle(file, onProgress);
  } catch (e) {
    if (/逾時/.test(e.message)) throw new Error(e.message + '。可以改用手機內建的「拷貝文字」貼上（見上方說明）。');
    console.warn('PaddleOCR 無法使用，改用 Tesseract', e);
    return recognizeTesseract(file, onProgress);
  }
}

async function recognizeTesseract(file, onProgress){
  let pass = '';
  progressCb = (m) => {
    if (!onProgress) return;
    const label = STAGES[m.status] || '處理中';
    onProgress({ label: m.status === 'recognizing text' ? label + pass : label, pct: Math.round((m.progress || 0) * 100) });
  };
  try {
    const tess = await getTesseract();
    const run = async (mode) => extract((await tess.recognize(await preprocess(file, mode), {}, { text: true, blocks: true })).data);
    pass = '';
    const first = await run('bin');
    // 第一次就很有把握的話，不用再跑第二次
    if (first.sure >= 0.85 && first.text) return first.text;
    pass = '（第二次比對）';
    const second = await run('plain');
    return (second.score > first.score ? second : first).text;
  } finally {
    progressCb = null;
  }
}
