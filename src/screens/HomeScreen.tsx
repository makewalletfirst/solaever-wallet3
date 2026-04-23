import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert, Clipboard } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { keypairFromMnemonic } from '../lib/wallet';
import { getBalance } from '../lib/transfer';
import { deleteMnemonic } from '../lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
  Send: { mnemonic: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

export default function HomeScreen({ navigation, route }: Props) {
  const { mnemonic } = route.params;
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const keypair = await keypairFromMnemonic(mnemonic);
      const pubkey = keypair.publicKey.toBase58();
      setAddress(pubkey);
      
      const bal = await getBalance(pubkey);
      setBalance(bal);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Network Error', 'Failed to fetch balance: ' + (error.message || 'Unknown error'));
      setBalance(0);
    }
  }, [mnemonic]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const copyToClipboard = () => {
    Clipboard.setString(address);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure? Make sure you have your mnemonic saved. This will delete the key from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await deleteMnemonic();
            navigation.replace('Welcome');
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Wallet</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Balance</Text>
        <Text style={styles.balance}>
          {balance !== null ? `${balance.toLocaleString()} SLE` : 'Loading...'}
        </Text>
        
        <View style={styles.addressContainer}>
          <Text style={styles.label}>Address</Text>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
            {address}
          </Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copy Address</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Send', { mnemonic })}
        >
          <Text style={styles.actionButtonText}>Send SLE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 25,
  },
  addressContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    paddingTop: 20,
  },
  address: {
    fontSize: 16,
    color: '#3a3a3c',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#f2f2f7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  actions: {
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
