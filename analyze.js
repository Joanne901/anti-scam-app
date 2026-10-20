import { TWO_LEVEL, SUSPICIOUS_TLD, BRANDS, SHORT_LABEL_BRANDS, GOODLIST, PATTERNS } from './data';

// 自己解析 URL,避免各家 JS 引擎對 new URL() 支援不一致
export function parseUrl(raw){
  raw = (raw || '').trim();
  let scheme = '', rest = raw;
  const m = raw.match(/^([a-z][a-z0-9+.\-]*):\/\//i);
  if (m) { scheme = m[1].toLowerCase(); rest = raw.slice(m[0].length); }
  const hostPart = rest.split(/[/?#]/)[0];
  let host = hostPart, hadAt = false;
  if (host.includes('@')) { hadAt = true; host = host.split('@').pop(); }
  host = host.split(':')[0].toLowerCase();
  const qi = rest.indexOf('?');
  const query = qi !== -1 ? rest.slice(qi) : '';
  return { scheme, host, query, hadAt };
}

// 抓出網域真正的所有者(eTLD+1)
export function registrable(host){
  const l = host.split('.').filter(Boolean);
  if (l.length <= 2) return host;
  const last2 = l.slice(-2).join('.');
  if (TWO_LEVEL.has(last2)) return l.length >= 3 ? l.slice(-3).join('.') : host;
  return last2;
}

export function analyzeUrl(raw){
  raw = (raw || '').trim();
  if (!raw) return null;
  const { scheme, host, hadAt } = parseUrl(raw);

  const reasons = [];
  let score = 0;
  const add = (lvl, text) => {
    reasons.push({ level: lvl, text });
    score += lvl === 'hi' ? 100 : lvl === 'mid' ? 40 : lvl === 'lo' ? 15 : 0;
  };

  const lower = raw.toLowerCase();
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const reg = host ? registrable(host) : '';
  const tld = host ? host.split('.').pop() : '';
  const compact = host.replace(/[^a-z0-9]/g, '');
  const tokens = host.split(/[^a-z0-9]+/).filter(Boolean);
  const labels = host.split('.').filter(Boolean);

  let overviewText = host
    ? (isIP ? `這是一組 IP 位址：${host}` : `這個網址真正的所有者，要看最後這段：${reg}`)
    : '無法解析出標準網域，格式本身就很可疑。';

  if (hadAt) add('hi', '網址裡含有 @ 符號，常被用來把你導去 @ 後面的真實網站，前面全是幌子。');
  if (isIP)  add('hi', '主機是一串 IP 位址而不是網域名稱，正規服務幾乎不會這樣給連結。');
  if (host.includes('xn--')) add('hi', '網域使用 Punycode（xn--）編碼，可能用相似字母假冒知名網站。');

  // 品牌冒用(核心判斷)
  let brandFlagged = false;
  const inOfficial = (doms) => doms.some(d => reg === d || host === d || host.endsWith('.' + d));
  for (const b of BRANDS) {
    let hit = false;
    for (const k of b.keys) { if (compact.includes(k)) { hit = true; break; } }
    if (!hit) for (const r of b.raw) {
      const rc = r.replace(/[^a-z0-9]/g, '');
      if (rc) { if (compact.includes(rc)) hit = true; }
      else if (host.includes(r)) hit = true;
    }
    if (hit && !inOfficial(b.domains)) {
      brandFlagged = true;
      add('hi', `網址裡出現「${b.name}」字樣，但真正網域是 ${reg}，和官方的 ${b.domains[0]} 不一樣 — 這是冒牌。`);
    }
  }
  for (const b of SHORT_LABEL_BRANDS) {
    if (tokens.includes(b.key) && !b.domains.some(d => reg === d || host.endsWith('.' + d))) {
      brandFlagged = true;
      add('hi', `網址含有「${b.name}」字樣，但網域 ${reg} 不是官方的 ${b.domains[0]}。`);
    }
  }

  // 用連字號偽裝 .com.tw / .com
  if (/(^|[.\-])com[.\-]tw([.\-]|$)/.test(host) && !reg.endsWith('.com.tw'))
    add('hi', '網址裡塞了 com.tw 字樣假裝是官方，但它其實不是 .com.tw 結尾的網域，是混淆手法。');
  else if (/[a-z0-9]-com([.\-]|$)/.test(host) && tld !== 'com' && !reg.endsWith('.com'))
    add('mid', '用連字號把「-com」接在名稱後面，假裝是某個 .com 官網。');

  // 可疑頂級網域
  if (SUSPICIOUS_TLD.has(tld) && !GOODLIST.has(reg))
    add(brandFlagged ? 'lo' : 'mid', `結尾是 .${tld}，這類網域申請便宜、常被詐騙集團大量註冊；不一定是壞的，但要更小心。`);

  // 子網域過多
  const subCount = Math.max(0, labels.length - reg.split('.').length);
  if (!isIP && subCount >= 2) add('lo', `網域前面疊了 ${subCount} 層子名稱，常見手法是把看似官方的字串放前面誤導你。`);

  if (scheme === 'http') add('lo', '連線是 http（非加密），輸入的資料可能被攔截。');

  if (/[?&](fbclid|utm_source|utm_campaign|igshid|gclid)=/.test(lower))
    add('info', '連結帶有 fbclid / utm 參數，代表是從臉書、IG、Messenger 點出來的 — 詐騙常透過社群散布。');

  if (!isIP && (host.length > 40 || host.replace(/[^0-9]/g, '').length >= 6))
    add('lo', '主機名稱很長或夾帶大量數字，較不像正規品牌網域。');

  const highCount = reasons.filter(r => r.level === 'hi').length;
  if (GOODLIST.has(reg) && highCount === 0)
    overviewText += `\n✓ ${reg} 屬於常見的正規網域。`;

  let level, emoji, label, meta;
  if (score >= 100)      { level = 'danger'; emoji = '⛔'; label = '高風險・很可能是詐騙'; meta = '強烈建議不要點、不要輸入任何個資。'; }
  else if (score >= 40)  { level = 'warn';   emoji = '⚠️'; label = '可疑・請提高警覺';     meta = '有明顯危險訊號，建議改用官方管道確認。'; }
  else if (score > 0)    { level = 'low';    emoji = '🔎'; label = '有一些疑慮';             meta = '未見重大問題，但仍有可注意之處。'; }
  else                   { level = 'ok';     emoji = '✅'; label = '未發現明顯危險訊號';     meta = '看起來沒問題，但工具無法保證安全，仍請自行確認。'; }

  return { level, emoji, label, meta, overviewText, reg: isIP ? host : (reg || host), reasons };
}

// 把命中的關鍵字切成可標記的片段
function buildSegments(text, words){
  if (!words.length) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const ranges = [];
  words.forEach(w => {
    const wl = w.toLowerCase();
    let i = 0;
    while ((i = lower.indexOf(wl, i)) !== -1) { ranges.push([i, i + w.length]); i += w.length; }
  });
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  const segs = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) segs.push({ text: text.slice(pos, s), hit: false });
    segs.push({ text: text.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), hit: false });
  return segs;
}

// 從訊息中找出網址（含沒寫 http 的 xxx.com/...），逐一用 analyzeUrl 判斷
const LINK_RE = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[\/?#][^\s<>"'，。、）)\]」]*)?/gi;
export function findLinks(text){
  const out = [];
  const seen = new Set();
  let m;
  while ((m = LINK_RE.exec(text))) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    if (text[m.index - 1] === '@') continue; // email
    const { host } = parseUrl(url);
    if (!/[a-z]/i.test(host) || seen.has(host)) continue;
    seen.add(host);
    out.push({ url, ...analyzeUrl(url) });
  }
  return out;
}

export function scanMessage(text){
  text = (text || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const positions = (w) => {
    const wl = w.toLowerCase(), out = [];
    for (let i = lower.indexOf(wl); i !== -1; i = lower.indexOf(wl, i + 1)) out.push(i);
    return out;
  };
  const candidates = new Set(PATTERNS.flatMap(p => p.words.filter(w => lower.includes(w.toLowerCase()))));
  // 只出現在更長命中詞裡面的不算（例:「輸入金額」裡的「入金」、「款項無法匯入」裡的「無法匯入」）
  const spans = [...candidates].flatMap(w => positions(w).map(s => [s, s + w.length, w]));
  const covered = (w) => positions(w).every(s =>
    spans.some(([a, b, o]) => o !== w && o.length > w.length && a <= s && s + w.length <= b));

  const hitTypes = [];
  const all = new Set();
  for (const p of PATTERNS) {
    const found = p.words.filter(w => candidates.has(w) && !covered(w));
    if (found.length) { hitTypes.push({ type: p.type, tip: p.tip, found }); found.forEach(w => all.add(w)); }
  }
  const words = [...all];
  const segments = buildSegments(text, words);
  const total = words.length;

  const strongSet = ['假冒檢警／監管帳戶', '要求敏感資料', '網拍／賣貨便金流釣魚', '解除分期付款', '假客服／簽署物流金流協議', '遊戲點數／超商代碼', '假冒銀行／盜刷通知', '猜猜我是誰／假親友'];
  const strong = hitTypes.some(h => strongSet.includes(h.type));

  let level, emoji, label, meta;
  if (total >= 4 || (strong && total >= 2)) {
    level = 'danger'; emoji = '⛔'; label = '高度可疑・強烈建議不要回應';
    meta = '命中多項詐騙常見話術。不要點連結、不要轉帳、不要提供任何個資。';
  } else if (total >= 1) {
    level = 'warn'; emoji = '⚠️'; label = '出現可疑訊號';
    meta = '有詐騙常用的字眼，建議透過官方管道查證再行動。';
  } else {
    level = 'ok'; emoji = '✅'; label = '未命中常見詐騙關鍵字';
    meta = '沒抓到明顯話術，但仍請依情境判斷，尤其涉及金錢時。';
  }

  // 訊息裡的連結若有高風險，整體判定跟著提高
  const links = findLinks(text);
  if (links.some(l => l.level === 'danger') && level !== 'danger') {
    level = 'danger'; emoji = '⛔'; label = '高度可疑・訊息含高風險連結';
    meta = '訊息裡的連結有明顯的釣魚特徵。不要點連結、不要轉帳、不要提供任何個資。';
  } else if (links.some(l => l.level === 'warn') && level === 'ok') {
    level = 'warn'; emoji = '⚠️'; label = '訊息含可疑連結';
    meta = '連結有危險訊號，建議不要點，改用官方 App 或官網查證。';
  }

  return { level, emoji, label, meta, hitTypes, segments, total, links };
}
