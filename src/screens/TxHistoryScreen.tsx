import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransactionHistory } from '../lib/transfer';

export default function TxHistoryScreen({ route }: any) {
  const { address } = route.params;
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  // 1. 저장소에서 즉시 데이터 불러오기
  const loadLocalFirst = async () => {
    try {
      const saved = await AsyncStorage.getItem(`history_v2_${address}`);
      if (saved && isMounted.current) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) { console.error(e); }
  };

  // 2. 서버 데이터 동기화 (백그라운드)
  const syncWithServer = useCallback(async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
    
    try {
      const remoteData = await getTransactionHistory(address);
      const saved = await AsyncStorage.getItem(`history_v2_${address}`);
      const cached = saved ? JSON.parse(saved) : [];

      // 머지: 로컬 내역 + 서버 내역 (중복 제거)
      const uniqueMap = new Map();
      [...cached, ...remoteData].forEach(item => {
        if (item.signature && !uniqueMap.has(item.signature)) {
          uniqueMap.set(item.signature, item);
        }
      });

      const finalData = Array.from(uniqueMap.values())
        .sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0))
        .slice(0, 50);

      if (isMounted.current) {
        setHistory(finalData);
        await AsyncStorage.setItem(`history_v2_${address}`, JSON.stringify(finalData));
      }
    } catch (e) {
      console.warn("Sync failed", e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [address]);

  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      await loadLocalFirst(); // 0.1초 만에 로컬 데이터 표시
      syncWithServer();       // 조용히 서버와 대조
    };
    init();
    return () => { isMounted.current = false; };
  }, [syncWithServer]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => Linking.openURL(`https://solaever.ever-chain.xyz/tx/${item.signature}`)}>
      <View style={styles.itemHeader}>
        <Text style={[styles.status, { color: item.err ? '#ff3b30' : '#34c759' }]}>
          {item.err ? 'Failed' : (item.isLocal ? 'Sent (Local)' : 'Confirmed')}
        </Text>
        <Text style={styles.date}>{item.blockTime ? new Date(item.blockTime * 1000).toLocaleString() : 'Pending'}</Text>
      </View>
      <Text style={styles.signature} numberOfLines={1} ellipsizeMode="middle">{item.signature}</Text>
      {item.memo && <Text style={styles.memo}>{item.memo}</Text>}
      <Text style={styles.explorerLink}>View in Explorer →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      {loading && history.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.signature}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); syncWithServer(true); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  status: { fontWeight: 'bold', fontSize: 13 },
  date: { fontSize: 11, color: '#8e8e93' },
  signature: { fontSize: 13, color: '#3a3a3c', fontFamily: 'monospace', marginBottom: 5 },
  memo: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginBottom: 5 },
  explorerLink: { fontSize: 11, color: '#8e8e93', textAlign: 'right', textDecorationLine: 'underline' },
  empty: { textAlign: 'center', marginTop: 50, color: '#8e8e93' }
});
