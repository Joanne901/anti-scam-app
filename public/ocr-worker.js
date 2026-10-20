// 截圖文字辨識的背景執行緒（PaddleOCR PP-OCRv5 mobile，用 onnxruntime-web 跑）。
// 整個辨識都在這裡做，主畫面不會卡住；圖片只在使用者的手機裡處理，不會上傳。
//
// 流程：偵測文字區塊（det）→ 每一行切出來 → 辨識文字（rec）→ 回傳每行文字與位置。
// 不用 OpenCV：聊天截圖的字都是橫的，用簡單的連通區塊找框就夠，速度快、記憶體也省很多。

import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/ort.wasm.min.mjs';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';
ort.env.wasm.numThreads = 1; // GitHub Pages 無法開多執行緒（需要跨來源隔離標頭）
ort.env.wasm.proxy = false;

const MODELS = {
  det: new URL('models/PP-OCRv5_mobile_det.onnx', self.location).href,
  rec: new URL('models/PP-OCRv5_mobile_rec.onnx', self.location).href,
  dict: new URL('models/ppocrv5_dict.json', self.location).href,
};
const CACHE_NAME = 'ocr-models-v1';

// 偵測 / 辨識參數（取自官方 inference.yml）
const DET_LONG = 960;          // 偵測時把長邊縮到這個大小（官方 resize_long）
const DET_MIN_SHORT = 440;     // 很長的捲動截圖，短邊至少保留這麼寬，字才不會太小
const DET_THRESH = 0.3;
const DET_BOX_THRESH = 0.6;
const DET_UNCLIP = 1.5;
const REC_H = 48;
const REC_MAX_W = 3200;
const REC_BATCH = 1;      // 一行一行跑、用實際寬度，不用補白，實測比批次快 30~50%

let det = null, rec = null, dict = null;

// 模型偶爾會吐出簡體字（例如「银行、冻结」），轉成台灣繁體字形。
// 用 cn→tw（只換字形、不換用語），詐團的「賬號、信息」會保留，偵測才抓得到。
let toTw = (s) => s;
const OPENCC = 'https://cdn.jsdelivr.net/npm/opencc-js@1.4.2/dist/esm/cn2t.js';
const ccReady = import(OPENCC).then(m => {
  const conv = m.default.Converter({ from: 'cn', to: 'tw' });
  toTw = (s) => {
    const o = conv(s);
    if (o.length !== s.length) return o;
    let r = ''; // OpenCC 會把「台」轉成「臺」，台灣慣用「台」，保留原字
    for (let i = 0; i < o.length; i++) r += s[i] === '台' ? '台' : o[i];
    return r;
  };
}).catch(() => {});

const post = (msg) => self.postMessage(msg);

// 下載模型（有進度），存進 Cache Storage，下次直接從手機讀
async function fetchWithCache(url, onBytes){
  let cache = null;
  try { cache = await caches.open(CACHE_NAME); } catch {}
  if (cache) {
    const hit = await cache.match(url);
    if (hit) { const buf = await hit.arrayBuffer(); onBytes(buf.byteLength, buf.byteLength); return buf; }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('模型下載失敗（' + res.status + '）');
  const total = +res.headers.get('content-length') || 0;
  let buf;
  if (res.body) {
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      onBytes(got, Math.max(total, got));
    }
    const all = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { all.set(c, o); o += c.length; }
    buf = all.buffer;
  } else {
    buf = await res.arrayBuffer();
    onBytes(buf.byteLength, buf.byteLength);
  }
  if (cache) { try { await cache.put(url, new Response(buf.slice(0))); } catch {} }
  return buf;
}

async function init(){
  if (det && rec && dict) return;
  const sizes = { det: 0, rec: 0 }, got = { det: 0, rec: 0 };
  const report = () => {
    const t = sizes.det + sizes.rec, g = got.det + got.rec;
    post({ type: 'progress', stage: 'download', loaded: g, total: t });
  };
  const load = (k) => fetchWithCache(MODELS[k], (g, t) => { got[k] = g; sizes[k] = t; report(); });
  const [detBuf, recBuf, dictJson] = await Promise.all([
    load('det'), load('rec'),
    fetch(MODELS.dict).then(r => r.json()),
  ]);
  post({ type: 'progress', stage: 'init' });
  const opts = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  det = await ort.InferenceSession.create(detBuf, opts);
  rec = await ort.InferenceSession.create(recBuf, opts);
  dict = dictJson;
}

