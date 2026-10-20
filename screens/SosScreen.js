import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../theme';
import { SubText, Note } from '../components';
import { STEPS } from '../data';

export default function SosScreen(){
  const c = useTheme();
  const call = (n) => Linking.openURL('tel:' + n);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
      <SubText style={{ marginBottom: 14 }}>別慌,照順序做。愈早處理,擋下損失的機會愈大。</SubText>

      <View style={{ borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: c.danger }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 3 }}>先打這支電話</Text>
        <Text style={{ color: '#fff', opacity: 0.95, fontSize: 12.5, marginBottom: 13, lineHeight: 18 }}>165 反詐騙諮詢專線,24 小時,可協助與通報;遇立即危險打 110。</Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => call('165')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}>
            <Text style={{ color: c.dangerInk, fontWeight: '800', fontSize: 19, letterSpacing: 1 }}>165</Text>
            <Text style={{ color: c.dangerInk, fontSize: 11, fontWeight: '600' }}>反詐騙專線</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => call('110')} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 19, letterSpacing: 1 }}>110</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>報案 / 緊急</Text>
          </TouchableOpacity>
        </View>
      </View>

      {STEPS.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, marginBottom: 11 }}>
          <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 }}>
            <Text style={{ color: c.primary, fontWeight: '800', fontSize: 14 }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14.5, color: c.text, marginBottom: 3 }}>{s.t}</Text>
            <Text style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}>{s.d}</Text>
            {s.call && (
              <TouchableOpacity onPress={() => call(s.call)} style={{ marginTop: 7 }}>
                <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>📞 撥打 {s.call}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <Note>停卡 / 圈存請打你卡片背面或存摺上的銀行官方客服電話。{'\n'}本頁為一般處理指引,實際程序以各機關與 165 說明為準。</Note>
    </ScrollView>
  );
}
