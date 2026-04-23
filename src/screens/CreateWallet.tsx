import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { generateMnemonic } from '../lib/wallet';
import { saveMnemonic } from '../lib/keystore';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  RestoreWallet: undefined;
  Home: { mnemonic: string };
};

type CreateWalletScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateWallet'>;

interface Props {
  navigation: CreateWalletScreenNavigationProp;
}

export default function CreateWallet({ navigation }: Props) {
  const [mnemonic, setMnemonic] = useState('');

  useEffect(() => {
    setMnemonic(generateMnemonic());
  }, []);

  const handleComplete = async () => {
    try {
      await saveMnemonic(mnemonic);
      navigation.replace('Home', { mnemonic });
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallet securely.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create New Wallet</Text>
      <Text style={styles.description}>
        Below is your recovery phrase. Write it down on paper and keep it safe. 
        It is the ONLY way to recover your wallet if you lose your phone.
      </Text>
      
      <View style={styles.mnemonicContainer}>
        {mnemonic.split(' ').map((word, index) => (
          <View key={index} style={styles.wordBox}>
            <Text style={styles.wordNumber}>{index + 1}</Text>
            <Text style={styles.wordText}>{word}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleComplete}
      >
        <Text style={styles.buttonText}>I have saved the phrase</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
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
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  wordBox: {
    width: '30%',
    margin: '1.5%',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  wordNumber: {
    fontSize: 10,
    color: '#adb5bd',
  },
  wordText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
