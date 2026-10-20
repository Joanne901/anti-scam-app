import { useColorScheme } from 'react-native';

// 配色：只用黑白灰（俐落科技感），不用藍色
//  solid    主要動作按鈕（檢查、分析…）用黑色
//  primary  點綴：文字連結、圖示、選中的分類、步驟編號，也是黑色（深色模式是白色）
//  danger / warn / ok  只用在風險提示，整個 app 只有這裡有顏色
const light = {
  bg:'#f4f4f5', surface:'#ffffff', surface2:'#fafafa', border:'#e4e4e7',
  text:'#09090b', textDim:'#52525b', textFaint:'#a1a1aa',
  solid:'#18181b', solidInk:'#ffffff',
  primary:'#18181b', primaryInk:'#ffffff', primarySoft:'#f1f1f3',
  danger:'#dc2626', dangerSoft:'#fef2f2', dangerInk:'#991b1b',
  warn:'#d97706', warnSoft:'#fffbeb', warnInk:'#92400e',
  ok:'#16a34a', okSoft:'#f0fdf4', okInk:'#166534',
  shadow: 0,
};

const dark = {
  bg:'#09090b', surface:'#141417', surface2:'#1c1c20', border:'#27272a',
  text:'#fafafa', textDim:'#a1a1aa', textFaint:'#71717a',
  solid:'#fafafa', solidInk:'#09090b',
  primary:'#fafafa', primaryInk:'#09090b', primarySoft:'#1f1f23',
  danger:'#f87171', dangerSoft:'#2a1214', dangerInk:'#fca5a5',
  warn:'#fbbf24', warnSoft:'#2a2010', warnInk:'#fcd34d',
  ok:'#4ade80', okSoft:'#0f2416', okInk:'#86efac',
  shadow: 0,
};

export function useTheme(){
  return useColorScheme() === 'dark' ? dark : light;
}
