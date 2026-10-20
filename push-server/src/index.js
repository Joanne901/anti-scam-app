// 防詐小衛 推播伺服器（Cloudflare Worker）
//
// - POST /subscribe    手機開啟通知時，把訂閱資料存起來
// - POST /unsubscribe  關閉通知
// - POST /test         傳一則測試通知給「自己」（只能傳給已訂閱的那支手機）
// - 排程（每 5 分鐘）   讀網站的 version.json，有新版本就推播給所有訂閱者
//
// 免費方案每次執行最多約 50 個對外連線，所以推播分批送，每批 BATCH 支手機，
// 下次排程接著送，直到全部送完。
import { buildPushRequest } from './webpush.js';

const BATCH = 40;
const MIN_GAP_MS = 60 * 60 * 1000; // 兩次更新推播至少隔 1 小時，短時間連續更新只推最新那次
const SKIP_TAG = '[不通知]';       // commit 標題含這個字就不推播

// 只接受各大瀏覽器的推播服務網址，避免伺服器被拿去連其他網站
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/,
  /\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/,
];

const json = (data, status = 200, origin) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', ...cors(origin) },
});

function cors(origin){
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'origin',
  };
}

function allowedOrigin(req, env){
  const o = req.headers.get('origin') || '';
  return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(o) ? o : null;
}

async function keyFor(endpoint){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return 'sub:' + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function validSubscription(s){
  if (!s || typeof s.endpoint !== 'string' || !s.keys || typeof s.keys.p256dh !== 'string' || typeof s.keys.auth !== 'string') return false;
  let u;
  try { u = new URL(s.endpoint); } catch { return false; }
  return u.protocol === 'https:' && PUSH_HOSTS.some(re => re.test(u.hostname)) && s.endpoint.length < 1000;
}

// 傳一則推播；回傳 'ok' | 'gone'（訂閱已失效，要刪掉）| 'error'
async function sendOne(env, subscription, payload){
  try {
    const { endpoint, headers, body } = await buildPushRequest({
      subscription, payload,
      privateJWK: env.VAPID_PRIVATE_JWK,
      contact: env.ADMIN_CONTACT,
      ttl: 86400, urgency: 'normal', topic: 'app-update',
    });
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    if (res.status === 404 || res.status === 410) return 'gone';
    if (!res.ok) console.log('push failed', new URL(endpoint).hostname, res.status, (await res.text()).slice(0, 200));
    return res.ok ? 'ok' : 'error';
  } catch (e) {
    console.log('push error', e && e.message);
    return 'error';
  }
}

// ---- 新版本偵測與分批推播 ----
async function checkForNewVersion(env){
  const res = await fetch(env.VERSION_URL + '?t=' + Date.now(), { cf: { cacheTtl: 0 } });
  if (!res.ok) return { checked: false };
  const v = await res.json();
  if (!v.bundle) return { checked: false };

  const last = await env.SUBS.get('state:lastBundle');
  if (!last) { await env.SUBS.put('state:lastBundle', v.bundle); return { first: true }; } // 第一次只記下來
  if (last === v.bundle) return { same: true };

  if ((v.note || '').includes(SKIP_TAG)) { await env.SUBS.put('state:lastBundle', v.bundle); return { skipped: true }; }

  const lastPushAt = +(await env.SUBS.get('state:lastPushAt')) || 0;
  if (Date.now() - lastPushAt < MIN_GAP_MS) return { waiting: true }; // 晚點再推（推的會是那時最新的版本）

  // 開始一輪推播（之前若有沒送完的，新的直接取代）
  const note = (v.note || '').replace(SKIP_TAG, '').trim();
  await env.SUBS.put('state:broadcast', JSON.stringify({
    payload: { title: '防詐小衛有新版本', body: note || '點一下打開，使用最新的功能與偵測規則。', url: env.APP_URL },
    cursor: null,
  }));
  await env.SUBS.put('state:lastBundle', v.bundle);
  await env.SUBS.put('state:lastPushAt', String(Date.now()));
  return { started: true };
}

async function continueBroadcast(env){
  const raw = await env.SUBS.get('state:broadcast');
  if (!raw) return { idle: true };
  const job = JSON.parse(raw);
  const page = await env.SUBS.list({ prefix: 'sub:', limit: BATCH, cursor: job.cursor || undefined });
  let sent = 0, gone = 0;
  await Promise.all(page.keys.map(async (k) => {
    const sub = await env.SUBS.get(k.name, 'json');
    if (!sub) return;
    const r = await sendOne(env, sub, job.payload);
    if (r === 'ok') sent++;
    if (r === 'gone') { gone++; await env.SUBS.delete(k.name); }
  }));
  if (page.list_complete) await env.SUBS.delete('state:broadcast');
  else await env.SUBS.put('state:broadcast', JSON.stringify({ ...job, cursor: page.cursor }));
  return { sent, gone, done: page.list_complete };
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    const origin = allowedOrigin(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'anti-scam-push' });
    if (req.method !== 'POST') return json({ error: 'not found' }, 404, origin);
    if (!origin) return json({ error: 'origin not allowed' }, 403);

    let data;
    try { data = await req.json(); } catch { return json({ error: 'bad json' }, 400, origin); }

    if (url.pathname === '/subscribe') {
      if (!validSubscription(data)) return json({ error: 'invalid subscription' }, 400, origin);
      const sub = { endpoint: data.endpoint, keys: { p256dh: data.keys.p256dh, auth: data.keys.auth } };
      await env.SUBS.put(await keyFor(sub.endpoint), JSON.stringify(sub));
      return json({ ok: true }, 200, origin);
    }
    if (url.pathname === '/unsubscribe') {
      if (typeof data.endpoint !== 'string') return json({ error: 'missing endpoint' }, 400, origin);
      await env.SUBS.delete(await keyFor(data.endpoint));
      return json({ ok: true }, 200, origin);
    }
    if (url.pathname === '/test') {
      if (typeof data.endpoint !== 'string') return json({ error: 'missing endpoint' }, 400, origin);
      const sub = await env.SUBS.get(await keyFor(data.endpoint), 'json');
      if (!sub) return json({ error: 'not subscribed' }, 404, origin);
      const r = await sendOne(env, sub, { title: '防詐小衛', body: '通知設定成功！之後有新版本會這樣提醒你。', url: env.APP_URL });
      if (r === 'gone') await env.SUBS.delete(await keyFor(data.endpoint));
      return json({ ok: r === 'ok', result: r }, r === 'ok' ? 200 : 502, origin);
    }
    return json({ error: 'not found' }, 404, origin);
  },

  async scheduled(event, env, ctx){
    ctx.waitUntil((async () => {
      await checkForNewVersion(env);
      await continueBroadcast(env);
    })());
  },
};
