import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { loadWallets, setCurrentWallet, deleteWallet, WalletInfo } from '../lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
};

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallets = async () => {
    setLoading(true);
    const list = await loadWallets();
    setWallets(list);
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchWallets();
    });
    return unsubscribe;
  }, [navigation]);

  const authenticate = async (reason: string): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) return true;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: '비밀번호 사용',
      });
      return result.success;
    } catch (e) {
      return false;
    }
  };

  const handleSelectWallet = async (wallet: WalletInfo) => {
    const success = await authenticate(`${wallet.name} 지갑 접속 인증`);
    if (success) {
      await setCurrentWallet(wallet.address);
      navigation.replace('Home', { mnemonic: wallet.mnemonic });
    } else {
      Alert.alert('인증 실패', '지갑에 접속할 수 없습니다.');
    }
  };

  const handleDeleteWallet = async (wallet: WalletInfo) => {
    const success = await authenticate(`${wallet.name} 지갑 삭제 인증`);
    if (!success) {
      Alert.alert('인증 실패', '인증이 완료되지 않아 삭제할 수 없습니다.');
      return;
    }

    Alert.alert(
      '지갑 삭제',
      `'${wallet.name}' 지갑을 목록에서 삭제하시겠습니까? 니모닉을 따로 보관하지 않았다면 복구할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: async () => {
            await deleteWallet(wallet.address);
            fetchWallets();
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SolaEver Wallet</Text>
      <Text style={styles.subtitle}>Welcome to SLE Network</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#34c759" />
      ) : (
        <View style={styles.walletListContainer}>
          {wallets.length > 0 && <Text style={styles.sectionTitle}>Saved Wallets</Text>}
          <ScrollView style={styles.scrollView}>
            {wallets.map((w, i) => (
              <View key={i} style={styles.walletItem}>
                <TouchableOpacity 
                  style={styles.walletInfo} 
                  onPress={() => handleSelectWallet(w)}
                >
                  <Text style={styles.walletName}>{w.name}</Text>
                  <Text style={styles.walletAddress}>{w.address.slice(0, 8)}...{w.address.slice(-8)}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteWallet(w)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('CreateWallet')}
        >
          <Text style={styles.buttonText}>Create New Wallet</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('RestoreWallet')}
        >
          <Text style={styles.secondaryButtonText}>Restore Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 60,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  walletListContainer: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  deleteBtn: {
    padding: 10,
  },
  deleteBtnText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#34c759',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#34c759',
  },
  secondaryButtonText: {
    color: '#34c759',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
