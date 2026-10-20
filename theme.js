import { useColorScheme } from 'react-native';

const light = {
  bg:'#eef0f6', surface:'#ffffff', surface2:'#f6f7fb', border:'#e3e6ef',
  text:'#161922', textDim:'#596075', textFaint:'#8b92a6',
  primary:'#3b5bdb', primaryInk:'#ffffff', primarySoft:'#e7ecfb',
  danger:'#e03131', dangerSoft:'#fdecec', dangerInk:'#b01c1c',
  warn:'#e8820c', warnSoft:'#fff3e0', warnInk:'#9a5600',
  ok:'#2f9e44', okSoft:'#e7f6ec', okInk:'#1e7a30',
  statusBar:'#5145d8', // 從主畫面打開時，手機狀態列那一條的靛紫色
};

const dark = {
  bg:'#0e1014', surface:'#191c23', surface2:'#20242d', border:'#2b303c',
  text:'#eaedf4', textDim:'#9aa2b5', textFaint:'#747c90',
  primary:'#5c7cfa', primaryInk:'#0e1014', primarySoft:'#1c2740',
  danger:'#ff6b6b', dangerSoft:'#38191b', dangerInk:'#ff9b9b',
  warn:'#ffa94d', warnSoft:'#39290f', warnInk:'#ffc078',
  ok:'#51cf66', okSoft:'#15281a', okInk:'#8ce99a',
  statusBar:'#2e2a6e',
};

export function useTheme(){
  return useColorScheme() === 'dark' ? dark : light;
}
