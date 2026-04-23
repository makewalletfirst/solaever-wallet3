import * as SecureStore from 'expo-secure-store';

const WALLETS_KEY = 'solaever_wallets_list';
const CURRENT_WALLET_INDEX = 'solaever_current_wallet_idx';

export interface WalletInfo {
  name: string;
  mnemonic: string;
  address: string;
}

export async function saveWallet(wallet: WalletInfo) {
  const wallets = await loadWallets();
  // 중복 체크 (주소 기준)
  const exists = wallets.findIndex(w => w.address === wallet.address);
  if (exists >= 0) {
    wallets[exists] = wallet;
  } else {
    wallets.push(wallet);
  }
  await SecureStore.setItemAsync(WALLETS_KEY, JSON.stringify(wallets));
  // 새로 추가/수정한 지갑을 현재 지갑으로 설정
  await setCurrentWallet(wallet.address);
}

export async function loadWallets(): Promise<WalletInfo[]> {
  const data = await SecureStore.getItemAsync(WALLETS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function deleteWallet(address: string) {
  let wallets = await loadWallets();
  wallets = wallets.filter(w => w.address !== address);
  await SecureStore.setItemAsync(WALLETS_KEY, JSON.stringify(wallets));
  
  const current = await SecureStore.getItemAsync(CURRENT_WALLET_INDEX);
  if (current === address) {
    await SecureStore.deleteItemAsync(CURRENT_WALLET_INDEX);
  }
}

export async function setCurrentWallet(address: string | null) {
  if (address) {
    await SecureStore.setItemAsync(CURRENT_WALLET_INDEX, address);
  } else {
    await SecureStore.deleteItemAsync(CURRENT_WALLET_INDEX);
  }
}

export async function getCurrentWallet(): Promise<WalletInfo | null> {
  const address = await SecureStore.getItemAsync(CURRENT_WALLET_INDEX);
  if (!address) return null;
  const wallets = await loadWallets();
  return wallets.find(w => w.address === address) || null;
}

// 하위 호환성을 위한 기존 함수 유지 (필요시)
export async function loadMnemonic(): Promise<string | null> {
  const current = await getCurrentWallet();
  return current ? current.mnemonic : null;
}
