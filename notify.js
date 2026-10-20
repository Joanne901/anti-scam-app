// 「更新通知」卡片：開啟 / 關閉推播、傳測試通知（只在網頁版出現）
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from './theme';
import Icon from './icons';
import { isStandalone, deviceKind } from './pwa';
import { startInstall } from './install';
import { pushSupported, pushStatus, enablePush, disablePush, sendTestPush, refreshPushSubscription } from './push';

function SmallBtn({ title, onPress, primary }){
  const c = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{
      backgroundColor: primary ? c.solid : c.surface2, borderWidth: primary ? 0 : 1, borderColor: c.border,
      borderRadius: 10, paddingVertical: 8, paddingHorizontal: 13, marginLeft: 8,
    }}>
      <Text style={{ color: primary ? c.solidInk : c.text, fontWeight: '800', fontSize: 13 }}>{title}</Text>
    </TouchableOpacity>
  );
}

export function NotifyCard(){
  const c = useTheme();
  const [status, setStatus] = useState(null); // 'unsupported' | 'denied' | 'on' | 'off'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    pushStatus().then(setStatus);
    refreshPushSubscription();
  }, []);

  if (Platform.OS !== 'web' || !status) return null;
  const ios = deviceKind() === 'ios';
  const needHomeScreen = ios && !isStandalone() && !pushSupported();
  if (status === 'unsupported' && !needHomeScreen) return null;

  const run = (fn, okMsg) => async () => {
    setBusy(true); setMsg('');
    try { const s = await fn(); if (typeof s === 'string') setStatus(s); if (okMsg) setMsg(okMsg); }
    catch (e) { setMsg((e && e.message) || '發生錯誤，請再試一次'); }
    finally { setBusy(false); }
  };

  let body, actions;
  if (needHomeScreen) {
    body = 'iPhone 要先「加到主畫面」，再從主畫面的圖示打開，才能開啟通知（Apple 的規定）。';
    actions = <SmallBtn primary title="加入" onPress={startInstall} />;
  } else if (status === 'denied') {
    body = ios
      ? '通知被關掉了。請到 iPhone「設定 → 通知 → 防詐小衛」開啟「允許通知」。'
      : '通知被封鎖了。請點網址列左邊的圖示 →「權限」或「網站設定」，把通知改成允許。';
  } else if (status === 'on') {
    body = '已開啟 ✓ 有新版本時，手機會跳出通知，App 關著也收得到。';
    actions = (
      <>
        <SmallBtn title="測試" onPress={run(async () => { await sendTestPush(); }, '測試通知已送出，幾秒內會收到。')} />
        <SmallBtn title="關閉" onPress={run(disablePush, '已關閉更新通知。')} />
      </>
    );
  } else {
    body = '有新版本時跳出通知提醒你，App 關著也收得到。';
    actions = <SmallBtn primary title="開啟" onPress={run(enablePush, '已開啟！可以按「測試」試試看。')} />;
  }

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 13, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Icon name="bell" size={22} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: c.text }}>更新通知</Text>
          <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 2, lineHeight: 18 }}>{body}</Text>
        </View>
        {busy ? <ActivityIndicator style={{ marginLeft: 10 }} color={c.primary} /> : actions}
      </View>
      {msg ? <Text style={{ fontSize: 12.5, color: c.primary, marginTop: 9, fontWeight: '700' }}>{msg}</Text> : null}
    </View>
  );
}
