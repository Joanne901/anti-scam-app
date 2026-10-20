import React, { useState } from 'react';
import { View, Text, Pressable, Platform, useColorScheme } from 'react-native';
import { useTheme } from './theme';

// ---- 有觸感的按鈕 ----
// 平常看起來是鼓起來的（上亮下暗的漸層、頂端亮邊、底下陰影），按下去會往內凹、縮一點，放開彈回來。
//  solid   黑色主要按鈕（檢查、分析、開啟…）
//  soft    淺色次要按鈕（清除、測試、關閉…）
//  danger  霧紅色緊急按鈕（165）
//  ice     霜霧藍（選中的分類、撥打電話）
//  card    整張可以點的卡片：平常不變，按下去往內凹一點
//  ghost   文字連結、關閉 ✕：按下去底下出現一個淺淺的凹槽
const SCALE = { solid: 0.97, soft: 0.97, danger: 0.97, ice: 0.96, card: 0.985, ghost: 0.92 };

// 按下去時輕輕震一下（Android 的瀏覽器才支援；iPhone 不允許網頁震動，只有畫面回饋）
export function buzz(){
  try { if (Platform.OS === 'web' && navigator.vibrate) navigator.vibrate(8); } catch {}
}

function tactile(variant, pressed, c, dark){
  if (Platform.OS !== 'web') return { opacity: pressed ? 0.85 : 1 };
  const look = (top, bottom, raised) => pressed
    ? { backgroundImage: `linear-gradient(180deg, ${bottom} 0%, ${top} 100%)`, boxShadow: raised.pressed }
    : { backgroundImage: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`, boxShadow: raised.rest };
  const sh = (color, a) => ({
    rest: `0 4px 10px rgba(${color},${a}), 0 1px 2px rgba(${color},${a + 0.04}), inset 0 1px 0 rgba(255,255,255,${dark ? 0.10 : 0.18}), inset 0 -1px 0 rgba(0,0,0,0.06)`,
    pressed: `inset 0 2px 6px rgba(0,0,0,${dark ? 0.55 : 0.35})`,
  });
  switch (variant) {
    case 'solid':  return dark ? look('#ffffff', '#d9d9de', sh('0,0,0', 0.5)) : look('#3a3a41', '#141417', sh('15,15,25', 0.22));
    case 'danger': return look(c.dangerTop, c.dangerBottom, sh(c.dangerGlow, dark ? 0.5 : 0.26));
    case 'ice':    return look(c.iceTop, c.iceBottom, sh(c.iceGlow, dark ? 0.5 : 0.14));
    case 'soft': return pressed
      ? { backgroundImage: dark ? 'linear-gradient(180deg,#1b1b1f,#25252a)' : 'linear-gradient(180deg,#e6e6eb,#f1f1f4)', boxShadow: `inset 0 2px 5px rgba(0,0,0,${dark ? 0.55 : 0.14})` }
      : { backgroundImage: dark ? 'linear-gradient(180deg,#34343a,#222227)' : 'linear-gradient(180deg,#ffffff,#ececf0)',
          boxShadow: dark ? '0 3px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 3px 8px rgba(15,15,25,0.10), 0 1px 2px rgba(15,15,25,0.08), inset 0 1px 0 #ffffff' };
    case 'card': return pressed ? { boxShadow: `inset 0 2px 8px rgba(0,0,0,${dark ? 0.5 : 0.09})` } : null;
    default: return pressed ? { backgroundColor: c.bg, boxShadow: `inset 0 1px 3px rgba(0,0,0,${dark ? 0.5 : 0.12})` } : null; // ghost
  }
}

// 按下的狀態自己管理（按下 onPressIn → 凹下去，放開 onPressOut → 彈回來），手機網頁上反應最穩定
export function Press({ variant = 'ghost', style, children, onPressIn, onPressOut, ...rest }){
  const c = useTheme();
  const dark = useColorScheme() === 'dark';
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable {...rest}
      onPressIn={(e) => { setPressed(true); buzz(); onPressIn && onPressIn(e); }}
      onPressOut={(e) => { setPressed(false); onPressOut && onPressOut(e); }}
      style={[
        style,
        tactile(variant, pressed, c, dark),
        { transform: [{ scale: pressed ? SCALE[variant] || 0.96 : 1 }] },
        Platform.OS === 'web' ? { transitionProperty: 'transform, box-shadow', transitionDuration: '120ms', transitionTimingFunction: 'ease-out' } : null,
      ]}>
      {children}
    </Pressable>
  );
}

export function Card({ children, style }){
  const c = useTheme();
  return (
    <View style={[{
      backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16,
      padding: 16, marginBottom: 14,
      shadowColor: '#141929', shadowOpacity: c.shadow, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: c.shadow ? 2 : 0,
    }, style]}>{children}</View>
  );
}

export function Btn({ title, onPress, secondary, small, style }){
  const c = useTheme();
  const primary = !secondary;
  return (
    <Press variant={primary ? 'solid' : 'soft'} onPress={onPress} accessibilityRole="button" style={[{
      borderRadius: 12, paddingVertical: small ? 10 : 13, paddingHorizontal: 16, alignItems: 'center',
      backgroundColor: primary ? c.solid : c.surface2, borderWidth: primary ? 0 : 1, borderColor: c.border,
    }, style]}>
      <Text style={{ color: primary ? c.solidInk : c.text, fontWeight: '700', fontSize: small ? 13.5 : 15 }}>{title}</Text>
    </Press>
  );
}

export function Label({ children }){
  const c = useTheme();
  return <Text style={{ fontSize: 12.5, fontWeight: '700', color: c.textDim, marginBottom: 7 }}>{children}</Text>;
}

export function SubText({ children, style }){
  const c = useTheme();
  return <Text style={[{ color: c.textDim, fontSize: 13, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Note({ children }){
  const c = useTheme();
  return <Text style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', lineHeight: 19, marginTop: 4 }}>{children}</Text>;
}

// 判定結果的配色與符號
const V = {
  danger: { bg: 'dangerSoft', br: 'danger', hd: 'dangerInk', sym: '!' },
  warn:   { bg: 'warnSoft',   br: 'warn',   hd: 'warnInk',   sym: '!' },
  low:    { bg: 'warnSoft',   br: 'warn',   hd: 'warnInk',   sym: '?' },
  ok:     { bg: 'okSoft',     br: 'ok',     hd: 'okInk',     sym: '✓' },
};

// 結果卡片頂部：大圓形符號 + 判定標題 + 說明
export function Verdict({ level, label, meta, children }){
  const c = useTheme();
  const v = V[level] || V.warn;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c[v.br], marginBottom: 14, overflow: 'hidden' }}>
      <View style={{ backgroundColor: c[v.bg], flexDirection: 'row', alignItems: 'center', padding: 15 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c[v.br], alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{v.sym}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '900', fontSize: 17, color: c[v.hd] }}>{label}</Text>
          {meta ? <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 4, lineHeight: 18 }}>{meta}</Text> : null}
        </View>
      </View>
      {children ? <View style={{ paddingHorizontal: 15, paddingBottom: 15 }}>{children}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, style }){
  const c = useTheme();
  return <Text style={[{ fontSize: 12, fontWeight: '800', color: c.textDim, marginTop: 16, marginBottom: 8, letterSpacing: 0.4 }, style]}>{children}</Text>;
}

const DOT = { hi: 'danger', mid: 'warn', lo: 'warn', info: 'primary' };
const DOT_LABEL = { hi: '高', mid: '中', lo: '低', info: '提示' };

// 判斷依據的一列：左邊嚴重度小標籤，右邊說明文字
export function Reason({ level, children, first }){
  const c = useTheme();
  const col = c[DOT[level] || 'primary'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.border }}>
      <View style={{ minWidth: 34, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: col, paddingVertical: 1, paddingHorizontal: 5, marginRight: 10, marginTop: 1 }}>
        <Text style={{ color: col, fontSize: 11, fontWeight: '800' }}>{DOT_LABEL[level] || '•'}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.text }}>{children}</Text>
    </View>
  );
}

// 次要動作：文字按鈕
export function TextBtn({ title, onPress }){
  const c = useTheme();
  return (
    <Press variant="ghost" onPress={onPress} hitSlop={6} accessibilityRole="button" style={{ paddingVertical: 6, paddingHorizontal: 8, marginHorizontal: -4, borderRadius: 8 }}>
      <Text style={{ color: c.primary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
    </Press>
  );
}
