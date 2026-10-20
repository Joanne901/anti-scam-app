import { useColorScheme, Platform } from 'react-native';

// 配色：黑白灰為底（俐落科技感），午夜霧藍當點綴，按鈕是亮銀色金屬鉻
//  solid    所有按鈕（檢查、分析、選中的分類、撥打…）：鉻銀，字是深色
//  primary  午夜霧藍：圖示、文字連結、步驟編號、引言左邊的直線
//  primarySoft / primaryLine  霧藍的淡底色與細框線（圖示底、上傳框）
//  iceSheen  淡底色上的光澤（上面亮、下面略深，頂端一條白色亮邊）
//  danger   絲絨玫瑰紅：高風險提示與 165 / 110 按鈕（dangerTop / dangerBottom / dangerGlow 是立體按鈕用：花瓣受光處漸到花瓣本色）
//  warn     琥珀色：可疑
//  ok       天空藍：正常、正確做法（原本的綠色都換成這個藍）
//  sky      同一個天空藍，當點綴用（圖鑑的「共通原則」）
//  silverText / silverFaint / silverOn  淺一點的銀灰色字（圖鑑的手法卡片、處理步驟、更新通知、加到主畫面、上傳）；silverOn 是在鉻銀底上用的
const SKY = '#8ecdf5';

const light = {
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#dfe5ec', solidInk:'#0a0d12',
  primary:'#1f3448', primaryInk:'#ffffff', primarySoft:'#e7edf3', primaryLine:'#9db0c3',
  iceSheen: { backgroundImage: 'linear-gradient(180deg, #f6f8fb 0%, #e7edf3 60%, #dbe3eb 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)' },
  danger:'#cb0218', dangerSoft:'#fdeef0', dangerInk:'#b80519',
  dangerTop:'#dc0c26', dangerBottom:'#b80519', dangerGlow:'184,5,25',
  warn:'#d97706', warnSoft:'#fffbeb', warnInk:'#92400e',
  sky: SKY,
  silverText:'#5c6675', silverFaint:'#8a94a1', silverOn:'#3d4653',
  ok: SKY, okSoft:'#eef8fe', okInk:'#2b7bb0',
  shadow: 0,
};

const dark = {
  bg:'#09090b', surface:'#141417', surface2:'#1c1c20', border:'#27272a',
  text:'#fafafa', textDim:'#a1a1aa', textFaint:'#71717a',
  solid:'#dfe5ec', solidInk:'#0a0d12',
  primary:'#a9bfd4', primaryInk:'#09090b', primarySoft:'#141c25', primaryLine:'#33465a',
  iceSheen: { backgroundImage: 'linear-gradient(180deg, #1b2633 0%, #131b24 100%)' },
  danger:'#f0263c', dangerSoft:'#2a0b10', dangerInk:'#ff8a98',
  dangerTop:'#e8182f', dangerBottom:'#c00a1f', dangerGlow:'0,0,0',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  sky: SKY,
  silverText:'#c9d1db', silverFaint:'#9aa4b1', silverOn:'#3d4653',
  ok: SKY, okSoft:'#0d2230', okInk:'#bfe4fb',
  shadow: 0,
};

// 冰藍底色加光澤（只有網頁版）
export function iceFill(c){
  return Platform.OS === 'web' ? c.iceSheen : null;
}

export function useTheme(){
  return useColorScheme() === 'dark' ? dark : light;
}
