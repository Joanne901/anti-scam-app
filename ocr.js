// 截圖文字辨識（OCR）：全部在使用者自己的瀏覽器裡跑，圖片不會上傳到任何伺服器。只支援網頁版。
//
// 主要引擎：PaddleOCR（PP-OCRv5，繁簡中文都認得，比 Tesseract 準很多），在背景執行緒跑，畫面不會卡住。
//   程式從 jsDelivr 載入，模型放在本站 public/models/（Apache-2.0，來自 PaddlePaddle 官方）。
//   第一次使用要下載約 30MB，之後瀏覽器會快取。
// 備用引擎：Tesseract.js，PaddleOCR 載入失敗（例如很舊的瀏覽器）時才用。
import { Platform } from 'react-native';

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const PADDLE_SDK = 'https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm';
// SDK 內建的背景執行緒程式（已把 OpenCV、ONNX Runtime 打包在裡面），版本要和上面一致
const PADDLE_WORKER = 'https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/dist/assets/worker-entry-C9UNuyOJ.js';
// 必須和 SDK 背景執行緒內建的 onnxruntime-web 版本相同（0.4.2 內建 1.24.3）
const ORT_WASM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';
const OPENCC = 'https://cdn.jsdelivr.net/npm/opencc-js@1.4.2/dist/esm/cn2t.js';

export const ocrSupported = Platform.OS === 'web';

// 用 Function 包一層，讓打包工具不要去解析 CDN 網址
const importUrl = new Function('u', 'return import(u)');

// 本站根目錄（GitHub Pages 上是 /anti-scam-app/），從載入的程式檔位置推算
function siteBase(){
  const s = document.querySelector('script[src*="_expo/static/js/"]');
  return s ? s.src.split('_expo/')[0] : new URL('/', window.location.href).href;
}

let paddlePromise = null;
function getPaddle(){
  if (!paddlePromise) {
    paddlePromise = (async () => {
      const { PaddleOCR } = await importUrl(PADDLE_SDK);
      // 背景執行緒必須和網頁同源，所以用 blob 包一層再去載入 CDN 上的程式
      const workerUrl = URL.createObjectURL(new Blob([`import '${PADDLE_WORKER}';`], { type: 'text/javascript' }));
      const base = siteBase();
      const ocr = await PaddleOCR.create({
        textDetectionModelName: 'PP-OCRv5_mobile_det',
        textDetectionModelAsset: { url: base + 'models/PP-OCRv5_mobile_det_onnx_infer.tar' },
        textRecognitionModelName: 'PP-OCRv5_mobile_rec',
        textRecognitionModelAsset: { url: base + 'models/PP-OCRv5_mobile_rec_onnx_infer.tar' },
        worker: { createWorker: () => new Worker(workerUrl, { type: 'module' }) },
        ortOptions: { backend: 'wasm', wasmPaths: ORT_WASM },
      });
      await ocr.initialize();
      return ocr;
    })().catch(e => { paddlePromise = null; throw e; });
  }
  return paddlePromise;
}

// PaddleOCR 偶爾會吐出簡體字（例如「银行、冻结」），轉成台灣繁體。
// 用 cn→tw（只換字形、不換用語），所以詐團的「賬號、信息」會保留，偵測才抓得到。
let ccPromise = null;
function getConverter(){
  if (!ccPromise) {
    ccPromise = importUrl(OPENCC).then(m => {
      const conv = m.default.Converter({ from: 'cn', to: 'tw' });
      return (s) => {
        const o = conv(s);
        if (o.length !== s.length) return o;
        // OpenCC 會把「台」轉成「臺」，台灣慣用「台」，保留原字
        let r = '';
        for (let i = 0; i < o.length; i++) r += s[i] === '台' ? '台' : o[i];
        return r;
      };
    }).catch(e => { ccPromise = null; throw e; });
  }
  return ccPromise;
}

// 使用者一按「上傳截圖」就先開始下載，挑照片的時間就能把引擎準備好
export function warmupOcr(){
  if (!ocrSupported) return;
  getPaddle().catch(() => {});
  getConverter().catch(() => {});
}

let libPromise = null;
function loadTesseract(){
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT_SRC;
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => { libPromise = null; reject(new Error('無法載入文字辨識元件,請確認網路連線')); };
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

let workerPromise = null;
let progressCb = null;
function getWorker(){
  if (!workerPromise) {
    workerPromise = loadTesseract().then(T => T.createWorker(['chi_tra', 'eng'], 1, {
      logger: (m) => progressCb && progressCb(m),
    })).catch(e => { workerPromise = null; throw e; });
  }
  return workerPromise;
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
      if (gap < h * 0.6 && aligned && !/[。！？!?]$/.test(prev.text)) {
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
  'loading language traineddata': '下載中文辨識模型(第一次較久)',
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

async function recognizePaddle(file, onProgress){
  const ready = !!paddlePromise;
  onProgress({ label: ready ? '準備辨識' : '下載辨識模型(第一次約 30MB)', pct: 10 });
  const ocr = await getPaddle();
  onProgress({ label: '辨識文字中', pct: 55 });
  const [res] = await ocr.predict(file);
  onProgress({ label: '整理文字', pct: 92 });
  let text = cleanPaddle(res.items || [], res.image && res.image.height);
  try { text = (await getConverter())(text); } catch {}
  return fixCommon(text);
}

// onProgress({ label, pct })
export async function recognizeImage(file, onProgress = () => {}){
  try {
    return await recognizePaddle(file, onProgress);
  } catch (e) {
    console.warn('PaddleOCR 無法使用,改用 Tesseract', e);
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
    const worker = await getWorker();
    const run = async (mode) => extract((await worker.recognize(await preprocess(file, mode), {}, { text: true, blocks: true })).data);
    pass = '';
    const first = await run('bin');
    // 第一次就很有把握的話，不用再跑第二次
    if (first.sure >= 0.85 && first.text) return first.text;
    pass = '(第二次比對)';
    const second = await run('plain');
    return (second.score > first.score ? second : first).text;
  } finally {
    progressCb = null;
  }
}
