// 「加到主畫面」：一個按鈕，依手機系統做對應的事（只在網頁版出現）
//  Android（Chrome / Edge 等）→ 直接叫出系統的安裝視窗，確認就裝好
//  iPhone → Apple 不允許網站自己加到主畫面，只能由使用者按瀏覽器的「分享 → 加入主畫面」，
//           所以跳出圖解步驟，並用箭頭指出分享按鈕在哪裡
//  LINE 內建瀏覽器 → 直接跳到手機瀏覽器開啟（LINE 內無法加到主畫面）
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';
import { useTheme } from './theme';
import {
  onInstallAvailable, canPromptInstall, promptInstall,
  isStandalone, deviceKind, iosBrowser, iosMajor, androidBrowser, inAppBrowser, inLineApp, openInExternalBrowser,
} from './pwa';

// 網頁版、手機、還沒從主畫面開啟時才需要
export function canShowInstall(){
  if (Platform.OS !== 'web' || isStandalone()) return false;
  const kind = deviceKind();
  return kind === 'ios' || kind === 'android';
}

let openGuide = null; // 由 <InstallGuide /> 掛上

// 按鈕按下去要做的事
export async function startInstall(){
  if (inLineApp()) { openInExternalBrowser(); return; }
  if (canPromptInstall()) {
    const ok = await promptInstall();
    if (ok !== null) return; // 系統視窗有出現（不論使用者按安裝或取消）
  }
  openGuide && openGuide();
}

// ---- 依瀏覽器決定圖解內容與箭頭位置 ----
function guideFor(){
  const kind = deviceKind();
  if (inAppBrowser()) {
    return {
      intro: '在臉書 / IG 裡面沒辦法加到主畫面,要先換到手機瀏覽器。',
      arrow: 'topRight',
      steps: [['點右上角的「⋯」', '⋯'], ['選「在外部瀏覽器開啟」', '↗'], ['開好之後,再按一次「加到主畫面」', '📲']],
    };
  }
  if (kind === 'ios') {
    const br = iosBrowser();
    if (br === 'chrome') {
      return {
        intro: 'iPhone 規定要從瀏覽器的分享選單加入,跟著三步驟就好。',
        arrow: 'topShare',
        steps: [['點網址列右邊的「分享」', '⬆'], ['往下滑,點「加入主畫面」', '＋'], ['點右上角「加入」', '✓']],
      };
    }
    if (br === 'other') {
      return {
        intro: '這個瀏覽器可能找不到「加入主畫面」,建議改用 Safari 開啟本頁。',
        arrow: null,
        steps: [['點瀏覽器的「分享」', '⬆'], ['找「加入主畫面」', '＋'], ['找不到的話,複製網址到 Safari 開啟', '🧭']],
        copy: true,
      };
    }
    if (iosMajor() >= 26) {
      return {
        intro: 'iPhone 規定要從 Safari 的分享選單加入,跟著步驟就好。',
        arrow: 'bottomRight',
        steps: [['點右下角的「⋯」', '⋯'], ['點「分享」', '⬆'], ['往下滑,點「加入主畫面」', '＋'], ['點右上角「加入」', '✓']],
      };
    }
    return {
      intro: 'iPhone 規定要從 Safari 的分享選單加入,跟著三步驟就好。',
      arrow: 'bottomCenter',
      steps: [['點下方工具列的「分享」', '⬆'], ['往下滑,點「加入主畫面」', '＋'], ['點右上角「加入」', '✓']],
    };
  }
  // Android：沒有系統安裝視窗時（例如 Samsung、Firefox，或 Chrome 還沒準備好）
  const samsung = androidBrowser() === 'samsung';
  return {
    intro: '從瀏覽器選單加入,跟著步驟就好。',
    arrow: samsung ? 'bottomRight' : 'topRight',
    steps: samsung
      ? [['點右下角的「≡」選單', '≡'], ['點「新增頁面至」→「主畫面」', '＋'], ['點「新增」', '✓']]
      : [['點右上角的「⋮」', '⋮'], ['點「加到主畫面」或「安裝應用程式」', '＋'], ['點「安裝」或「新增」', '✓']],
  };
}

