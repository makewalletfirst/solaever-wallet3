import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransactionHistory } from '../lib/transfer';

export default function TxHistoryScreen({ route }: any) {
  const { address } = route.params;
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  // 1. 저장소에서 데이터 불러오기 (머지용)
  const getCachedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(`history_v2_${address}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  };

  // 2. 통합 로딩 및 머지 로직
  const syncHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
      // (1) 먼저 캐시된 데이터 로드 및 표시
      const cached = await getCachedData();
      if (isMounted.current && cached.length > 0) {
        setHistory(cached);
      }

      // (2) 서버에서 최신 데이터 가져오기
      const remoteData = await getTransactionHistory(address);
      
      // (3) 머지 전략: 서버 데이터 + 캐시 데이터 합친 후 중복 제거
      const combined = [...remoteData, ...cached];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (item.signature && !uniqueMap.has(item.signature)) {
          uniqueMap.set(item.signature, item);
        }
      });

      const finalData = Array.from(uniqueMap.values())
        .sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0))
        .slice(0, 50); // 최대 50개까지 보존

      if (isMounted.current) {
        setHistory(finalData);
        // (4) 결과가 있을 때만 최종 저장 (서버가 0개여도 finalData는 캐시 덕분에 유지됨)
        await AsyncStorage.setItem(`history_v2_${address}`, JSON.stringify(finalData));
      }
    } catch (e) {
      console.error("Sync history failed", e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [address]);

  useEffect(() => {
    isMounted.current = true;
    syncHistory();
    return () => { isMounted.current = false; };
  }, [syncHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    syncHistory(true);
  };

  const clearHistory = () => {
    Alert.alert("내역 삭제", "저장된 모든 트랜잭션 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        await AsyncStorage.removeItem(`history_v2_${address}`);
        setHistory([]);
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => Linking.openURL(`https://solaever.ever-chain.xyz/tx/${item.signature}`)}>
      <View style={styles.itemHeader}>
        <Text style={[styles.status, { color: item.err ? '#ff3b30' : '#34c759' }]}>{item.err ? 'Failed' : 'Success'}</Text>
        <Text style={styles.date}>{item.blockTime ? new Date(item.blockTime * 1000).toLocaleString() : 'Pending'}</Text>
      </View>
      <Text style={styles.signature} numberOfLines={1} ellipsizeMode="middle">{item.signature}</Text>
      <Text style={styles.explorerLink}>View in Explorer →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Transaction History</Text>
        <TouchableOpacity onPress={clearHistory}><Text style={styles.clearText}>Clear</Text></TouchableOpacity>
      </View>
      {loading && history.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.signature}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  clearText: { color: '#ff3b30', fontSize: 14 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  status: { fontWeight: 'bold', fontSize: 14 },
  date: { fontSize: 12, color: '#8e8e93' },
  signature: { fontSize: 14, color: '#3a3a3c', fontFamily: 'monospace', marginBottom: 8 },
  explorerLink: { fontSize: 12, color: '#007AFF', fontWeight: '600', textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 50, color: '#8e8e93' }
});
