// 更新通知（Web Push）：使用者按「開啟更新通知」後，手機向推播伺服器訂閱；
// 之後網站有新版本，推播伺服器（push-server/，Cloudflare Worker）會自動送通知，App 關著也收得到。
//  Android：Chrome 等瀏覽器直接可用
//  iPhone：iOS 16.4 以上，而且要先「加到主畫面」、從主畫面打開才能用（Apple 的規定）
import { Platform } from 'react-native';

// 本機開發時連本機的推播伺服器（wrangler dev），正式網站連 Cloudflare
export const PUSH_SERVER = (typeof location !== 'undefined' && location.hostname === 'localhost')
  ? 'http://localhost:8787'
  : 'https://anti-scam-push.anti-scam-push.workers.dev';
export const VAPID_PUBLIC_KEY = 'BNjxVPnXcnbejZ07MeKQPMWtpKolrA-wTlyPa_gMCGErH0UVh1KJ9LhmjKrjljPxjfmE9UKu2PoE9cSFFJbZNKY';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export function pushSupported(){
  return isWeb && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function siteBase(){
  const s = document.querySelector('script[src*="_expo/static/js/"]');
  return s ? s.src.split('_expo/')[0] : new URL('/', window.location.href).href;
}

function urlB64ToBytes(b64){
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function registration(){
  const base = siteBase();
  return navigator.serviceWorker.register(base + 'sw.js', { scope: new URL(base).pathname });
}

async function post(path, body){
  const res = await fetch(PUSH_SERVER + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('推播伺服器回應錯誤（' + res.status + '）');
  return res.json();
}

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushStatus(){
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration(new URL(siteBase()).pathname);
    const sub = reg && await reg.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch { return 'off'; }
}

// 必須在使用者按按鈕時呼叫（iPhone 規定要由使用者動作觸發）
export async function enablePush(){
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(VAPID_PUBLIC_KEY) });
  }
  await post('/subscribe', sub.toJSON());
  return 'on';
}

export async function disablePush(){
  const reg = await navigator.serviceWorker.getRegistration(new URL(siteBase()).pathname);
  const sub = reg && await reg.pushManager.getSubscription();
  if (sub) {
    try { await post('/unsubscribe', { endpoint: sub.endpoint }); } catch {}
    await sub.unsubscribe();
  }
  return 'off';
}

export async function sendTestPush(){
  const reg = await navigator.serviceWorker.getRegistration(new URL(siteBase()).pathname);
  const sub = reg && await reg.pushManager.getSubscription();
  if (!sub) throw new Error('還沒開啟通知');
  return post('/test', { endpoint: sub.endpoint });
}

// 已開啟通知的人，每次打開 App 都重新回報一次訂閱（訂閱偶爾會被瀏覽器換新）
export async function refreshPushSubscription(){
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(new URL(siteBase()).pathname);
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await post('/subscribe', sub.toJSON());
  } catch {}
}
