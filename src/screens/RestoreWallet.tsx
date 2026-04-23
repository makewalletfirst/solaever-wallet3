import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as bip39 from 'bip39';
import { saveMnemonic } from '../lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
};

type RestoreWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RestoreWallet'>;

interface Props {
  navigation: RestoreWalletScreenNavigationProp;
}

export default function RestoreWallet({ navigation }: Props) {
  const [mnemonic, setMnemonic] = useState('');

  const handleRestore = async () => {
    const trimmedMnemonic = mnemonic.trim().toLowerCase();
    
    if (!bip39.validateMnemonic(trimmedMnemonic)) {
      Alert.alert('Invalid Mnemonic', 'Please check the words and try again.');
      return;
    }

    try {
      await saveMnemonic(trimmedMnemonic);
      navigation.replace('Home', { mnemonic: trimmedMnemonic });
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallet securely.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Restore Wallet</Text>
      <Text style={styles.description}>
        Enter your 12-word recovery phrase. Separate words with spaces.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="word1 word2 word3..."
        multiline
        numberOfLines={4}
        onChangeText={setMnemonic}
        value={mnemonic}
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleRestore}
      >
        <Text style={styles.buttonText}>Restore Wallet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    backgroundColor: '#f8f9fa',
    height: 150,
    textAlignVertical: 'top',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
