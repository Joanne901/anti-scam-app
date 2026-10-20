// 截圖文字辨識（OCR）：在使用者自己的瀏覽器裡跑 Tesseract.js，圖片不會上傳到任何伺服器。
// 只支援網頁版；第一次使用會下載辨識模型（之後瀏覽器會快取）。
import { Platform } from 'react-native';

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

export const ocrSupported = Platform.OS === 'web';

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

// 辨識前先整理圖片：放大、轉灰階、二值化成白底黑字。
// 聊天截圖常有彩色背景與氣泡，直接丟給 OCR 錯字很多；深色模式的截圖會先反白。
async function preprocess(file){
  const bmp = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 1600 / bmp.width));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
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

const STAGES = {
  'loading tesseract core': '載入辨識引擎',
  'initializing tesseract': '初始化',
  'loading language traineddata': '下載中文辨識模型(第一次較久)',
  'initializing api': '準備辨識',
  'recognizing text': '辨識文字中',
};

// onProgress({ label, pct })
export async function recognizeImage(file, onProgress){
  progressCb = (m) => {
    if (!onProgress) return;
    onProgress({ label: STAGES[m.status] || '處理中', pct: Math.round((m.progress || 0) * 100) });
  };
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(await preprocess(file));
    return cleanText(data.text || '');
  } finally {
    progressCb = null;
  }
}
