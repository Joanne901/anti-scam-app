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

const V = {
  danger: { bg: 'dangerSoft', br: 'danger', hd: 'dangerInk' },
  warn:   { bg: 'warnSoft',   br: 'warn',   hd: 'warnInk' },
  low:    { bg: 'warnSoft',   br: 'warn',   hd: 'warnInk' },
  ok:     { bg: 'okSoft',     br: 'ok',     hd: 'okInk' },
};

export function Verdict({ level, emoji, label, meta, children }){
  const c = useTheme();
  const v = V[level] || V.warn;
  return (
    <View style={{ borderRadius: 14, padding: 15, marginTop: 16, borderWidth: 1.5, backgroundColor: c[v.bg], borderColor: c[v.br] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 22, marginRight: 9 }}>{emoji}</Text>
        <Text style={{ fontWeight: '800', fontSize: 16.5, color: c[v.hd], flex: 1 }}>{label}</Text>
      </View>
      {meta ? <Text style={{ fontSize: 12.5, color: c.textDim, marginTop: 5 }}>{meta}</Text> : null}
      {children}
    </View>
  );
}

const DOT = { hi: '🔴', mid: '🟠', lo: '🟡', info: '🔵' };

export function Reason({ level, children }){
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 11, padding: 10, marginTop: 9 }}>
      <Text style={{ fontSize: 15, marginRight: 9 }}>{DOT[level] || '•'}</Text>
      <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.text }}>{children}</Text>
    </View>
  );
}
