import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from './theme';
import UrlScreen from './screens/UrlScreen';
import MessageScreen from './screens/MessageScreen';
import GuideScreen from './screens/GuideScreen';
import SosScreen from './screens/SosScreen';

const Tab = createBottomTabNavigator();

const TabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
);

export default function App(){
  const scheme = useColorScheme();
  const c = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.surface, border: c.border, text: c.text, primary: c.primary },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.textFaint,
            tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
            headerStyle: { backgroundColor: c.surface },
            headerTitleStyle: { color: c.text, fontWeight: '800' },
            headerTitleAlign: 'center',
            headerShadowVisible: false,
          }}
        >
          <Tab.Screen name="查網址" component={UrlScreen} options={{ tabBarIcon: TabIcon('🔗') }} />
          <Tab.Screen name="驗訊息" component={MessageScreen} options={{ tabBarIcon: TabIcon('💬') }} />
          <Tab.Screen name="圖鑑" component={GuideScreen} options={{ tabBarIcon: TabIcon('📖') }} />
          <Tab.Screen name="被騙了" component={SosScreen} options={{ tabBarIcon: TabIcon('🆘') }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
