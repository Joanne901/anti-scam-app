import { useColorScheme } from 'react-native';

// 配色：黑白灰為底（俐落科技感），霜霧藍當點綴
//  solid    主要動作按鈕（檢查、分析…）用黑色
//  primary  霜霧藍：圖示、文字連結、選中的分類、步驟編號
//  primarySoft / primaryLine  霜霧藍的淡底色與細框線
//  iceTop / iceBottom / iceGlow  霜霧藍立體按鈕的漸層與陰影
//  danger   紅色：高風險提示與 165 / 110 按鈕（dangerTop / dangerBottom / dangerGlow 是立體按鈕用）
//  warn / ok  只用在風險提示
const light = {
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#18181b', solidInk:'#ffffff',
  primary:'#4a7aa3', primaryInk:'#ffffff', primarySoft:'#edf3f8', primaryLine:'#c9d9e8',
  iceTop:'#f8fbfd', iceBottom:'#dfe8f2', iceGlow:'74,122,163',
  danger:'#dc2626', dangerSoft:'#fef2f2', dangerInk:'#991b1b',
  dangerTop:'#ef4444', dangerBottom:'#c81e1e', dangerGlow:'200,30,30',
  warn:'#d97706', warnSoft:'#fffbeb', warnInk:'#92400e',
  ok:'#16a34a', okSoft:'#f0fdf4', okInk:'#166534',
  shadow: 0,
};

const dark = {
  bg:'#09090b', surface:'#141417', surface2:'#1c1c20', border:'#27272a',
  text:'#fafafa', textDim:'#a1a1aa', textFaint:'#71717a',
  solid:'#fafafa', solidInk:'#09090b',
  primary:'#9dbbd8', primaryInk:'#09090b', primarySoft:'#152029', primaryLine:'#2c4256',
  iceTop:'#233446', iceBottom:'#182532', iceGlow:'0,0,0',
  danger:'#f87171', dangerSoft:'#2a1214', dangerInk:'#fca5a5',
  dangerTop:'#f98b8b', dangerBottom:'#ef5a5a', dangerGlow:'0,0,0',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  ok:'#4ade80', okSoft:'#0f2416', okInk:'#86efac',
  shadow: 0,
};

export function useTheme(){
  return useColorScheme() === 'dark' ? dark : light;
}
