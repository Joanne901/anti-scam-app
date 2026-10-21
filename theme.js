import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { setAppFont } from './fonts';

// 兩種外觀，使用者在「查網址」最下面的「外觀」切換，選擇會記在這支手機裡
//  silver   亮銀：亮銀色按鈕、午夜霧藍點綴、玫瑰紅與天空藍
//  classic  經典藍：黑色按鈕、藍色點綴、原本的紅與綠
// 兩種外觀只換顏色：字體（Inter＋思源黑體）、大小、間距、位置都一樣，切換時畫面不會跳動
export const STYLES = [
  { key: 'silver', name: '亮銀' },
  { key: 'classic', name: '經典藍' },
];

// 每種外觀都有同一組顏色名稱：
//  solid / solidInk   主要按鈕（檢查、分析…）的底色與字色
//  primary            點綴色：圖示、文字連結、步驟編號、引言左邊的直線
//  primarySoft / primaryLine  點綴色的淡底色與細框線（圖示底、上傳框、展開的卡片框）
//  iceSheen           淡底色上的光澤（只有亮銀有）
//  sky                圖鑑「共通原則」的點綴色
//  silverText / silverFaint  手法卡片、處理步驟、更新通知、加到主畫面的標題與說明字
//  silverOn           上傳框的標題字
//  stepBg / stepLine / stepInk  緊急求助的步驟編號圓圈
//  danger …           高風險（dangerTop / dangerBottom / dangerGlow 是 165 立體按鈕的漸層與陰影）
//  warn / ok          可疑／正常
const SKY = '#8ecdf5';

const silverLight = {
  style: 'silver',
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#dfe5ec', solidInk:'#0a0d12',
  primary:'#1f3448', primaryInk:'#ffffff', primarySoft:'#e7edf3', primaryLine:'#9db0c3',
  iceSheen: { backgroundImage: 'linear-gradient(180deg, #f6f8fb 0%, #e7edf3 60%, #dbe3eb 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)' },
  sky: SKY,
  silverText:'#5c6675', silverFaint:'#8a94a1', silverOn:'#3d4653',
  stepBg:'#e7edf3', stepLine:'#9db0c3', stepInk:'#1f3448',
  danger:'#cb0218', dangerSoft:'#fdeef0', dangerInk:'#b80519',
  dangerTop:'#dc0c26', dangerBottom:'#b80519', dangerGlow:'184,5,25',
  warn:'#d97706', warnSoft:'#fffbeb', warnInk:'#92400e',
  ok: SKY, okSoft:'#eef8fe', okInk:'#2b7bb0',
  shadow: 0,
};

const silverDark = {
  style: 'silver',
  bg:'#09090b', surface:'#141417', surface2:'#1c1c20', border:'#27272a',
  text:'#fafafa', textDim:'#a1a1aa', textFaint:'#71717a',
  solid:'#dfe5ec', solidInk:'#0a0d12',
  primary:'#a9bfd4', primaryInk:'#09090b', primarySoft:'#141c25', primaryLine:'#33465a',
  iceSheen: { backgroundImage: 'linear-gradient(180deg, #1b2633 0%, #131b24 100%)' },
  sky: SKY,
  silverText:'#c9d1db', silverFaint:'#9aa4b1', silverOn:'#3d4653',
  stepBg:'#141c25', stepLine:'#33465a', stepInk:'#a9bfd4',
  danger:'#f0263c', dangerSoft:'#2a0b10', dangerInk:'#ff8a98',
  dangerTop:'#e8182f', dangerBottom:'#c00a1f', dangerGlow:'0,0,0',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  ok: SKY, okSoft:'#0d2230', okInk:'#bfe4fb',
  shadow: 0,
};

const classicLight = {
  style: 'classic',
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#18181b', solidInk:'#ffffff',
  primary:'#3b5bdb', primaryInk:'#ffffff', primarySoft:'#eef1fc', primaryLine:'#3b5bdb',
  iceSheen: null,
  sky:'#3b5bdb',
  silverText:'#09090b', silverFaint:'#52525b', silverOn:'#3b5bdb',
  stepBg:'#3b5bdb', stepLine:'#3b5bdb', stepInk:'#ffffff',
  danger:'#dc2626', dangerSoft:'#fef2f2', dangerInk:'#991b1b',
  dangerTop:'#ef4444', dangerBottom:'#c81e1e', dangerGlow:'200,30,30',
  warn:'#d97706', warnSoft:'#fffbeb', warnInk:'#92400e',
  ok:'#16a34a', okSoft:'#f0fdf4', okInk:'#166534',
  shadow: 0,
};

const classicDark = {
  style: 'classic',
  bg:'#09090b', surface:'#141417', surface2:'#1c1c20', border:'#27272a',
  text:'#fafafa', textDim:'#a1a1aa', textFaint:'#71717a',
  solid:'#fafafa', solidInk:'#09090b',
  primary:'#6f8bfa', primaryInk:'#09090b', primarySoft:'#1a2035', primaryLine:'#6f8bfa',
  iceSheen: null,
  sky:'#6f8bfa',
  silverText:'#fafafa', silverFaint:'#a1a1aa', silverOn:'#6f8bfa',
  stepBg:'#6f8bfa', stepLine:'#6f8bfa', stepInk:'#09090b',
  danger:'#f87171', dangerSoft:'#2a1214', dangerInk:'#fca5a5',
  dangerTop:'#f98b8b', dangerBottom:'#ef5a5a', dangerGlow:'0,0,0',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  ok:'#4ade80', okSoft:'#0f2416', okInk:'#86efac',
  shadow: 0,
};

const PALETTES = {
  silver: { light: silverLight, dark: silverDark },
  classic: { light: classicLight, dark: classicDark },
};

// 記住使用者選的外觀（網頁版存在這支手機的瀏覽器裡）
const KEY = 'appStyle';
function loadStyle(){
  try { const v = localStorage.getItem(KEY); return PALETTES[v] ? v : 'silver'; } catch { return 'silver'; }
}
function saveStyle(v){
  try { localStorage.setItem(KEY, v); } catch {}
}

// 一打開就先套好字體，避免畫面先閃一下別的字體（兩種外觀用同一套字體）
if (Platform.OS === 'web') setAppFont(true);

const StyleContext = createContext({ style: 'silver', setStyle: () => {} });

export function StyleProvider({ children }){
  const [style, setStyle] = useState(loadStyle);
  useEffect(() => { saveStyle(style); }, [style]);
  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
}

// 目前的外觀與切換函式（「外觀」卡片用）
export function useAppStyle(){
  return useContext(StyleContext);
}

export function useTheme(){
  const { style } = useContext(StyleContext);
  const dark = useColorScheme() === 'dark';
  return PALETTES[style][dark ? 'dark' : 'light'];
}

// 淡底色加光澤（只有網頁版、只有亮銀）
export function iceFill(c){
  return Platform.OS === 'web' ? c.iceSheen : null;
}
