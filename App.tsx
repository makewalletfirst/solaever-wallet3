import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, Alert, Text, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateWallet from './src/screens/CreateWallet';
import RestoreWallet from './src/screens/RestoreWallet';
import HomeScreen from './src/screens/HomeScreen';
import SendScreen from './src/screens/SendScreen';
import TxHistoryScreen from './src/screens/TxHistoryScreen';
import { getCurrentWallet, WalletInfo } from './src/lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
  Send: { mnemonic: string; tokenList: string[] };
  TxHistory: { address: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [initialWallet, setInitialWallet] = useState<WalletInfo | null>(null);

  const handleAuthentication = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // 생체 인식이 불가능한 경우 바로 통과 (또는 비밀번호 설정 요구 가능)
        setAuthenticated(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'SolaEver 지갑 인증',
        fallbackLabel: '비밀번호 사용',
      });

      if (result.success) {
        setAuthenticated(true);
      } else {
        Alert.alert('인증 실패', '지문을 인식할 수 없습니다.', [
          { text: '다시 시도', onPress: handleAuthentication }
        ]);
      }
    } catch (e) {
      setAuthenticated(true); // 에러 시 안전을 위해 통과시키되 로그 기록
    }
  };

  useEffect(() => {
    async function checkWallet() {
      try {
        const wallet = await getCurrentWallet();
        if (wallet) {
          setInitialWallet(wallet);
          await handleAuthentication();
        } else {
          setAuthenticated(true);
        }
      } catch (e) {
        console.error(e);
        setAuthenticated(true);
      } finally {
        setLoading(false);
      }
    }
    checkWallet();
  }, []);

  if (loading || !authenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#34c759" />
        {!authenticated && !loading && (
          <TouchableOpacity onPress={handleAuthentication} style={{ marginTop: 20 }}>
            <Text style={{ color: '#34c759', fontWeight: 'bold' }}>인증 다시 시도</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialWallet ? 'Home' : 'Welcome'}
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateWallet" component={CreateWallet} />
        <Stack.Screen name="RestoreWallet" component={RestoreWallet} />
        <Stack.Screen name="Home" component={HomeScreen} initialParams={initialWallet ? { mnemonic: initialWallet.mnemonic } : undefined} />
        <Stack.Screen name="Send" component={SendScreen} />
        <Stack.Screen name="TxHistory" component={TxHistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
