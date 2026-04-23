import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert, Clipboard, TextInput, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { keypairFromMnemonic } from '../lib/wallet';
import { getBalance } from '../lib/transfer';
import { getTokenBalance } from '../lib/token';

const SOLAEVER_TOKEN_IMAGE = require('../../assets/solaever_token.png');

export default function HomeScreen({ navigation, route }: any) {
  const { mnemonic } = route.params;
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenModalVisible, setAddTokenModalVisible] = useState(false);
  const [newTokenMint, setNewTokenMint] = useState('');

  const loadSavedTokens = async (ownerAddr: string) => {
    try {
      const saved = await AsyncStorage.getItem(`tokens_${ownerAddr}`);
      const mintList = saved ? JSON.parse(saved) : [];
      const tokenData = await Promise.all(mintList.map(async (mint: string) => {
        const bal = await getTokenBalance(mint, ownerAddr);
        return { mint, balance: bal };
      }));
      setTokens(tokenData);
    } catch (e) { console.error(e); }
  };

  const addToken = async () => {
    if (!newTokenMint) return;
    try {
      const saved = await AsyncStorage.getItem(`tokens_${address}`);
      const mintList = saved ? JSON.parse(saved) : [];
      if (!mintList.includes(newTokenMint)) {
        const newList = [...mintList, newTokenMint];
        await AsyncStorage.setItem(`tokens_${address}`, JSON.stringify(newList));
        setNewTokenMint('');
        setAddTokenModalVisible(false);
        loadWallet();
      }
    } catch (e) { Alert.alert('에러', '토큰 추가 실패'); }
  };

  const loadWallet = useCallback(async () => {
    try {
      const keypair = await keypairFromMnemonic(mnemonic);
      const pubkey = keypair.publicKey.toBase58();
      setAddress(pubkey);
      const bal = await getBalance(pubkey);
      setBalance(bal);
      await loadSavedTokens(pubkey);
    } catch (error: any) {
      Alert.alert('Network Error', '잔고를 불러오지 못했습니다.');
    }
  }, [mnemonic]);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const copyToClipboard = () => {
    Clipboard.setString(address);
    Alert.alert('성공', '주소가 복사되었습니다.');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>SolaEver</Text>
        <TouchableOpacity onPress={() => navigation.replace('Welcome')}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>NATIVE BALANCE</Text>
        <View style={styles.balanceRow}>
          <Image 
            source={SOLAEVER_TOKEN_IMAGE} 
            style={styles.tokenLogo}
          />
          <Text style={styles.balance}>{balance !== null ? `${balance.toLocaleString()} SLE` : '---'}</Text>
        </View>
        <View style={styles.addressRow}>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">{address}</Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Assets</Text>
      {tokens.map((item, index) => (
        <View key={index} style={styles.tokenItem}>
          <Text style={styles.tokenMint}>{item.mint.slice(0, 8)}...{item.mint.slice(-8)}</Text>
          <Text style={styles.tokenBalance}>{item.balance.toLocaleString()} TOKEN</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={() => setAddTokenModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Token Mint</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Send', { mnemonic, tokenList: tokens.map(t => t.mint) })}>
          <Text style={styles.actionButtonText}>Send Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('TxHistory', { address })}>
          <Text style={styles.historyButtonText}>Transaction History</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isAddTokenModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add SPL Token</Text>
            <TextInput style={styles.input} placeholder="Token Mint Address" value={newTokenMint} onChangeText={setNewTokenMint} autoCapitalize="none" />
            <TouchableOpacity style={styles.actionButton} onPress={addToken}><Text style={styles.actionButtonText}>Add Token</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddTokenModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa', flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold' },
  logoutText: { color: '#ff3b30' },
  card: { backgroundColor: '#34c759', borderRadius: 20, padding: 25, marginBottom: 30, elevation: 5 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  tokenLogo: { width: 28, height: 28, marginRight: 10, borderRadius: 14 },
  balance: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15 },
  address: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', marginRight: 10 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  copyBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  tokenItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10 },
  tokenMint: { fontSize: 14, color: '#666' },
  tokenBalance: { fontSize: 16, fontWeight: 'bold' },
  addBtn: { alignItems: 'center', padding: 10 },
  addBtnText: { color: '#34c759', fontWeight: 'bold' },
  actions: { marginTop: 20 },
  actionButton: { backgroundColor: '#34c759', padding: 18, borderRadius: 15, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  historyButton: { borderWidth: 1, borderColor: '#34c759', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  historyButtonText: { color: '#34c759', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, marginBottom: 20 },
  cancelBtn: { alignItems: 'center', marginTop: 15 }
});
