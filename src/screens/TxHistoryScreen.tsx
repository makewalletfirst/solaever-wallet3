import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { getTransactionHistory } from '../lib/transfer';

type RootStackParamList = {
  TxHistory: { address: string };
};

type TxHistoryScreenRouteProp = RouteProp<RootStackParamList, 'TxHistory'>;

interface Props {
  route: TxHistoryScreenRouteProp;
}

export default function TxHistoryScreen({ route }: Props) {
  const { address } = route.params;
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    const data = await getTransactionHistory(address);
    setHistory(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const openExplorer = (signature: string) => {
    const url = `https://solaever.ever-chain.xyz/tx/${signature}`;
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => openExplorer(item.signature)}>
      <View style={styles.itemHeader}>
        <Text style={[styles.status, { color: item.err ? '#ff3b30' : '#34c759' }]}>
          {item.err ? 'Failed' : 'Success'}
        </Text>
        <Text style={styles.date}>
          {item.blockTime ? new Date(item.blockTime * 1000).toLocaleString() : 'Pending'}
        </Text>
      </View>
      <Text style={styles.signature} numberOfLines={1} ellipsizeMode="middle">
        {item.signature}
      </Text>
      <Text style={styles.explorerLink}>View in Explorer →</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.signature}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  status: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  date: {
    fontSize: 12,
    color: '#8e8e93',
  },
  signature: {
    fontSize: 14,
    color: '#3a3a3c',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  explorerLink: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: '#8e8e93',
  },
});
