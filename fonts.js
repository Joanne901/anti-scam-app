// 字體：英文與數字 Inter、中文思源黑體（Noto Sans TC），每支手機、兩種外觀看起來都一樣俐落、位置一致。
// 只在網頁版生效：從 Google Fonts 載入，再用一條全域樣式蓋過預設的系統字體。
// 網址拆解那種要等寬的字，在 Text 加 dataSet={{ mono: true }} 就會改用等寬字體。
import { Platform } from 'react-native';

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700&display=swap';
const SANS = '"Inter", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

function loadFontFiles(){
  if (document.getElementById('app-fonts')) return;
  const head = document.head;
  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    const pre = document.createElement('link');
    pre.rel = 'preconnect'; pre.href = href;
    if (href.includes('gstatic')) pre.crossOrigin = 'anonymous';
    head.appendChild(pre);
  }
  const link = document.createElement('link');
  link.id = 'app-fonts'; link.rel = 'stylesheet'; link.href = FONT_CSS;
  head.appendChild(link);
}

// on＝用俐落字體；off＝回到手機內建字體（字體檔只在第一次需要時才下載）
export function setAppFont(on){
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  let style = document.getElementById('app-font-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'app-font-style';
    document.head.appendChild(style);
  }
  if (on) loadFontFiles();
  style.textContent = on
    ? `body, body *:not([data-mono]) { font-family: ${SANS} !important; }` +
      `body [data-mono], body [data-mono] * { font-family: ${MONO} !important; }`
    : '';
}
