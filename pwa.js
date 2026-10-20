// 網頁版專用：檢查新版本、加到主畫面提示
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// ---- 新版本檢查 ----
// 打包時會產生 version.json（記錄當版程式檔名與更新說明），和目前頁面載入的程式檔名不同就代表有新版
function currentBundle(){
  const s = document.querySelector('script[src*="_expo/static/js/web/"]');
  const m = s && s.getAttribute('src').match(/_expo\/static\/js\/web\/[^?#]+\.js/);
  return m ? m[0] : null;
}

export async function checkForUpdate(){
  if (!isWeb) return null;
  const mine = currentBundle();
  if (!mine) return null; // 開發模式沒有打包檔，不檢查
  try {
    const url = new URL('version.json', document.baseURI || window.location.href);
    url.searchParams.set('t', Date.now());
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const v = await res.json();
    return v.bundle && v.bundle !== mine ? v : null;
  } catch {
    return null;
  }
}

export function onAppVisible(cb){
  if (!isWeb) return () => {};
  const h = () => { if (document.visibilityState === 'visible') cb(); };
  document.addEventListener('visibilitychange', h);
  return () => document.removeEventListener('visibilitychange', h);
}

// ---- 加到主畫面 ----
let deferredPrompt = null;
const promptListeners = new Set();
if (isWeb) {
  // Android Chrome 會在可安裝時發出這個事件，先攔下來，等使用者按「安裝」再叫出系統視窗
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach(f => f());
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; promptListeners.forEach(f => f()); });
}

export function onInstallAvailable(cb){
  promptListeners.add(cb);
  return () => promptListeners.delete(cb);
}

export function canPromptInstall(){ return !!deferredPrompt; }

// 回傳 true / false（使用者按安裝 / 取消）；沒有系統安裝視窗可叫時回傳 null
export async function promptInstall(){
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

export function isStandalone(){
  if (!isWeb) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function deviceKind(){
  if (!isWeb) return 'native';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

// iPhone 上用的是哪個瀏覽器（加到主畫面的按鈕位置不同）
export function iosBrowser(){
  const ua = (isWeb && navigator.userAgent) || '';
  if (/CriOS/i.test(ua)) return 'chrome';
  if (/FxiOS|EdgiOS|OPiOS/i.test(ua)) return 'other';
  return 'safari';
}

// iOS 主版本（Safari 會寫在 Version/xx，其他瀏覽器看 iPhone OS xx_）
export function iosMajor(){
  const ua = (isWeb && navigator.userAgent) || '';
  const m = ua.match(/Version\/(\d+)/) || ua.match(/OS (\d+)_/);
  return m ? +m[1] : 0;
}

export function androidBrowser(){
  const ua = (isWeb && navigator.userAgent) || '';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox/i.test(ua)) return 'firefox';
  return 'chrome';
}

export function inLineApp(){
  return isWeb && /Line\//i.test(navigator.userAgent || '');
}

// LINE 內建瀏覽器看到網址帶 openExternalBrowser=1，會改用手機預設瀏覽器開啟
export function openInExternalBrowser(){
  const u = new URL(window.location.href);
  u.searchParams.set('openExternalBrowser', '1');
  window.location.href = u.toString();
}

// 在 LINE / FB / IG 內建瀏覽器裡無法加到主畫面
export function inAppBrowser(){
  if (!isWeb) return false;
  return /Line\/|FBAN|FBAV|Instagram/i.test(navigator.userAgent || '');
}

// 按 ✕ 只會暫停提示幾天，不是永遠不出現（舊版存的 '1' 視為已過期）
const DISMISS_KEY = 'installTipDismissed';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
export function installTipDismissed(){
  try {
    const t = +localStorage.getItem(DISMISS_KEY);
    return t > 1 && Date.now() - t < SNOOZE_MS;
  } catch { return false; }
}
export function dismissInstallTip(){
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}
