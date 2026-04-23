import * as SecureStore from 'expo-secure-store';

const MNEMONIC_KEY = 'solaever_mnemonic';

export async function saveMnemonic(mnemonic: string) {
  await SecureStore.setItemAsync(MNEMONIC_KEY, mnemonic);
}

export async function loadMnemonic(): Promise<string | null> {
  return await SecureStore.getItemAsync(MNEMONIC_KEY);
}

export async function deleteMnemonic() {
  await SecureStore.deleteItemAsync(MNEMONIC_KEY);
}
