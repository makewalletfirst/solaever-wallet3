import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
  TOKEN_PROGRAM_ID
} from '@solana/web3.js';
import { connection, RPC_ENDPOINT } from './connection';

export async function sendSLE(
  sender: Keypair,
  toAddress: string,
  amount: number
): Promise<string> {
  try {
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');

    const transaction = new Transaction({
      feePayer: sender.publicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey,
        lamports,
      })
    );

    const signature = await connection.sendTransaction(transaction, [sender], {
      skipPreflight: true,
      preflightCommitment: 'processed',
    });

    return signature;
  } catch (error: any) {
    throw error;
  }
}

export async function getBalance(address: string): Promise<number> {
  try {
    const response = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address, { commitment: 'processed' }]
      }),
    });
    const json = await response.json();
    return json.result.value / LAMPORTS_PER_SOL;
  } catch (error: any) {
    throw new Error(`${error.message}`);
  }
}

// 통합 트랜잭션 내역 조회 (SLE + 모든 SPL 토큰)
export async function getTransactionHistory(address: string) {
  try {
    const owner = new PublicKey(address);
    
    // 1. 모든 토큰 계정(ATA) 가져오기
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    // 2. 메인 주소 + 모든 ATA 주소 리스트 생성
    const allAddresses = [address, ...tokenAccounts.value.map(ta => ta.pubkey.toBase58())];

    // 3. 각 주소별로 시그니처 조회 (병렬 처리)
    const allSignaturesPromises = allAddresses.map(addr => 
      connection.getSignaturesForAddress(new PublicKey(addr), { limit: 10 }, 'processed')
    );
    
    const results = await Promise.all(allSignaturesPromises);
    
    // 4. 모든 결과를 하나로 합치고 중복 제거 및 시간순 정렬
    const merged = results.flat();
    const unique = Array.from(new Map(merged.map(item => [item.signature, item])).values());
    
    return unique.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0)).slice(0, 20);
  } catch (error: any) {
    console.error("Integrated History fetch failed:", error);
    return [];
  }
}
