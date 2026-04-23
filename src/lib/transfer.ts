import {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';
import { connection, RPC_ENDPOINT } from './connection';

export async function sendSLE(
  sender: Keypair,
  toAddress: string,
  amount: number
): Promise<string> {
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [sender]
  );

  return signature;
}

export async function getBalance(address: string): Promise<number> {
  try {
    // 1. fetch 옵션 강화 (User-Agent 등 추가)
    const response = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address]
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.error) {
      throw new Error(`RPC Error: ${json.error.message}`);
    }
    
    return json.result.value / LAMPORTS_PER_SOL;
  } catch (error: any) {
    console.error("Balance fetch failed:", error);
    // 2. 에러 발생 시 더 구체적인 정보 전달
    throw new Error(`${error.message} (URL: ${RPC_ENDPOINT})`);
  }
}
