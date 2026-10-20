import { useColorScheme } from 'react-native';

// 配色：黑白灰為底（俐落科技感），霜霧藍當點綴，紅色調成跟它搭的霧紅
//  solid    主要動作按鈕（檢查、分析…）用黑色
//  primary  霜霧藍：圖示、文字連結、選中的分類、步驟編號
//  primarySoft / primaryLine  霜霧藍的淡底色與細框線
//  iceTop / iceBottom / iceGlow  霜霧藍立體按鈕的漸層與陰影
//  danger   霧紅：高風險提示與 165 / 110 按鈕（dangerTop / dangerBottom / dangerGlow 是立體按鈕用）
//  warn / ok  只用在風險提示
const light = {
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#18181b', solidInk:'#ffffff',
  primary:'#4a7aa3', primaryInk:'#ffffff', primarySoft:'#edf3f8', primaryLine:'#c9d9e8',
  iceTop:'#f8fbfd', iceBottom:'#dfe8f2', iceGlow:'74,122,163',
  danger:'#c0474b', dangerSoft:'#fbf2f2', dangerLine:'#ecc9ca', dangerInk:'#8e2f33',
  dangerTop:'#cc5b5f', dangerBottom:'#ab3a3f', dangerGlow:'171,58,63',
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
  danger:'#e57f82', dangerSoft:'#2a1719', dangerLine:'#5a2a2d', dangerInk:'#f2b3b5',
  dangerTop:'#d8696d', dangerBottom:'#b44d51', dangerGlow:'0,0,0',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  ok:'#4ade80', okSoft:'#0f2416', okInk:'#86efac',
  shadow: 0,
};

export function useTheme(){
  return useColorScheme() === 'dark' ? dark : light;
}
