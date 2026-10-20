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
const TAB_BAR_HEIGHT = 54;
const STANDALONE = Platform.OS === 'web' && isStandalone();
// 從主畫面打開時沒有瀏覽器網址列，分頁列會直接貼著手機狀態列（時間、電量），往下留一點空間
const STANDALONE_GAP = STANDALONE ? 14 : 0;

// 從主畫面打開時，手機狀態列（時間、電量那一條）的高度；頁面會延伸到狀態列底下，這一條塗上靛紫色
function statusBarHeight(insetTop){
  if (!STANDALONE) return 0;
  if (insetTop > 0) return insetTop;
  return deviceKind() === 'ios' ? 47 : 0; // 讀不到 safe-area 時的保守值（Android 的狀態列由系統依 theme_color 上色）
}

// 分頁列只放圖示、不放文字也不上色：目前所在的分頁圖示亮一點、大一點，其他的淡一點
const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: focused ? 26 : 23, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
);

const TabButton = () => ({ children, style, onPress, onLongPress, ...rest }) => {
  const selected = rest['aria-selected'] ?? rest.accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={rest.accessibilityLabel ?? rest['aria-label']}
      style={style}
    >
      {children}
    </Pressable>
  );
};

function Tabs(){
  const insets = useSafeAreaInsets();
  const statusH = statusBarHeight(insets.top);
  const top = statusH + STANDALONE_GAP;
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
            tabBarShowLabel: false,
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.textFaint,
            tabBarStyle: { height: TAB_BAR_HEIGHT + top, paddingTop: top, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, elevation: 0, shadowOpacity: 0 },
            tabBarItemStyle: { justifyContent: 'center' },
            tabBarActiveBackgroundColor: c.surface,
            tabBarButton: TabButton(),
          }}
        >
          <Tab.Screen name="查網址" component={UrlScreen} options={{ tabBarIcon: TabIcon('🔗'), tabBarAccessibilityLabel: '查網址' }} />
          <Tab.Screen name="驗訊息" component={MessageScreen} options={{ tabBarIcon: TabIcon('💬'), tabBarAccessibilityLabel: '驗訊息' }} />
          <Tab.Screen name="圖鑑" component={GuideScreen} options={{ tabBarIcon: TabIcon('📖'), tabBarAccessibilityLabel: '圖鑑' }} />
          <Tab.Screen name="緊急求助" component={SosScreen} options={{ tabBarIcon: TabIcon('🆘'), tabBarAccessibilityLabel: '緊急求助' }} />
        </Tab.Navigator>
      </NavigationContainer>
      {statusH > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: statusH, backgroundColor: c.statusBar }} />
      )}
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
