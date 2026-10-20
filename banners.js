// 浮在分頁列下方的提示卡：有新版本 / 加到主畫面（只在網頁版出現）
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from './theme';
import { checkForUpdate, onAppVisible, installTipDismissed, dismissInstallTip } from './pwa';
import { canShowInstall, startInstall } from './install';

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

function useInstallTip(){
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!canShowInstall() || installTipDismissed()) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);
  const close = () => { dismissInstallTip(); setVisible(false); };
  return { visible, close };
}

export default function Banners({ top }){
  const { update, dismiss } = useUpdate();
  const { visible: showInstall, close } = useInstallTip();
  if (Platform.OS !== 'web') return null;

  let toast = null;
  if (update) {
    toast = (
      <Toast icon="✨" title="防詐小衛有新版本" body={update.note || '更新後就能使用最新的功能與偵測規則。'}
        action="立即更新" onAction={() => window.location.reload()} onClose={dismiss} />
    );
  } else if (showInstall) {
    toast = (
      <Toast icon="📲" title="加到主畫面" body="像 App 一樣,從手機桌面直接打開。" action="加到主畫面"
        onAction={() => { close(); startInstall(); }} onClose={close} />
    );
  }
  if (!toast) return null;
  return <View style={{ position: 'absolute', top, left: 12, right: 12, zIndex: 50 }}>{toast}</View>;
}
