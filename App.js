import React from 'react';
import { View, Text, Pressable, useColorScheme } from 'react-native';
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

const Tab = createBottomTabNavigator();
const TAB_BAR_HEIGHT = 64;

const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
);

// 分頁按鈕：選中的分頁底下加一條主色底線
const TabButton = (c) => ({ children, style, onPress, onLongPress, ...rest }) => {
  const selected = rest['aria-selected'] ?? rest.accessibilityState?.selected;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={[style, { borderBottomWidth: 3, borderBottomColor: selected ? c.primary : 'transparent' }]}
    >
      {children}
    </Pressable>
  );
};

function Tabs(){
  const insets = useSafeAreaInsets();
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
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.textFaint,
            tabBarStyle: { height: TAB_BAR_HEIGHT + insets.top, paddingTop: insets.top, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border, elevation: 0, shadowOpacity: 0 },
            tabBarItemStyle: { paddingTop: 4, paddingBottom: 6 },
            tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2, flexShrink: 0 },
            tabBarActiveBackgroundColor: c.surface,
            tabBarButton: TabButton(c),
          }}
        >
          <Tab.Screen name="查網址" component={UrlScreen} options={{ tabBarIcon: TabIcon('🔗') }} />
          <Tab.Screen name="驗訊息" component={MessageScreen} options={{ tabBarIcon: TabIcon('💬') }} />
          <Tab.Screen name="圖鑑" component={GuideScreen} options={{ tabBarIcon: TabIcon('📖') }} />
          <Tab.Screen name="緊急求助" component={SosScreen} options={{ tabBarIcon: TabIcon('🆘') }} />
        </Tab.Navigator>
      </NavigationContainer>
      <Banners top={insets.top + TAB_BAR_HEIGHT + 8} />
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
