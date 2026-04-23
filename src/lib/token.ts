import { 
  PublicKey, 
  Transaction, 
  Keypair 
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction, 
  getMint 
} from '@solana/spl-token';
import { connection } from './connection';

const COMMON_TOKENS: Record<string, { symbol: string, name: string }> = {
  "Es9vMFrzaDCSTMdUi9CcZ6SSTm82WWSXn8tWNRU3mgtf": { symbol: "USDT", name: "Tether USD" },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", name: "USD Coin" },
  "So11111111111111111111111111111111111111112": { symbol: "wSOL", name: "Wrapped Solana" }
};

export function getTokenInfo(mint: string) {
  return COMMON_TOKENS[mint] || { symbol: "TOKEN", name: "Unknown Token" };
}

export async function getTokenBalance(mintAddress: string, ownerAddress: string): Promise<number> {
  try {
    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(ownerAddress);
    const response = await connection.getTokenAccountsByOwner(owner, { mint });
    if (response.value.length === 0) return 0;
    const balanceInfo = await connection.getTokenAccountBalance(response.value[0].pubkey, 'processed');
    return balanceInfo.value.uiAmount || 0;
  } catch (error) {
    return 0;
  }
}

export async function sendSPLToken(
  sender: Keypair,
  mintAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const mint = new PublicKey(mintAddress);
  const toPubkey = new PublicKey(toAddress);
  
  const mintInfo = await getMint(connection, mint, 'processed');
  const rawAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));

  // 타입 오류 수정: 5번째 인자는 boolean (allowOwnerOffCurve), 6번째가 commitment입니다.
  const fromAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, sender.publicKey, false, 'processed');
  const toAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, toPubkey, false, 'processed');

  const { blockhash } = await connection.getLatestBlockhash('processed');
  const transaction = new Transaction({
    feePayer: sender.publicKey,
    recentBlockhash: blockhash,
  }).add(
    createTransferInstruction(fromAta.address, toAta.address, sender.publicKey, rawAmount)
  );

  const signature = await connection.sendTransaction(transaction, [sender], { 
    skipPreflight: true,
    preflightCommitment: 'processed' 
  });

  for (let i = 0; i < 15; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (status.value?.confirmationStatus === 'processed' || status.value?.confirmationStatus === 'confirmed') {
      return signature;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  return signature;
}
