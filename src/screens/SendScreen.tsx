import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { keypairFromMnemonic } from '../lib/wallet';
import { sendSLE } from '../lib/transfer';

type RootStackParamList = {
  Home: { mnemonic: string };
  Send: { mnemonic: string };
};

type SendScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Send'>;
type SendScreenRouteProp = RouteProp<RootStackParamList, 'Send'>;

interface Props {
  navigation: SendScreenNavigationProp;
  route: SendScreenRouteProp;
}

export default function SendScreen({ navigation, route }: Props) {
  const { mnemonic } = route.params;
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!toAddress || !amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    setLoading(true);
    try {
      const senderKeypair = await keypairFromMnemonic(mnemonic);
      const signature = await sendSLE(senderKeypair, toAddress, numAmount);
      
      Alert.alert(
        '전송 성공', 
        `트랜잭션이 성공적으로 전송되었습니다!\n\n서명: ${signature.slice(0, 15)}...`,
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error(error);
      let errorMsg = error.message || '알 수 없는 오류가 발생했습니다.';
      
      // 사용자 친화적 메시지 변환
      if (errorMsg.includes('insufficient funds') || errorMsg.includes('0x1')) {
        errorMsg = '잔고가 부족합니다. 수수료를 제외한 금액을 입력해 주세요.';
      } else if (errorMsg.includes('block height exceeded') || errorMsg.includes('expired')) {
        errorMsg = '네트워크 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
      }
      
      Alert.alert('전송 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send SLE</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recipient Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Solana Address"
          value={toAddress}
          onChangeText={setToAddress}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount (SLE)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send SLE</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#a2a2a2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#8e8e93',
    fontSize: 16,
  },
});
