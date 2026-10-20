// 浮在分頁列下方的提示卡：有新版本 / 加到主畫面（只在網頁版出現）
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from './theme';
import {
  checkForUpdate, onAppVisible,
  onInstallAvailable, canPromptInstall, promptInstall,
  isStandalone, deviceKind, iosBrowser, inAppBrowser, installTipDismissed, dismissInstallTip,
} from './pwa';

const UPDATE_INTERVAL = 5 * 60 * 1000;

function Toast({ icon, title, body, action, onAction, onClose }){
  const c = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.primary, padding: 12,
      shadowColor: '#141929', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6,
    }}>
      <Text style={{ fontSize: 22, marginRight: 10 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{title}</Text>
        {body ? <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 2, lineHeight: 18 }}>{body}</Text> : null}
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.85} style={{ backgroundColor: c.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 10 }}>
          <Text style={{ color: c.primaryInk, fontWeight: '800', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity onPress={onClose} hitSlop={10} style={{ paddingLeft: 10 }}>
        <Text style={{ color: c.textFaint, fontSize: 18 }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function useUpdate(){
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = () => checkForUpdate().then(v => { if (alive && v) setUpdate(v); });
    check();
    const t = setInterval(check, UPDATE_INTERVAL);
    const off = onAppVisible(check);
    return () => { alive = false; clearInterval(t); off(); };
  }, []);
  const show = update && update.bundle !== dismissed;
  return { update: show ? update : null, dismiss: () => setDismissed(update?.bundle) };
}

// 依手機與瀏覽器給對應的步驟
export function installMessage(kind, canPrompt){
  if (inAppBrowser()) return { body: '請點右上角選單,改用 Safari 或 Chrome 開啟本頁,就能加到主畫面。' };
  if (kind === 'ios') {
    const br = iosBrowser();
    if (br === 'chrome') return { body: '點網址列右邊的「分享」⬆️,往下找「加入主畫面」,就能像 App 一樣使用。' };
    if (br === 'other') return { body: '請改用 Safari 開啟本頁,點下方「分享」⬆️,再選「加入主畫面」。' };
    return { body: '點 Safari 下方的「分享」⬆️,往下找「加入主畫面」,就能像 App 一樣使用。' };
  }
  if (kind === 'android' && canPrompt) return { body: '一鍵安裝到主畫面,像 App 一樣使用。', action: '安裝' };
  if (kind === 'android') return { body: '點 Chrome 右上角 ⋮,選「加到主畫面」或「安裝應用程式」。' };
  return null;
}

// 是否該顯示「加到主畫面」（網頁版、手機、還沒從主畫面開啟）
export function canShowInstall(){
  if (Platform.OS !== 'web' || isStandalone()) return false;
  const kind = deviceKind();
  return kind === 'ios' || kind === 'android';
}

// 固定放在頁面上的「加到主畫面」卡片，提示被關掉也還找得到
export function InstallCard(){
  const c = useTheme();
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  useEffect(() => onInstallAvailable(() => setCanPrompt(canPromptInstall())), []);
  if (!canShowInstall()) return null;
  const msg = installMessage(deviceKind(), canPrompt);
  if (!msg) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 13, marginBottom: 14 }}>
      <Text style={{ fontSize: 22, marginRight: 11 }}>📲</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>加到手機主畫面</Text>
        <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 3, lineHeight: 18 }}>{msg.body}</Text>
      </View>
      {msg.action ? (
        <TouchableOpacity onPress={() => promptInstall()} activeOpacity={0.85} style={{ backgroundColor: c.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 10 }}>
          <Text style={{ color: c.primaryInk, fontWeight: '800', fontSize: 13 }}>{msg.action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function useInstallTip(){
  const [visible, setVisible] = useState(false);
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  useEffect(() => {
    if (!canShowInstall() || installTipDismissed()) return;
    const t = setTimeout(() => setVisible(true), 2500);
    const off = onInstallAvailable(() => setCanPrompt(canPromptInstall()));
    return () => { clearTimeout(t); off(); };
  }, []);
  const msg = visible ? installMessage(deviceKind(), canPrompt) : null;
  const close = () => { dismissInstallTip(); setVisible(false); };
  return { msg, close };
}

export default function Banners({ top }){
  const { update, dismiss } = useUpdate();
  const { msg, close } = useInstallTip();
  if (Platform.OS !== 'web') return null;

  let toast = null;
  if (update) {
    toast = (
      <Toast icon="✨" title="防詐小衛有新版本" body={update.note || '更新後就能使用最新的功能與偵測規則。'}
        action="立即更新" onAction={() => window.location.reload()} onClose={dismiss} />
    );
  } else if (msg) {
    toast = (
      <Toast icon="📲" title="加到主畫面" body={msg.body} action={msg.action}
        onAction={async () => { await promptInstall(); close(); }} onClose={close} />
    );
  }
  if (!toast) return null;
  return <View style={{ position: 'absolute', top, left: 12, right: 12, zIndex: 50 }}>{toast}</View>;
}
