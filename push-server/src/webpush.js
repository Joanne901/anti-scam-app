// Web Push 送出（只用 Web Crypto，不靠其他套件）
//  - 內容加密：RFC 8291 / RFC 8188 的 aes128gcm（Chrome、Firefox、Safari / Apple 都支援的標準格式）
//  - 身分簽章：RFC 8292 VAPID（ES256 JWT）
const enc = new TextEncoder();

const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function fromB64u(s){
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

async function hkdf(salt, ikm, info, length){
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

// 把 payload 用訂閱者的公鑰加密成 aes128gcm 格式
async function encrypt(subscription, payload){
  const uaPublic = fromB64u(subscription.keys.p256dh);
  const authSecret = fromB64u(subscription.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const plain = concat(enc.encode(JSON.stringify(payload)), new Uint8Array([2])); // 2 = 最後一段的分隔字元
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));

  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);  // record size
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

// 私鑰（JWK）可能以字串、被跳脫過的字串或物件傳進來，都轉成物件
function parseJwk(v){
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch { v = v.replace(/\\"/g, '"'); }
  }
  if (!v || !v.d || !v.x || !v.y) throw new Error('VAPID_PRIVATE_JWK 格式不正確');
  return v;
}

// VAPID：證明推播是我們的伺服器送的
async function vapidHeader(endpoint, privateJWK, contact){
  const jwk = parseJwk(privateJWK);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: contact,
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + claims));
  const publicKey = b64u(concat(new Uint8Array([4]), fromB64u(jwk.x), fromB64u(jwk.y)));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${publicKey}`;
}

export async function buildPushRequest({ subscription, payload, privateJWK, contact, ttl = 86400, urgency = 'normal', topic }){
  const body = await encrypt(subscription, payload);
  const headers = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(ttl),
    Urgency: urgency,
    Authorization: await vapidHeader(subscription.endpoint, privateJWK, contact),
  };
  if (topic) headers.Topic = topic;
  return { endpoint: subscription.endpoint, headers, body };
}
