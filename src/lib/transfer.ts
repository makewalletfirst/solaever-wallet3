import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
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
    
    // 1. 최신 블록해쉬 가져오기 (가장 빠른 'processed' 기준)
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

    // 2. 잔고 체크
    const balance = await connection.getBalance(sender.publicKey, 'processed');
    if (balance < lamports + 5000) {
      throw new Error(`잔고가 부족합니다. (현재: ${balance / LAMPORTS_PER_SOL} SLE)`);
    }

    // 3. 트랜잭션 전송 (재시도 설정 추가)
    const signature = await connection.sendTransaction(transaction, [sender], {
      skipPreflight: false,
      preflightCommitment: 'processed',
      maxRetries: 5, // RPC 노드가 직접 여러 번 재시도하도록 설정
    });

    // 4. 수동 확인 로직 (앱에서 confirmTransaction이 뻗는 문제 방지)
    let confirmed = false;
    let retries = 0;
    while (!confirmed && retries < 10) {
      const status = await connection.getSignatureStatus(signature);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized' || status.value?.confirmationStatus === 'processed') {
        confirmed = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
      retries++;
    }

    if (!confirmed) {
      // 확인은 안 됐어도 서명이 나왔으면 전송은 된 상태일 수 있음
      console.warn("Confirmation timeout, but signature exists:", signature);
    }

    return signature;
  } catch (error: any) {
    console.error("Send error:", error);
    throw error;
  }
}

export async function getBalance(address: string): Promise<number> {
  try {
    const response = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address, { commitment: 'processed' }]
      }),
    });
    
    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    return json.result.value / LAMPORTS_PER_SOL;
  } catch (error: any) {
    throw new Error(`${error.message}`);
  }
}
