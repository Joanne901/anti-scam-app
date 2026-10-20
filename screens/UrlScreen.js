import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { Card, Btn, Label, SubText, Note, Verdict, Reason } from '../components';
import { analyzeUrl } from '../analyze';

const SAMPLE_URL = 'https://myshl-7-11-com.tw-tyy.shop/goods.php?id=CM1792474461&fbclid=IwZXh0bgNhZW0';

export default function UrlScreen(){
  const c = useTheme();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [hist, setHist] = useState([]);

  const run = (val) => {
    const input = val !== undefined ? val : text;
    const r = analyzeUrl(input);
    setResult(r);
    if (r && r.reg) setHist(h => [{ reg: r.reg, level: r.level }, ...h.filter(x => x.reg !== r.reg)].slice(0, 5));
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <SubText style={{ marginBottom: 14 }}>貼上可疑連結,幫你拆解網域、判斷風險,並說明為什麼。</SubText>

      <Card>
        <Label>要檢查的網址</Label>
        <TextInput
          value={text} onChangeText={setText} multiline
          placeholder="貼上網址,例如從臉書、簡訊、LINE 收到的連結…"
          placeholderTextColor={c.textFaint} autoCapitalize="none" autoCorrect={false}
          style={{ borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 88, textAlignVertical: 'top' }}
        />
        <View style={{ height: 11 }} />
        <Btn title="檢查這個網址" onPress={() => run()} />
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
          <Btn style={{ flex: 1 }} small secondary title="填入範例詐騙網址" onPress={() => { setText(SAMPLE_URL); run(SAMPLE_URL); }} />
          <Btn style={{ flex: 1 }} small secondary title="清除" onPress={() => { setText(''); setResult(null); }} />
        </View>

        {result && (
          <Verdict level={result.level} emoji={result.emoji} label={result.label} meta={result.meta}>
            <Text style={{ marginTop: 11, fontSize: 13, color: c.text, lineHeight: 19 }}>{result.overviewText}</Text>
            {result.reasons.length
              ? result.reasons.map((r, i) => <Reason key={i} level={r.level}>{r.text}</Reason>)
              : <Reason level="info">沒有命中已知的釣魚特徵。</Reason>}
          </Verdict>
        )}

        {hist.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', color: c.textDim, fontSize: 12.5, marginBottom: 4 }}>最近檢查</Text>
            {hist.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: c.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: x.level === 'danger' ? c.danger : x.level === 'ok' ? c.ok : c.warn }} />
                <Text style={{ fontSize: 12, color: c.text, flex: 1 }}>{x.reg}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Note>本工具依公開的釣魚特徵判斷,無法保證 100% 準確。{'\n'}最保險:自己開官方 App 或手動輸入官網,不要點別人給的連結。</Note>
    </ScrollView>
  );
}