// ---- 影像處理小工具 ----
// 從 RGBA 原圖的某個區域，雙線性縮放到 dw×dh，寫成 BGR、CHW 排列的 Float32
function resizeToCHW(src, sw, sh, crop, dw, dh, out, outW, norm){
  const { x, y, w, h } = crop;
  const plane = (outW || dw) * dh;
  const sx = w / dw, sy = h / dh;
  for (let j = 0; j < dh; j++) {
    const fy = Math.min(sh - 1, Math.max(0, y + (j + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0;
    for (let i = 0; i < dw; i++) {
      const fx = Math.min(sw - 1, Math.max(0, x + (i + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0;
      const p00 = (y0 * sw + x0) * 4, p01 = (y0 * sw + x1) * 4, p10 = (y1 * sw + x0) * 4, p11 = (y1 * sw + x1) * 4;
      const o = j * (outW || dw) + i;
      for (let c = 0; c < 3; c++) {
        // RGBA 的 c=0 是 R；模型要 BGR，所以 B 放第 0 個平面
        const v = (src[p00 + c] * (1 - wx) + src[p01 + c] * wx) * (1 - wy) + (src[p10 + c] * (1 - wx) + src[p11 + c] * wx) * wy;
        const ch = 2 - c;
        out[ch * plane + o] = norm(v, ch);
      }
    }
  }
}

const DET_MEAN = [0.485, 0.456, 0.406], DET_STD = [0.229, 0.224, 0.225];
const detNorm = (v, ch) => (v / 255 - DET_MEAN[ch]) / DET_STD[ch];
const recNorm = (v) => (v / 255 - 0.5) / 0.5;
const r32 = (v) => Math.max(32, Math.round(v / 32) * 32);

// ---- 偵測：找出每一行文字的框 ----
async function detect(px, W, H){
  let scale = Math.min(1, DET_LONG / Math.max(W, H));
  scale = Math.max(scale, Math.min(1, DET_MIN_SHORT / Math.min(W, H)));
  const dw = r32(W * scale), dh = r32(H * scale);
  const input = new Float32Array(3 * dw * dh);
  resizeToCHW(px, W, H, { x: 0, y: 0, w: W, h: H }, dw, dh, input, dw, detNorm);
  const feeds = { [det.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, dh, dw]) };
  const out = (await det.run(feeds))[det.outputNames[0]];
  const prob = out.data; // [1,1,dh,dw]

  // 二值化後找連通區塊（4 連通），每塊算外框與平均分數
  const n = dw * dh;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const boxes = [];
  for (let s = 0; s < n; s++) {
    if (seen[s] || prob[s] <= DET_THRESH) continue;
    let sp = 0; stack[sp++] = s; seen[s] = 1;
    let minX = dw, minY = dh, maxX = 0, maxY = 0, cnt = 0;
    while (sp) {
      const p = stack[--sp];
      const x = p % dw, y = (p - x) / dw;
      cnt++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && !seen[p - 1] && prob[p - 1] > DET_THRESH) { seen[p - 1] = 1; stack[sp++] = p - 1; }
      if (x < dw - 1 && !seen[p + 1] && prob[p + 1] > DET_THRESH) { seen[p + 1] = 1; stack[sp++] = p + 1; }
      if (y > 0 && !seen[p - dw] && prob[p - dw] > DET_THRESH) { seen[p - dw] = 1; stack[sp++] = p - dw; }
      if (y < dh - 1 && !seen[p + dw] && prob[p + dw] > DET_THRESH) { seen[p + dw] = 1; stack[sp++] = p + dw; }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (Math.min(bw, bh) < 3 || cnt < 6) continue;
    // 分數：框內機率平均（官方 box_score_fast 的做法）
    let sum = 0;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) sum += prob[y * dw + x];
    if (sum / (bw * bh) < DET_BOX_THRESH) continue;
    // unclip：模型輸出的區塊比實際文字小一圈，依面積 / 周長往外擴
    const d = (bw * bh * DET_UNCLIP) / (2 * (bw + bh));
    const x0 = minX - d, y0 = minY - d, x1 = maxX + 1 + d, y1 = maxY + 1 + d;
    if (Math.min(x1 - x0, y1 - y0) < 5) continue;
    const sx = W / dw, sy = H / dh;
    boxes.push({
      x0: Math.max(0, x0 * sx), y0: Math.max(0, y0 * sy),
      x1: Math.min(W, x1 * sx), y1: Math.min(H, y1 * sy),
    });
    if (boxes.length >= 1000) break;
  }
  return boxes;
}

// ---- 辨識：每行縮成高 48，一批批丟進模型，CTC 解碼 ----
async function recognize(px, W, H, boxes){
  const items = boxes.map((b, i) => {
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    return { i, b, ratio: w / Math.max(1, h) };
  }).sort((a, b) => a.ratio - b.ratio);
  const results = new Array(boxes.length);
  for (let s = 0; s < items.length; s += REC_BATCH) {
    const batch = items.slice(s, s + REC_BATCH);
    const maxRatio = Math.max(2, ...batch.map(it => it.ratio));
    const bw = Math.min(REC_MAX_W, Math.ceil(REC_H * maxRatio));
    const input = new Float32Array(batch.length * 3 * REC_H * bw); // 批次裡較短的行右邊補 0（正規化後的中間灰）
    batch.forEach((it, k) => {
      const w = Math.min(bw, Math.max(1, Math.ceil(REC_H * it.ratio)));
      const view = input.subarray(k * 3 * REC_H * bw, (k + 1) * 3 * REC_H * bw);
      resizeToCHW(px, W, H, { x: it.b.x0, y: it.b.y0, w: it.b.x1 - it.b.x0, h: it.b.y1 - it.b.y0 }, w, REC_H, view, bw, recNorm);
    });
    const feeds = { [rec.inputNames[0]]: new ort.Tensor('float32', input, [batch.length, 3, REC_H, bw]) };
    const out = (await rec.run(feeds))[rec.outputNames[0]];
    const [N, T, C] = out.dims;
    const data = out.data;
    for (let k = 0; k < N; k++) {
      let text = '', prev = -1, scoreSum = 0, scoreN = 0;
      for (let t = 0; t < T; t++) {
        const base = (k * T + t) * C;
        let best = 0, bestP = data[base];
        for (let c = 1; c < C; c++) { const p = data[base + c]; if (p > bestP) { bestP = p; best = c; } }
        if (best !== 0 && best !== prev) {
          text += best === C - 1 ? ' ' : (dict[best - 1] || '');
          scoreSum += bestP; scoreN++;
        }
        prev = best;
      }
      const b = batch[k].b;
      results[batch[k].i] = {
        text, score: scoreN ? scoreSum / scoreN : 0,
        poly: [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]],
      };
    }
    post({ type: 'progress', stage: 'rec', done: Math.min(items.length, s + REC_BATCH), total: items.length });
  }
  return results;
}

self.onmessage = async (e) => {
  const { id, type } = e.data;
  try {
    if (type === 'init') { await init(); return post({ id, ok: true }); }
    if (type === 'ocr') {
      await init();
      const { width: W, height: H, buffer } = e.data;
      const px = new Uint8ClampedArray(buffer);
      post({ type: 'progress', stage: 'det' });
      const boxes = await detect(px, W, H);
      const items = boxes.length ? await recognize(px, W, H, boxes) : [];
      await ccReady;
      for (const it of items) it.text = toTw(it.text);
      return post({ id, ok: true, items, image: { width: W, height: H } });
    }
  } catch (err) {
    post({ id, ok: false, error: String((err && err.message) || err) });
  }
};
