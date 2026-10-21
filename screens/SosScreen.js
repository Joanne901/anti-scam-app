import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTheme, iceFill } from '../theme';
import Icon from '../icons';
import { SubText, Note, Press } from '../components';
import { STEPS, STEP_PHASES } from '../data';

const call = (n) => Linking.openURL('tel:' + n);

function CallButton({ num, label, solid }){
  const c = useTheme();
  return (
    <Press variant={solid ? 'danger' : 'soft'} onPress={() => call(num)} accessibilityRole="button" style={{
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingVertical: 12,
      backgroundColor: solid ? c.danger : c.surface, borderWidth: 1.5, borderColor: c.danger,
    }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: solid ? '#fff' : c.danger, fontWeight: '900', fontSize: 22, letterSpacing: 1.5 }}>{num}</Text>
        <Text style={{ color: solid ? '#fff' : c.danger, fontSize: 11.5, fontWeight: '700', opacity: 0.9, marginTop: 1 }}>撥打・{label}</Text>
      </View>
    </Press>
  );
}

// 時間軸上的一步：左邊編號圓圈，右邊是內容
function Step({ n, s, last }){
  const c = useTheme();
  // 撥打按鈕：亮銀外觀是鉻銀，經典藍外觀是淡藍底藍字
  const classic = c.style === 'classic';
  const callBg = classic ? c.primarySoft : c.solid;
  const callInk = classic ? c.primary : c.solidInk;
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ alignItems: 'center', width: 30, marginRight: 12 }}>
        <View style={[{
          width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.stepBg, borderWidth: 1, borderColor: c.stepLine,
        }, iceFill(c)]}>
          <Text style={{ color: c.stepInk, fontWeight: '900', fontSize: 13 }}>{n}</Text>
        </View>
        {!last && <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginVertical: 3 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 4 : 18 }}>
        <Text style={{ fontWeight: '800', fontSize: 15, color: c.silverText, marginTop: 3 }}>{s.t}</Text>
        <Text style={{ fontSize: 13, color: c.silverFaint, lineHeight: 20, marginTop: 4 }}>{s.d}</Text>
        {s.call && (
          <Press variant={classic ? 'tint' : 'solid'} onPress={() => call(s.call)} accessibilityRole="button" style={{
            alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 9,
            backgroundColor: callBg, borderWidth: 1, borderColor: callBg, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
          }}>
            <View style={{ marginRight: 5 }}><Icon name="phone" size={13} color={callInk} strokeWidth={2.2} /></View>
            <Text style={{ color: callInk, fontWeight: '800', fontSize: 13 }}>撥打 {s.call}</Text>
          </Press>
        )}
      </View>
    </View>
  );
}

export default function SosScreen(){
  const c = useTheme();

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
      <SubText style={{ marginBottom: 12 }}>別慌，照順序做。愈早處理，擋下損失的機會愈大。</SubText>

      <View style={{ backgroundColor: c.dangerSoft, borderRadius: 16, borderWidth: 1, borderColor: c.danger, padding: 15, marginBottom: 18 }}>
        <Text style={{ color: c.dangerInk, fontWeight: '900', fontSize: 16 }}>先打電話求助</Text>
        <Text style={{ color: c.textDim, fontSize: 12.5, marginTop: 4, marginBottom: 13, lineHeight: 19 }}>165 反詐騙專線 24 小時服務，可諮詢、通報並協助聯繫銀行；有立即危險請打 110。</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <CallButton num="165" label="反詐騙專線" solid />
          <CallButton num="110" label="報案／緊急" />
        </View>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '900', color: c.text, marginBottom: 12 }}>處理步驟</Text>

      {STEP_PHASES.map(ph => {
        const items = STEPS.map((s, i) => ({ s, i })).filter(x => x.s.p === ph.key);
        return (
          <View key={ph.key} style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: c.primary }}>{ph.name}</Text>
              <Text style={{ fontSize: 12, color: c.textFaint, marginLeft: 8 }}>{ph.hint}</Text>
            </View>
            {items.map(({ s, i }, k) => (
              <Step key={i} n={i + 1} s={s} last={k === items.length - 1} />
            ))}
          </View>
        );
      })}

      <Note>停卡／圈存請打你卡片背面或存摺上的銀行官方客服電話。{'\n'}本頁為一般處理指引，實際程序以各機關與 165 說明為準。</Note>
    </ScrollView>
  );
}
