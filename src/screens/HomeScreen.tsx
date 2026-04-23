import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, Alert, Clipboard, TextInput, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import QRCode from 'react-native-qrcode-svg';
import { keypairFromMnemonic } from '../lib/wallet';
import { getBalance } from '../lib/transfer';
import { getTokenBalance, getTokenInfo } from '../lib/token';
import { setCurrentWallet } from '../lib/keystore';

// 네이티브 리소스 사용 (안드로이드 drawable 폴더에 직접 넣은 파일)
const TOKEN_LOGO_NATIVE = { uri: 'token_logo' };

export default function HomeScreen({ navigation, route }: any) {
  const { mnemonic } = route.params;
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddTokenModalVisible, setAddTokenModalVisible] = useState(false);
  const [isMnemonicVisible, setMnemonicVisible] = useState(false);
  const [isReceiveModalVisible, setReceiveModalVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);
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

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('성공', `${label}가 복사되었습니다.`);
  };

  const handleViewMnemonic = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: '니모닉 확인을 위해 인증이 필요합니다.',
    });
    if (result.success) {
      setMnemonicVisible(true);
    }
  };

  const handleLogout = async () => {
    await setCurrentWallet(null);
    navigation.replace('Welcome');
  };

  const openTokenExplorer = (mint: string) => {
    WebBrowser.openBrowserAsync(`https://explorer.solana.com/address/${mint}?cluster=mainnet-beta`);
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
        <View style={styles.headerLeft}>
          <View style={styles.titleContainer}>
            {/* 제목 왼쪽: 테두리 없이 로고 이미지만 배치 */}
            <Image 
              source={TOKEN_LOGO_NATIVE} 
              style={styles.headerLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>SolaEver</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleViewMnemonic} style={styles.mnemonicBtn}>
            <Text style={styles.mnemonicBtnText}>View Mnemonic</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>NATIVE BALANCE</Text>
        <View style={styles.balanceRow}>
          <View style={[styles.tokenLogoContainer, { borderWidth: 2, borderColor: '#fff' }]}>
            {/* 잔고 왼쪽: 테두리가 강화된 컨테이너 내부의 로고 */}
            <Image 
              source={TOKEN_LOGO_NATIVE} 
              style={styles.cardTokenLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.balance}>{balance !== null ? `${balance.toLocaleString()} SLE` : '---'}</Text>
        </View>
        <View style={styles.addressRow}>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">{address}</Text>
          <TouchableOpacity onPress={() => setReceiveModalVisible(true)} style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Receive</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Tokens</Text>
      {tokens.map((item, index) => {
        const info = getTokenInfo(item.mint);
        return (
          <TouchableOpacity 
            key={index} 
            style={styles.tokenItem}
            onPress={() => setSelectedToken({...item, ...info})}
          >
            <View>
              <Text style={styles.tokenSymbol}>{info.symbol}</Text>
              <Text style={styles.tokenMint}>{item.mint.slice(0, 4)}...{item.mint.slice(-4)}</Text>
            </View>
            <Text style={styles.tokenBalance}>{item.balance.toLocaleString()} {info.symbol}</Text>
          </TouchableOpacity>
        );
      })}

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

      {/* Receive Modal with QR Code */}
      <Modal visible={isReceiveModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Receive Assets</Text>
            <View style={styles.qrContainer}>
              <QRCode value={address} size={200} color="#333" backgroundColor="#fff" />
            </View>
            <Text style={styles.qrAddressText}>{address}</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => copyToClipboard(address, "주소")}>
              <Text style={styles.actionButtonText}>Copy Address</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setReceiveModalVisible(false)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Token Detail Modal */}
      <Modal visible={!!selectedToken} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { minHeight: 300 }]}>
            <Text style={styles.modalTitle}>Token Detail</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{selectedToken?.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Symbol</Text>
              <Text style={styles.detailValue}>{selectedToken?.symbol}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mint Address</Text>
              <Text style={[styles.detailValue, { fontSize: 12, fontFamily: 'monospace' }]}>{selectedToken?.mint}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Balance</Text>
              <Text style={[styles.detailValue, { fontWeight: 'bold', fontSize: 18 }]}>{selectedToken?.balance?.toLocaleString()} {selectedToken?.symbol}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => openTokenExplorer(selectedToken.mint)}
            >
              <Text style={styles.actionButtonText}>View on Explorer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedToken(null)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 모달 로직 (이전과 동일) */}
      <Modal visible={isMnemonicVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your Mnemonic</Text>
            <View style={styles.mnemonicBox}>
              <Text style={styles.mnemonicText}>{mnemonic}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={() => copyToClipboard(mnemonic, "니모닉")}>
              <Text style={styles.actionButtonText}>Copy to Clipboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMnemonicVisible(false)}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddTokenModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add SPL Token</Text>
            <TextInput style={styles.input} placeholder="Token Mint Address" value={newTokenMint} onChangeText={setNewTokenMint} autoCapitalize="none" />
            <TouchableOpacity style={styles.actionButton} onPress={async () => {
              if (!newTokenMint) return;
              const saved = await AsyncStorage.getItem(`tokens_${address}`);
              const mintList = saved ? JSON.parse(saved) : [];
              if (!mintList.includes(newTokenMint)) {
                await AsyncStorage.setItem(`tokens_${address}`, JSON.stringify([...mintList, newTokenMint]));
                setNewTokenMint('');
                setAddTokenModalVisible(false);
                loadWallet();
              }
            }}><Text style={styles.actionButtonText}>Add Token</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddTokenModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa', flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerLeft: { flex: 1 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  title: { fontSize: 24, fontWeight: 'bold', marginRight: 10, color: '#333' },
  headerLogo: { width: 32, height: 32, marginRight: 10, zIndex: 102 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: '#ff3b30', marginLeft: 15, fontWeight: '600' },
  mnemonicBtn: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  mnemonicBtnText: { color: '#34c759', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#34c759', borderRadius: 20, padding: 25, marginBottom: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, zIndex: 10, overflow: 'visible' },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 15, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, zIndex: 11, overflow: 'visible' },
  tokenLogoContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 15, elevation: 2, zIndex: 12, overflow: 'visible' },
  cardTokenLogo: { width: 36, height: 36, zIndex: 13 },
  balance: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15 },
  address: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', marginRight: 10 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  copyBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  tokenItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  tokenSymbol: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tokenMint: { fontSize: 12, color: '#999' },
  tokenBalance: { fontSize: 16, fontWeight: 'bold' },
  addBtn: { alignItems: 'center', padding: 10, marginBottom: 20 },
  addBtnText: { color: '#34c759', fontWeight: 'bold' },
  actions: { marginTop: 10 },
  actionButton: { backgroundColor: '#34c759', padding: 18, borderRadius: 15, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  historyButton: { borderWidth: 1, borderColor: '#34c759', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 15 },
  historyButtonText: { color: '#34c759', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#fff', borderRadius: 25, padding: 30, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  mnemonicBox: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#eee' },
  mnemonicText: { fontSize: 17, color: '#333', lineHeight: 26, textAlign: 'center', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 15, marginBottom: 25, fontSize: 16 },
  qrContainer: { alignItems: 'center', marginVertical: 20, padding: 20, backgroundColor: '#fff', borderRadius: 20, elevation: 5 },
  qrAddressText: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20, fontFamily: 'monospace' },
  cancelBtn: { alignItems: 'center', marginTop: 20, padding: 10 },
  detailRow: { marginBottom: 15 },
  detailLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#333' }
});
