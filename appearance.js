// 外觀切換卡片（放在「查網址」最下面）：亮銀／經典藍，選了馬上套用，並記在這支手機裡
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useTheme, useAppStyle, STYLES, iceFill } from './theme';
import Icon from './icons';
import { Press, chrome } from './components';

// 每種外觀的小預覽：一顆按鈕＋三個代表色（點綴、紅、正常）
const PREVIEW = {
  silver: { chrome: true, dots: ['#1f3448', '#cb0218', '#8ecdf5'] },
  classic: { button: '#18181b', dots: ['#3b5bdb', '#dc2626', '#16a34a'] },
};

function Swatch({ k }){
  const p = PREVIEW[k];
  const button = p.chrome
    ? [{ backgroundColor: '#dfe5ec' }, Platform.OS === 'web' ? chrome(false, false) : null]
    : { backgroundColor: p.button };
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[{ width: 64, height: 18, borderRadius: 9 }, button]} />
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        {p.dots.map((d, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d, marginHorizontal: 3 }} />)}
      </View>
    </View>
  );
}

export function AppearanceCard(){
  const c = useTheme();
  const { style, setStyle } = useAppStyle();
  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 13, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={[{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, iceFill(c)]}>
          <Icon name="palette" size={22} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: c.silverText }}>外觀</Text>
          <Text style={{ fontSize: 12.5, color: c.silverFaint, marginTop: 2 }}>選一個你喜歡的樣子，會記在這支手機裡</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {STYLES.map(s => {
          const on = s.key === style;
          return (
            <Press key={s.key} variant="card" onPress={() => setStyle(s.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
                borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface2,
              }}>
              <Swatch k={s.key} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9 }}>
                {on && <Text style={{ color: c.primary, fontWeight: '900', fontSize: 13, marginRight: 4 }}>✓</Text>}
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: on ? c.primary : c.text }}>{s.name}</Text>
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
