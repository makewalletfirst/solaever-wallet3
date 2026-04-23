import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { keypairFromMnemonic } from '../lib/wallet';
import { sendSLE } from '../lib/transfer';
import { sendSPLToken } from '../lib/token';

export default function SendScreen({ navigation, route }: any) {
  const { mnemonic, tokenList } = route.params;
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('SLE'); // 'SLE' 또는 민트 주소

  const handleSend = async () => {
    if (!toAddress || !amount) {
      Alert.alert('에러', '모든 필드를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const senderKeypair = await keypairFromMnemonic(mnemonic);
      let signature = '';

      if (selectedAsset === 'SLE') {
        signature = await sendSLE(senderKeypair, toAddress, parseFloat(amount));
      } else {
        signature = await sendSPLToken(senderKeypair, selectedAsset, toAddress, parseFloat(amount));
      }
      
      Alert.alert('전송 성공', `트랜잭션이 완료되었습니다!\n\n서명: ${signature.slice(0, 15)}...`, [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('전송 실패', error.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Send Assets</Text>
      
      <Text style={styles.label}>Select Asset</Text>
      <View style={styles.assetSelector}>
        <TouchableOpacity 
          style={[styles.assetOption, selectedAsset === 'SLE' && styles.selectedAsset]} 
          onPress={() => setSelectedAsset('SLE')}
        >
          <Text style={selectedAsset === 'SLE' ? styles.selectedText : {}}>SLE (Native)</Text>
        </TouchableOpacity>
        {tokenList.map((mint: string) => (
          <TouchableOpacity 
            key={mint}
            style={[styles.assetOption, selectedAsset === mint && styles.selectedAsset]} 
            onPress={() => setSelectedAsset(mint)}
          >
            <Text style={selectedAsset === mint ? styles.selectedText : {}} numberOfLines={1}>
              {mint.slice(0, 6)}... (SPL)
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recipient Address</Text>
        <TextInput style={styles.input} placeholder="Recipient Solana Address" value={toAddress} onChangeText={setToAddress} autoCapitalize="none" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount</Text>
        <TextInput style={styles.input} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      </View>

      <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleSend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Now</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={loading}>
        <Text>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 40, marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  assetSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  assetOption: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 10, marginBottom: 10 },
  selectedAsset: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  selectedText: { color: '#fff', fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
  button: { backgroundColor: '#007AFF', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  disabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { alignItems: 'center', marginTop: 20 }
});
