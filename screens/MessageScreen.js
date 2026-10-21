import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import Icon from '../icons';
import { Card, Btn, Label, SubText, Note, Verdict, Reason, SectionTitle, TextBtn, Press } from '../components';
import { scanMessage } from '../analyze';
import { ocrSupported, pickImage, recognizeImage, warmupOcr } from '../ocr';

const SAMPLE = '【賣貨便】您的訂單帳戶異常，為避免被凍結，請於今天之內點擊連結完成金流認證並重新綁定資料，逾期將無法出貨。如有疑問請加LINE洽詢專員。';

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
    warmupOcr(); // 挑照片的同時就開始下載辨識引擎
    const file = await pickImage();
    if (!file) return;
    setOcrErr(''); setRes(null);
    if (shot) URL.revokeObjectURL(shot);
    setShot(URL.createObjectURL(file));
    setOcr({ label: '準備中', pct: 0 });
    try {
      const out = await recognizeImage(file, setOcr);
      if (!out) { setOcrErr('截圖裡沒有辨識到文字，請換一張清楚一點的截圖，或直接貼上文字。'); return; }
      setText(out);
      run(out);
    } catch (e) {
      setOcrErr(e.message || '辨識失敗，請再試一次。');
    } finally {
      setOcr(null);
    }
  };

  const clear = () => { setText(''); setRes(null); setOcrErr(''); if (shot) URL.revokeObjectURL(shot); setShot(null); };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <SubText style={{ marginBottom: 12 }}>{ocrSupported ? '上傳對話截圖或貼上訊息' : '把整段訊息貼上來'}，幫你標出詐騙常用的關鍵字與話術類型。</SubText>

      <Card>
        {ocrSupported && (
          <>
            <UploadTile shot={shot} ocr={ocr} err={ocrErr} onPress={ocr ? undefined : fromScreenshot} />
            <View style={{ flexDirection: 'row', marginTop: 10, paddingHorizontal: 2 }}>
              <View style={{ marginRight: 6, marginTop: 1 }}><Icon name="lightbulb" size={14} color={c.textDim} strokeWidth={2} /></View>
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: c.textDim }}>
                最準：iPhone 在照片裡<Text style={{ fontWeight: '800', color: c.text }}>長按文字 → 拷貝</Text>，Android 用 Google 智慧鏡頭複製文字，再貼到下方。
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              <Text style={{ marginHorizontal: 10, fontSize: 12, color: c.textFaint, fontWeight: '700' }}>或直接貼上文字</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </View>
          </>
        )}
        <Label>訊息內容</Label>
        <TextInput
          value={text} onChangeText={setText} multiline
          placeholder="貼上簡訊、LINE、私訊的完整內容…"
          placeholderTextColor={c.textFaint}
          style={{ borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: 'top' }}
        />
        <View style={{ height: 12 }} />
        <Btn title="分析" onPress={() => run()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <TextBtn title="範例訊息" onPress={() => { setText(SAMPLE); run(SAMPLE); }} />
          {(text || res || shot) ? <TextBtn title="清除" onPress={clear} /> : null}
        </View>
      </Card>

      {res && (
        <Verdict level={res.level} label={res.label} meta={res.meta}>
          {res.hitTypes.length > 0 && (
            <>
              <SectionTitle>命中的話術類型</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {res.hitTypes.map((h, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.dangerSoft, borderRadius: 999, paddingVertical: 5, paddingLeft: 11, paddingRight: 5 }}>
                    <Text style={{ color: c.dangerInk, fontWeight: '700', fontSize: 12.5 }}>{h.type}</Text>
                    <View style={{ backgroundColor: c.danger, borderRadius: 999, marginLeft: 6, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{h.found.length}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <SectionTitle>原文標示</SectionTitle>
          <View style={{ backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12 }}>
            <Text style={{ fontSize: 14, lineHeight: 23, color: c.text }}>
              {res.segments.map((s, i) => s.hit
                ? <Text key={i} style={{ backgroundColor: c.warnSoft, color: c.warnInk, fontWeight: '800' }}>{s.text}</Text>
                : <Text key={i}>{s.text}</Text>)}
            </Text>
          </View>

          {res.links.length > 0 && (
            <>
              <SectionTitle>訊息裡的連結</SectionTitle>
              {res.links.map((l, i) => (
                <Reason key={i} first={i === 0} level={LINK_LEVEL[l.level] || 'info'}>
                  <Text style={{ fontWeight: '800' }}>{l.reg}</Text>{'  '}{l.label}{'\n'}
                  <Text style={{ color: c.textDim, fontSize: 12.5 }}>{l.reasons.length ? (l.reasons.find(r => r.level === 'hi') || l.reasons[0]).text : '沒有命中已知的釣魚特徵。'}</Text>
                </Reason>
              ))}
            </>
          )}

          {res.hitTypes.length > 0 && (
            <>
              <SectionTitle>為什麼可疑</SectionTitle>
              {res.hitTypes.map((h, i) => (
                <View key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{h.type}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 20, color: c.textDim, marginTop: 3 }}>{h.tip}</Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 4 }}>命中：{h.found.join('、')}</Text>
                </View>
              ))}
            </>
          )}
        </Verdict>
      )}

      <Note>偵測的是「詐騙常見的語言模式」，不代表對特定對象的結論。{'\n'}正常訊息也可能命中少數關鍵字，請搭配情境判斷。</Note>
    </ScrollView>
  );
}

const LINK_LEVEL = { danger: 'hi', warn: 'mid', low: 'lo', ok: 'info' };

// 上傳截圖區塊：亮銀外觀跟按鈕一樣是鉻銀色，經典藍外觀是淡藍底的藍色虛線框；選了圖之後顯示縮圖與辨識進度
function UploadTile({ shot, ocr, err, onPress }){
  const c = useTheme();
  const classic = c.style === 'classic';
  return (
    <Press variant={classic ? 'card' : 'solid'} onPress={onPress} accessibilityRole="button" style={[
      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12 },
      classic
        ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary, backgroundColor: c.primarySoft }
        : { borderWidth: 1.5, borderColor: 'transparent', backgroundColor: c.solid }, // 跟經典藍的虛線框一樣粗，兩種外觀大小才一致
    ]}>
      {shot ? (
        <Image source={{ uri: shot }} style={{ width: 48, height: 80, borderRadius: 8, backgroundColor: c.border }} resizeMode="cover" />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="image-up" size={22} color={c.primary} />
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {ocr ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={{ marginLeft: 8, color: c.text, fontSize: 14, fontWeight: '800' }}>{ocr.label}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface, marginTop: 9, overflow: 'hidden' }}>
              <View style={{ height: 6, width: ocr.pct + '%', backgroundColor: c.primary }} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 15, fontWeight: '800', color: c.silverOn }}>{shot ? '換一張' : '上傳'}</Text>
            <Text style={{ fontSize: 12.5, color: err ? c.dangerInk : c.silverFaint, marginTop: 3, lineHeight: 18 }}>
              {err || (shot ? '已分析。有錯字可在下方修正後再按「分析」。' : '自動辨識並分析，截圖不外傳')}
            </Text>
          </>
        )}
      </View>
    </Press>
  );
}
