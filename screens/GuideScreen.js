import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { SubText } from '../components';
import { GUIDE, GUIDE_CATS } from '../data';

function SectionTitle({ children, color }){
  return <Text style={{ fontSize: 12, fontWeight: '800', color, marginTop: 16, marginBottom: 8, letterSpacing: 0.5 }}>{children}</Text>;
}

// 常見說法：引用框
function Quotes({ items }){
  const c = useTheme();
  return items.map((t, i) => (
    <View key={i} style={{ backgroundColor: c.surface2, borderLeftWidth: 3, borderLeftColor: c.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 11, marginBottom: 6 }}>
      <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.textDim }}>{t}</Text>
    </View>
  ));
}

// 破綻 / 怎麼做：小圓點或勾勾開頭的條列
function Bullets({ items, kind }){
  const c = useTheme();
  const isOk = kind === 'ok';
  return items.map((t, i) => (
    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
      {isOk ? (
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1, marginRight: 9 }}>
          <Text style={{ color: c.ok, fontSize: 11, fontWeight: '900' }}>✓</Text>
        </View>
      ) : (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger, marginTop: 7, marginLeft: 6, marginRight: 15 }} />
      )}
      <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.text }}>{t}</Text>
    </View>
  ));
}

function Item({ g }){
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: open ? c.primary : c.border, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 21 }}>{g.em}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: c.text }}>{g.name}</Text>
          <Text numberOfLines={open ? undefined : 1} style={{ fontSize: 12.5, color: c.textDim, marginTop: 3, lineHeight: 18 }}>{g.sum}</Text>
        </View>
        <Text style={{ color: c.textFaint, fontSize: 18, marginLeft: 8, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <SectionTitle color={c.primary}>常見說法</SectionTitle>
          <Quotes items={g.talk} />
          <SectionTitle color={c.danger}>破綻</SectionTitle>
          <Bullets items={g.flag} />
          <SectionTitle color={c.ok}>怎麼做</SectionTitle>
          <Bullets items={g.act} kind="ok" />
        </View>
      )}
    </View>
  );
}

function Chip({ label, count, active, onPress }){
  const c = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, marginRight: 8,
      backgroundColor: active ? c.primary : c.surface, borderWidth: 1, borderColor: active ? c.primary : c.border,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? c.primaryInk : c.text }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 5, color: active ? c.primaryInk : c.textFaint }}>{count}</Text>
    </TouchableOpacity>
  );
}

export default function GuideScreen(){
  const c = useTheme();
  const [cat, setCat] = useState('all');
  const cats = GUIDE_CATS.filter(k => cat === 'all' || k.key === cat);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
      <SubText style={{ marginBottom: 12 }}>認得話術，就不容易上當。點開看每種手法的破綻與正確做法。</SubText>

      <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 13, marginBottom: 14, flexDirection: 'row' }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: c.primary, marginRight: 11 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary, marginBottom: 3 }}>共通原則</Text>
          <Text style={{ fontSize: 13, color: c.text, lineHeight: 20 }}>任何要你「點連結輸入卡號、網銀、驗證碼」、「去 ATM 或網銀操作」、「先付錢才能領錢」的要求，幾乎都是詐騙。</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4, marginHorizontal: -15 }} contentContainerStyle={{ paddingHorizontal: 15 }}>
        <Chip label="全部" count={GUIDE.length} active={cat === 'all'} onPress={() => setCat('all')} />
        {GUIDE_CATS.map(k => (
          <Chip key={k.key} label={k.name} count={GUIDE.filter(g => g.cat === k.key).length} active={cat === k.key} onPress={() => setCat(k.key)} />
        ))}
      </ScrollView>

      {cats.map(k => (
        <View key={k.key}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 9 }}>
            <Text style={{ fontSize: 15, marginRight: 6 }}>{k.em}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{k.name}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border, marginLeft: 10 }} />
          </View>
          {GUIDE.filter(g => g.cat === k.key).map(g => <Item key={g.name} g={g} />)}
        </View>
      ))}
    </ScrollView>
  );
}
