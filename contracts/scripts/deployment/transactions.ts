import { StacksNetwork } from '@stacks/network';
import {
  AnchorMode,
  ClarityValue,
  PostConditionMode,
  broadcastTransaction,
  makeContractCall,
  makeContractDeploy,
} from '@stacks/transactions';

import { normalizeNodeUrl } from './network';

interface BroadcastResult {
  txid: string;
}

interface TxStatusResponse {
  tx_status: string;
  block_height?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function parseBroadcastResponse(response: unknown): BroadcastResult {
  if (typeof response === 'string' && response.length > 0) {
    return { txid: response };
  }

  const candidate = response as { txid?: string; error?: string; reason?: string };

  if (candidate?.txid) {
    return { txid: candidate.txid };
  }

  throw new Error(
    `Transaction broadcast failed: ${candidate?.error ?? 'unknown error'}${
      candidate?.reason ? ` (${candidate.reason})` : ''
    }`,
  );
}

export async function deployContractTx(
  network: StacksNetwork,
  senderKey: string,
  contractName: string,
  codeBody: string,
): Promise<string> {
  const tx = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  });

  const response = await broadcastTransaction(tx, network);
  return parseBroadcastResponse(response).txid;
}

export async function callPublicFnTx(
  network: StacksNetwork,
  senderKey: string,
  contractAddress: string,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
): Promise<string> {
  const tx = await makeContractCall({
    senderKey,
    network,
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  });

  const response = await broadcastTransaction(tx, network);
  return parseBroadcastResponse(response).txid;
}

export async function fetchTxStatus(nodeUrl: string, txid: string): Promise<TxStatusResponse> {
  const response = await fetch(`${normalizeNodeUrl(nodeUrl)}/extended/v1/tx/${txid}`);
  if (!response.ok) {
    throw new Error(`Could not fetch tx status for ${txid}: HTTP ${response.status}`);
  }

  return (await response.json()) as TxStatusResponse;
}

export async function waitForTxSuccess(
  nodeUrl: string,
  txid: string,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<number> {
  const startedAt = Date.now();

  for (;;) {
    const status = await fetchTxStatus(nodeUrl, txid);

    if (status.tx_status === 'success') {
      return status.block_height ?? 0;
    }

    if (
      status.tx_status === 'abort_by_response' ||
      status.tx_status === 'abort_by_post_condition' ||
      status.tx_status.startsWith('dropped')
    ) {
      throw new Error(`Transaction ${txid} failed with status ${status.tx_status}`);
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`Timeout waiting for transaction ${txid} confirmation.`);
    }

    await sleep(pollIntervalMs);
  }
}
