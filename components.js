import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from './theme';

export function Card({ children, style }){
  const c = useTheme();
  return (
    <View style={[{
      backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 16,
      padding: 16, marginBottom: 14,
      shadowColor: '#141929', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    }, style]}>{children}</View>
  );
}

export function Btn({ title, onPress, secondary, small, style }){
  const c = useTheme();
  const primary = !secondary;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[{
      borderRadius: 12, paddingVertical: small ? 10 : 13, paddingHorizontal: 16, alignItems: 'center',
      backgroundColor: primary ? c.primary : c.surface2, borderWidth: primary ? 0 : 1.5, borderColor: c.border,
    }, style]}>
      <Text style={{ color: primary ? c.primaryInk : c.text, fontWeight: '700', fontSize: small ? 13.5 : 15 }}>{title}</Text>
    </TouchableOpacity>
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
    <TouchableOpacity onPress={onPress} hitSlop={6} activeOpacity={0.6} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
      <Text style={{ color: c.primary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
    </TouchableOpacity>
  );
}
