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
  
  // 1. 민트 정보 및 계정 확보를 동시에 진행하거나 최소한의 commitment 사용
  const mintInfo = await getMint(connection, mint, 'processed');
  const rawAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));

  // 2. ATA 확보 (이미 있으면 매우 빠름)
  const fromAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, sender.publicKey, { commitment: 'processed' });
  const toAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, toPubkey, { commitment: 'processed' });

  // 3. 트랜잭션 전송 (최적화)
  const { blockhash } = await connection.getLatestBlockhash('processed');
  const transaction = new Transaction({
    feePayer: sender.publicKey,
    recentBlockhash: blockhash,
  }).add(
    createTransferInstruction(fromAta.address, toAta.address, sender.publicKey, rawAmount)
  );

  const signature = await connection.sendTransaction(transaction, [sender], { 
    skipPreflight: true, // 사전 검사를 건너뛰어 속도 향상
    preflightCommitment: 'processed' 
  });

  // 4. 수동 고속 체크
  for (let i = 0; i < 15; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (status.value?.confirmationStatus === 'processed' || status.value?.confirmationStatus === 'confirmed') {
      return signature;
    }
    await new Promise(r => setTimeout(r, 1000)); // 1초 간격으로 확인
  }

  return signature;
}
