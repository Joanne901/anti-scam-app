import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { Card, Btn, Label, SubText, Note, Verdict, Reason, SectionTitle, TextBtn } from '../components';
import { analyzeUrl, parseUrl } from '../analyze';
import { InstallButton } from '../install';
import { NotifyCard } from '../notify';

const SAMPLE_URL = 'https://myshl-7-11-com.tw-tyy.shop/goods.php?id=CM1792474461&fbclid=IwZXh0bgNhZW0';

const LEVEL_COLOR = { danger: 'danger', warn: 'warn', low: 'warn', ok: 'ok' };
const LEVEL_TEXT = { danger: '高風險', warn: '可疑', low: '留意', ok: '正常' };

// 網域拆解：把主機名稱顯示出來，真正的所有者（最後那段）加粗標色
function DomainBreakdown({ host, reg, level }){
  const c = useTheme();
  const col = c[LEVEL_COLOR[level] || 'primary'];
  const cut = host.endsWith(reg) ? host.length - reg.length : 0;
  return (
    <View>
      <SectionTitle>網域拆解</SectionTitle>
      <View style={{ backgroundColor: c.surface2, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12 }}>
        <Text dataSet={{ mono: true }} style={{ fontSize: 15, lineHeight: 22, color: c.textFaint, fontFamily: 'monospace' }}>
          {host.slice(0, cut)}
          <Text style={{ color: col, fontWeight: '900' }}>{host.slice(cut)}</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col, marginRight: 7 }} />
          <Text style={{ fontSize: 12.5, color: c.textDim, flex: 1 }}>
            真正的所有者是 <Text style={{ color: c.text, fontWeight: '800' }}>{reg}</Text>，前面的字都可以亂取
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function UrlScreen(){
  const c = useTheme();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [hist, setHist] = useState([]);

  const run = (val) => {
    const input = val !== undefined ? val : text;
    const r = analyzeUrl(input);
    setResult(r ? { ...r, host: parseUrl(input).host } : null);
    if (r && r.reg) setHist(h => [{ reg: r.reg, level: r.level }, ...h.filter(x => x.reg !== r.reg)].slice(0, 5));
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <SubText style={{ marginBottom: 12 }}>貼上可疑連結，幫你拆解網域、判斷風險，並說明為什麼。</SubText>

      <Card>
        <Label>要檢查的網址</Label>
        <TextInput
          value={text} onChangeText={setText} multiline
          placeholder="貼上從臉書、簡訊、LINE 收到的連結…"
          placeholderTextColor={c.textFaint} autoCapitalize="none" autoCorrect={false}
          style={{ borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' }}
        />
        <View style={{ height: 12 }} />
        <Btn title="檢查" onPress={() => run()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <TextBtn title="範例網址" onPress={() => { setText(SAMPLE_URL); run(SAMPLE_URL); }} />
          {(text || result) ? <TextBtn title="清除" onPress={() => { setText(''); setResult(null); }} /> : null}
        </View>
      </Card>

      {result && (
        <Verdict level={result.level} label={result.label} meta={result.meta}>
          {result.host ? <DomainBreakdown host={result.host} reg={result.reg} level={result.level} /> : null}
          <SectionTitle>判斷依據</SectionTitle>
          {result.reasons.length
            ? result.reasons.map((r, i) => <Reason key={i} first={i === 0} level={r.level}>{r.text}</Reason>)
            : <Reason first level="info">沒有命中已知的釣魚特徵。</Reason>}
        </Verdict>
      )}

      {hist.length > 0 && (
        <Card style={{ paddingVertical: 10 }}>
          <Label>最近檢查</Label>
          {hist.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 10, backgroundColor: c[LEVEL_COLOR[x.level] || 'warn'] }} />
              <Text style={{ fontSize: 13.5, color: c.text, flex: 1 }}>{x.reg}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c[LEVEL_COLOR[x.level] || 'warn'] }}>{LEVEL_TEXT[x.level] || ''}</Text>
            </View>
          ))}
        </Card>
      )}

      <InstallButton />
      <NotifyCard />

      <Note>本工具依公開的釣魚特徵判斷，無法保證 100% 準確。{'\n'}最保險：自己開官方 App 或手動輸入官網，不要點別人給的連結。</Note>
    </ScrollView>
  );
}
