import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateWallet from './src/screens/CreateWallet';
import RestoreWallet from './src/screens/RestoreWallet';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import { loadMnemonic } from './src/lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
  Send: { mnemonic: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialMnemonic, setInitialMnemonic] = useState<string | null>(null);

  useEffect(() => {
    async function checkWallet() {
      try {
        const m = await loadMnemonic();
        if (m) {
          setInitialMnemonic(m);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    checkWallet();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialMnemonic ? 'Home' : 'Welcome'}
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateWallet" component={CreateWallet} />
        <Stack.Screen name="RestoreWallet" component={RestoreWallet} />
        <Stack.Screen name="Home" component={HomeScreen} initialParams={initialMnemonic ? { mnemonic: initialMnemonic } : undefined} />
        <Stack.Screen name="Send" component={SendScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
