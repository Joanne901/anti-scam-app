import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { Card, Btn, Label, SubText, Note, Verdict } from '../components';
import { scanMessage } from '../analyze';
import { ocrSupported, pickImage, recognizeImage } from '../ocr';

const SAMPLE = '【賣貨便】您的訂單帳戶異常,為避免被凍結,請於今天之內點擊連結完成金流認證並重新綁定資料,逾期將無法出貨。如有疑問請加LINE洽詢專員。';

export default function MessageScreen(){
  const c = useTheme();
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [shot, setShot] = useState(null);     // 截圖預覽網址
  const [ocr, setOcr] = useState(null);       // { label, pct } 辨識進度
  const [ocrErr, setOcrErr] = useState('');
  const run = (val) => setRes(scanMessage(val !== undefined ? val : text));

  // 上傳截圖 → 辨識文字 → 填入輸入框 → 直接分析
  const fromScreenshot = async () => {
    const file = await pickImage();
    if (!file) return;
    setOcrErr(''); setRes(null);
    if (shot) URL.revokeObjectURL(shot);
    setShot(URL.createObjectURL(file));
    setOcr({ label: '準備中', pct: 0 });
    try {
      const out = await recognizeImage(file, setOcr);
      if (!out) { setOcrErr('截圖裡沒有辨識到文字,請換一張清楚一點的截圖,或直接貼上文字。'); return; }
      setText(out);
      run(out);
    } catch (e) {
      setOcrErr(e.message || '辨識失敗,請再試一次。');
    } finally {
      setOcr(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <SubText style={{ marginBottom: 14 }}>把整段訊息貼上來{ocrSupported ? ',或直接上傳對話截圖' : ''},幫你標出詐騙常用的關鍵字與話術類型。</SubText>

      <Card>
        {ocrSupported && (
          <>
            <Btn secondary title={ocr ? '辨識中…' : '📷  上傳對話截圖'} onPress={ocr ? undefined : fromScreenshot} />
            {shot && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 11, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 11, padding: 8 }}>
                <Image source={{ uri: shot }} style={{ width: 56, height: 96, borderRadius: 6, backgroundColor: c.border }} resizeMode="cover" />
                <View style={{ flex: 1, marginLeft: 11 }}>
                  {ocr ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={c.primary} />
                        <Text style={{ marginLeft: 8, color: c.text, fontSize: 13.5, fontWeight: '700' }}>{ocr.label}</Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border, marginTop: 9, overflow: 'hidden' }}>
                        <View style={{ height: 6, width: ocr.pct + '%', backgroundColor: c.primary }} />
                      </View>
                    </>
                  ) : ocrErr ? (
                    <Text style={{ color: c.dangerInk, fontSize: 13 }}>{ocrErr}</Text>
                  ) : (
                    <Text style={{ color: c.textDim, fontSize: 13, lineHeight: 19 }}>已辨識截圖文字並分析。辨識可能有錯字,可在下方修正後再按「分析訊息」。</Text>
                  )}
                </View>
              </View>
            )}
            <View style={{ height: 14 }} />
          </>
        )}
        <Label>訊息內容</Label>
        <TextInput
          value={text} onChangeText={setText} multiline
          placeholder="貼上簡訊、LINE、私訊的完整內容…"
          placeholderTextColor={c.textFaint}
          style={{ borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: 'top' }}
        />
        <View style={{ height: 11 }} />
        <Btn title="分析訊息" onPress={() => run()} />
        <View style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
          <Btn style={{ flex: 1 }} small secondary title="貼範例詐騙訊息" onPress={() => { setText(SAMPLE); run(SAMPLE); }} />
          <Btn style={{ flex: 1 }} small secondary title="清除" onPress={() => { setText(''); setRes(null); setOcrErr(''); if (shot) URL.revokeObjectURL(shot); setShot(null); }} />
        </View>

        {res && (
          <>
            <Verdict level={res.level} emoji={res.emoji} label={res.label} meta={res.meta}>
              {res.hitTypes.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {res.hitTypes.map((h, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.dangerSoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 }}>
                      <Text style={{ color: c.dangerInk, fontWeight: '700', fontSize: 12.5 }}>{h.type}</Text>
                      <View style={{ backgroundColor: c.danger, borderRadius: 999, marginLeft: 6, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 11 }}>{h.found.length}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Verdict>

            <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 11, padding: 12, marginTop: 14 }}>
              <Text style={{ fontSize: 14, lineHeight: 23, color: c.text }}>
                {res.segments.map((s, i) => s.hit
                  ? <Text key={i} style={{ backgroundColor: c.warn, color: '#111', fontWeight: '700' }}>{s.text}</Text>
                  : <Text key={i}>{s.text}</Text>)}
              </Text>
            </View>

            {res.links.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Label>訊息裡的連結</Label>
                {res.links.map((l, i) => (
                  <View key={i} style={{ flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 11, padding: 10, marginTop: 6 }}>
                    <Text style={{ marginRight: 9, fontSize: 15 }}>{l.emoji}</Text>
                    <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.text }}>
                      <Text style={{ fontWeight: '700' }}>{l.label}</Text>{'\n'}
                      <Text style={{ color: c.textDim, fontSize: 12.5 }}>{l.reg}{l.reasons.length ? ' — ' + (l.reasons.find(r => r.level === 'hi') || l.reasons[0]).text : ''}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {res.hitTypes.length > 0 && (
              <View style={{ marginTop: 14 }}>
                {res.hitTypes.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 11, padding: 10, marginTop: 9 }}>
                    <Text style={{ marginRight: 9, fontSize: 15 }}>🔸</Text>
                    <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.text }}>
                      <Text style={{ fontWeight: '700' }}>{h.type}</Text> — {h.tip}{'\n'}
                      <Text style={{ color: c.textDim, fontSize: 12.5 }}>命中:{h.found.join('、')}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </Card>

      <Note>偵測的是「詐騙常見的語言模式」,不代表對特定對象的結論。{'\n'}正常訊息也可能命中少數關鍵字,請搭配情境判斷。</Note>
    </ScrollView>
  );
}
