import React from 'react';
import { View, Text, Pressable, Platform, useColorScheme } from 'react-native';
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
import { InstallGuide } from './install';
import { isStandalone, deviceKind } from './pwa';

const Tab = createBottomTabNavigator();
const TAB_BAR_HEIGHT = 64;
const STANDALONE = Platform.OS === 'web' && isStandalone();

// 頁首上緣要留的空間：從主畫面打開時，藍色頁首會延伸到手機狀態列（時間、電量）底下，
// 用 safe-area 讓出狀態列，再多留一點讓分頁不要貼著狀態列
function headerTop(insetTop){
  if (!STANDALONE) return insetTop;
  if (insetTop > 0) return insetTop + 4;
  return deviceKind() === 'ios' ? 50 : 14; // 讀不到 safe-area 時的保守值
}

const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.75 }}>{emoji}</Text>
);

// 分頁按鈕：選中的分頁底下有一條短的白色圓角底線
const TabButton = (c) => ({ children, style, onPress, onLongPress, ...rest }) => {
  const selected = rest['aria-selected'] ?? rest.accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={style}
    >
      {children}
      <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: 26, height: 3, borderRadius: 2, backgroundColor: selected ? c.headerInk : 'transparent' }} />
    </Pressable>
  );
};

function Tabs(){
  const insets = useSafeAreaInsets();
  const top = headerTop(insets.top);
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
          screenOptions={{
            tabBarPosition: 'top',
            tabBarLabelPosition: 'below-icon',
            headerShown: false,
            tabBarActiveTintColor: c.headerInk,
            tabBarInactiveTintColor: c.headerDim,
            tabBarStyle: { height: TAB_BAR_HEIGHT + top, paddingTop: top, backgroundColor: c.header, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
            tabBarItemStyle: { paddingTop: 2, paddingBottom: 9 },
            // 內容區像一張圓角卡片疊在藍色頁首上
            sceneStyle: { backgroundColor: c.header },
            tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2, flexShrink: 0 },
            tabBarActiveBackgroundColor: c.header,
            tabBarButton: TabButton(c),
          }}
        >
          <Tab.Screen name="查網址" component={UrlScreen} options={{ tabBarIcon: TabIcon('🔗') }} />
          <Tab.Screen name="驗訊息" component={MessageScreen} options={{ tabBarIcon: TabIcon('💬') }} />
          <Tab.Screen name="圖鑑" component={GuideScreen} options={{ tabBarIcon: TabIcon('📖') }} />
          <Tab.Screen name="緊急求助" component={SosScreen} options={{ tabBarIcon: TabIcon('🆘') }} />
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