// 上下跳動的箭頭，指向瀏覽器按鈕的位置
const ARROW_POS = {
  topRight:     { top: 6, right: 14, char: '⬆' },
  topShare:     { top: 6, right: 58, char: '⬆' },
  bottomCenter: { bottom: 6, left: 0, right: 0, char: '⬇' },
  bottomRight:  { bottom: 6, right: 18, char: '⬇' },
};
function BouncingArrow({ pos }){
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 450, useNativeDriver: false }),
      Animated.timing(v, { toValue: 0, duration: 450, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  const p = ARROW_POS[pos];
  if (!p) return null;
  const up = p.char === '⬆';
  const shift = v.interpolate({ inputRange: [0, 1], outputRange: [0, up ? -10 : 10] });
  const { char, ...place } = p;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', ...place, transform: [{ translateY: shift }] }}>
      {!up && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 }}>在這裡</Text>}
      <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 }}>{char}</Text>
      {up && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 2 }}>在這裡</Text>}
    </Animated.View>
  );
}

// 圖解視窗：放在 App 最上層
export function InstallGuide(){
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { openGuide = () => { setCopied(false); setOpen(true); }; return () => { openGuide = null; }; }, []);
  if (!open) return null;
  const g = guideFor();
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href.split('?')[0]); setCopied(true); } catch {}
  };
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
      <Pressable onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,14,30,0.62)' }} />
      <BouncingArrow pos={g.arrow} />
      <View style={{ position: 'absolute', left: 16, right: 16, top: '22%', backgroundColor: c.surface, borderRadius: 20, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, marginRight: 9 }}>📲</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: c.text, flex: 1 }}>加到主畫面</Text>
          <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}><Text style={{ fontSize: 18, color: c.textFaint }}>✕</Text></TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, color: c.textDim, lineHeight: 19, marginTop: 6, marginBottom: 12 }}>{g.intro}</Text>
        {g.steps.map(([text, icon], i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginRight: 11 }}>
              <Text style={{ color: c.primaryInk, fontWeight: '900', fontSize: 13 }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: c.text }}>{text}</Text>
            <View style={{ minWidth: 34, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: c.primary, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 4 }}>
              <Text style={{ color: c.primary, fontSize: 17, fontWeight: '900' }}>{icon}</Text>
            </View>
          </View>
        ))}
        {g.copy && (
          <TouchableOpacity onPress={copy} activeOpacity={0.85} style={{ marginTop: 10, borderRadius: 12, borderWidth: 1.5, borderColor: c.border, paddingVertical: 11, alignItems: 'center' }}>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }}>{copied ? '已複製網址 ✓' : '複製網址'}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.85} style={{ marginTop: 12, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: c.primaryInk, fontWeight: '800', fontSize: 15 }}>知道了</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 頁面上的按鈕（iOS、Android 都是同一顆）
export function InstallButton({ style }){
  const c = useTheme();
  const [oneTap, setOneTap] = useState(canPromptInstall());
  useEffect(() => onInstallAvailable(() => setOneTap(canPromptInstall())), []);
  if (!canShowInstall()) return null;
  return (
    <TouchableOpacity onPress={startInstall} activeOpacity={0.85} style={[{
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.primary,
      borderRadius: 14, padding: 13, marginBottom: 14,
    }, style]}>
      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Text style={{ fontSize: 22 }}>📲</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: c.primary }}>{oneTap ? '一鍵安裝到主畫面' : '加到主畫面'}</Text>
        <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 2 }}>像 App 一樣,從手機桌面直接打開</Text>
      </View>
      <Text style={{ fontSize: 20, color: c.primary, marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );
}
