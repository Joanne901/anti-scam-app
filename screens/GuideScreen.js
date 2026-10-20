import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { SubText } from '../components';
import { GUIDE } from '../data';

function Block({ title, items, icon, quote }){
  const c = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '800', color: c.textDim, marginTop: 14, marginBottom: 7, letterSpacing: 0.4 }}>{title}</Text>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 7 }}>
          <Text style={{ marginRight: 8 }}>{icon}</Text>
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: quote ? c.textDim : c.text, fontStyle: quote ? 'italic' : 'normal' }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Item({ g, startOpen }){
  const c = useTheme();
  const [open, setOpen] = useState(startOpen);
  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, marginBottom: 11, overflow: 'hidden' }}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <Text style={{ fontSize: 21, marginRight: 12 }}>{g.em}</Text>
        <Text style={{ fontWeight: '700', fontSize: 15, color: c.text, flex: 1 }}>{g.name}</Text>
        <Text style={{ color: c.textFaint, fontSize: 13 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 15, paddingBottom: 16 }}>
          <Block title="典型話術" items={g.talk} icon="💬" quote />
          <Block title="破綻 · 紅旗" items={g.flag} icon="🚩" />
          <Block title="正確做法" items={g.act} icon="✅" />
        </View>
      )}
    </View>
  );
}

export default function GuideScreen(){
  const c = useTheme();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 15, paddingBottom: 40 }}>
      <SubText style={{ marginBottom: 14 }}>認得話術,就不容易上當。點開看每種手法的破綻與正確做法。</SubText>
      <View style={{ backgroundColor: c.primarySoft, borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row' }}>
        <Text style={{ marginRight: 9 }}>💡</Text>
        <Text style={{ flex: 1, fontSize: 12.5, color: c.text, lineHeight: 19, fontWeight: '600' }}>共通原則:任何「點連結→輸入卡號 / 網銀 / 驗證碼」或「去 ATM 操作」的要求,幾乎都是詐騙。</Text>
      </View>
      {GUIDE.map((g, i) => <Item key={i} g={g} startOpen={i === 0} />)}
    </ScrollView>
  );
}
