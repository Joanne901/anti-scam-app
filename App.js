import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Platform, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from './theme';
import UrlScreen from './screens/UrlScreen';
import MessageScreen from './screens/MessageScreen';
import GuideScreen from './screens/GuideScreen';
import SosScreen from './screens/SosScreen';
import Banners from './banners';
import Icon from './icons';
import { buzz, chrome } from './components';
import { InstallGuide } from './install';
import { isStandalone } from './pwa';
import { loadFonts } from './fonts';

loadFonts();

const Tab = createBottomTabNavigator();
const TAB_BAR_HEIGHT = 58;
const STANDALONE = Platform.OS === 'web' && isStandalone();
// 從主畫面打開時沒有瀏覽器網址列，分頁列會直接貼著手機狀態列（時間、電量），往下留一點空間
const STANDALONE_GAP = STANDALONE ? 14 : 0;


// 分頁列只放線條圖示、不放文字也不上色：目前所在的分頁深色、線條粗一點，其他淺灰
// 分頁列：只有線條圖示、不放文字。
// 目前所在的分頁有一顆鉻銀膠囊（金屬漸層＋中間一道反光），
// 切換分頁時膠囊會滑過去；按下去時按鈕會縮小、陰影變成往內凹，像按到實體按鈕
const PILL_W = 62, PILL_H = 40;

// 按住還沒選中的分頁時，底下出現的淺灰凹槽（網頁版用 CSS 的漸層與陰影）
function pillLook(dark, pressed){
  if (dark) return pressed
    ? { backgroundImage: 'linear-gradient(180deg, #1b1b1f 0%, #232328 100%)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04)' }
    : { backgroundImage: 'linear-gradient(180deg, #34343a 0%, #222227 100%)', boxShadow: '0 4px 10px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)' };
  return pressed
    ? { backgroundImage: 'linear-gradient(180deg, #e4e4e9 0%, #ededf1 100%)', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.14), inset 0 -1px 0 rgba(255,255,255,0.8)' }
    : { backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #e9e9ee 100%)', boxShadow: '0 4px 10px rgba(15,15,25,0.12), 0 1px 2px rgba(15,15,25,0.10), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.05)' };
}

function TopTabBar({ state, descriptors, navigation, c, top, dark }){
  const [width, setWidth] = useState(0);
  const [pressing, setPressing] = useState(-1);
  const pos = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    Animated.spring(pos, { toValue: state.index, useNativeDriver: false, friction: 8, tension: 90 }).start();
  }, [state.index, pos]);

  const n = state.routes.length;
  const tabW = width / n;
  const translateX = pos.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [(tabW - PILL_W) / 2, (tabW - PILL_W) / 2 + tabW * Math.max(1, n - 1)] });
  const pillPressed = pressing === state.index;

  return (
    <View style={{ height: TAB_BAR_HEIGHT + top, paddingTop: top, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ flex: 1, flexDirection: 'row' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View pointerEvents="none" style={[{
            position: 'absolute', top: (TAB_BAR_HEIGHT - PILL_H) / 2, left: 0, width: PILL_W, height: PILL_H,
            borderRadius: PILL_H / 2, backgroundColor: c.bg,
            transform: [{ translateX }, { scale: pillPressed ? 0.94 : 1 }],
          }, Platform.OS === 'web' ? chrome(pillPressed, dark) : null]} />
        )}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          const sinking = pressing === i && !focused; // 按住還沒選中的分頁：底下出現一個凹下去的淺坑
          return (
            <Pressable key={route.key} onPress={onPress} onPressIn={() => { buzz(); setPressing(i); }} onPressOut={() => setPressing(-1)}
              accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={options.tabBarAccessibilityLabel}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {sinking && (
                <View pointerEvents="none" style={[{ position: 'absolute', width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: c.bg },
                  Platform.OS === 'web' ? pillLook(dark, true) : null]} />
              )}
              <View style={{ transform: [{ scale: pressing === i ? 0.88 : 1 }] }}>
                <Icon name={options.tabIcon} size={22} color={focused ? c.text : c.textFaint} strokeWidth={focused ? 2.2 : 1.7} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Tabs(){
  const insets = useSafeAreaInsets();
  const top = insets.top + STANDALONE_GAP;
  const scheme = useColorScheme();
  const c = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.surface, border: c.border, text: c.text, primary: c.primary },
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          // 分頁列放在上方：手機瀏覽器底部的工具列會遮住下方分頁列
          screenOptions={{ tabBarPosition: 'top', headerShown: false }}
          tabBar={(props) => <TopTabBar {...props} c={c} top={top} dark={scheme === 'dark'} />}
        >
          <Tab.Screen name="查網址" component={UrlScreen} options={{ tabIcon: 'link', tabBarAccessibilityLabel: '查網址' }} />
          <Tab.Screen name="驗訊息" component={MessageScreen} options={{ tabIcon: 'message-square-text', tabBarAccessibilityLabel: '驗訊息' }} />
          <Tab.Screen name="圖鑑" component={GuideScreen} options={{ tabIcon: 'book-open', tabBarAccessibilityLabel: '圖鑑' }} />
          <Tab.Screen name="緊急求助" component={SosScreen} options={{ tabIcon: 'life-buoy', tabBarAccessibilityLabel: '緊急求助' }} />
        </Tab.Navigator>
      </NavigationContainer>
      <Banners top={top + TAB_BAR_HEIGHT + 8} />
      <InstallGuide />
    </View>
  );
}

export default function App(){
  return (
    <SafeAreaProvider>
      <Tabs />
    </SafeAreaProvider>
  );
}
