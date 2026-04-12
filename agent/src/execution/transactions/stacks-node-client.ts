import type { StacksNetwork } from '@stacks/network';
import {
	broadcastTransaction,
	estimateTransactionByteLength,
	serializePayload,
	type StacksTransaction,
	type TxBroadcastResult,
} from '@stacks/transactions';
import { z } from 'zod';
import { HttpRequestError, withRetry } from '../../blockchain/retry';
import type { AgentConfig } from '../../config';
import type { AppLogger } from '../../utils/logger';
import type {
	BroadcastResult,
	OnChainNonceState,
	TransactionStatus,
	TxStatus,
} from './types';

export interface TransactionNodeClient {
	getAddressNonces(address: string): Promise<OnChainNonceState>;
	estimateContractCallFee(transaction: StacksTransaction): Promise<bigint>;
	broadcastSignedTransaction(transaction: StacksTransaction): Promise<BroadcastResult>;
	getTransactionStatus(txId: string): Promise<TransactionStatus>;
	getCurrentBlockHeight(): Promise<number>;
}

const nonceResponseSchema = z.object({
	nonce: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).optional(),
	possible_next_nonce: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).optional(),
});

const accountResponseSchema = z.object({
	nonce: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
});

const feeEstimationArraySchema = z.array(
	z.object({
		fee: z.number().int().nonnegative(),
		fee_rate: z.number().nonnegative(),
	})
);

const feeEstimationObjectSchema = z.object({
	estimations: feeEstimationArraySchema,
});

const coreInfoSchema = z.object({
	stacks_tip_height: z.number().int().nonnegative(),
});

const txStatusResponseSchema = z.object({
	tx_id: z.string().optional(),
	tx_status: z.string(),
	tx_result: z
		.object({
			repr: z.string().optional(),
		})
		.optional(),
	block_height: z.number().int().nonnegative().nullable().optional(),
	burn_block_height: z.number().int().nonnegative().nullable().optional(),
});

export class HttpTransactionNodeClient implements TransactionNodeClient {
	constructor(
		private readonly config: Pick<AgentConfig, 'stacks' | 'retry'>,
		private readonly network: StacksNetwork,
		private readonly logger: AppLogger
	) {}

	async getAddressNonces(address: string): Promise<OnChainNonceState> {
		const extendedUrl = this.joinUrl(this.config.stacks.apiBaseUrl, `/extended/v1/address/${address}/nonces`);

		try {
			const extendedResponse = await withRetry(
				() => this.fetchJson(extendedUrl, { method: 'GET', headers: this.getRequestHeaders() }, nonceResponseSchema),
				this.config.retry,
				this.logger,
				'node.getAddressNonces.extended'
			);

			const nonce = asBigInt(extendedResponse.nonce ?? 0);
			const possibleNextNonce = asBigInt(extendedResponse.possible_next_nonce ?? extendedResponse.nonce ?? 0);
			return { nonce, possibleNextNonce };
		} catch (error) {
			this.logger.warn(
				{
					address,
					message: error instanceof Error ? error.message : String(error),
				},
				'Falling back to core account nonce endpoint'
			);
		}

		const account = await withRetry(
			() =>
				this.fetchJson(
					this.joinUrl(this.config.stacks.nodeRpcUrl, `/v2/accounts/${address}?proof=0`),
					{ method: 'GET', headers: this.getRequestHeaders() },
					accountResponseSchema
				),
			this.config.retry,
			this.logger,
			'node.getAddressNonces.account'
		);

		const nonce = asBigInt(account.nonce);
		return {
			nonce,
			possibleNextNonce: nonce,
		};
	}

	async estimateContractCallFee(transaction: StacksTransaction): Promise<bigint> {
		const estimatedLength = estimateTransactionByteLength(transaction);
		const transactionPayload = `0x${Buffer.from(serializePayload(transaction.payload)).toString('hex')}`;

		const response = await withRetry(
			() =>
				this.fetchJson(
					this.joinUrl(this.config.stacks.nodeRpcUrl, '/v2/fees/transaction'),
					{
						method: 'POST',
						headers: this.getRequestHeaders({
							'Content-Type': 'application/json',
						}),
						body: JSON.stringify({
							estimated_len: estimatedLength,
							transaction_payload: transactionPayload,
						}),
					},
					z.union([feeEstimationArraySchema, feeEstimationObjectSchema])
				),
			this.config.retry,
			this.logger,
			'node.estimateContractCallFee'
		);

		const estimations = Array.isArray(response) ? response : response.estimations;
		if (estimations.length === 0) {
			throw new Error('Stacks node returned no fee estimations');
		}

		const [firstEstimation, ...restEstimations] = estimations;
		const highestFee = restEstimations.reduce(
			(maxFee, current) => Math.max(maxFee, current.fee),
			firstEstimation!.fee
		);
		return BigInt(highestFee);
	}

	async broadcastSignedTransaction(transaction: StacksTransaction): Promise<BroadcastResult> {
		const response = await withRetry(
			() => broadcastTransaction(transaction, this.network),
			this.config.retry,
			this.logger,
			'node.broadcastSignedTransaction'
		);

		if (isRejectedBroadcast(response)) {
			return {
				accepted: false,
				txId: response.txid,
				reason: response.reason,
				retryable: isRetryableRejectionReason(response.reason),
			};
		}

		return {
			accepted: true,
			txId: response.txid,
		};
	}

	async getTransactionStatus(txId: string): Promise<TransactionStatus> {
		const response = await withRetry(
			() =>
				this.fetchJson(
					this.joinUrl(this.config.stacks.apiBaseUrl, `/extended/v1/tx/${txId}`),
					{
						method: 'GET',
						headers: this.getRequestHeaders(),
					},
					txStatusResponseSchema
				),
			this.config.retry,
			this.logger,
			`node.getTransactionStatus.${txId}`
		);

		const status = normalizeTxStatus(response.tx_status);
		return {
			txId,
			status,
			blockHeight: response.block_height ?? undefined,
			burnBlockHeight: response.burn_block_height ?? undefined,
			reason: response.tx_result?.repr,
			retryable: isRetryableTxStatus(status),
		};
	}

	async getCurrentBlockHeight(): Promise<number> {
		const response = await withRetry(
			() =>
				this.fetchJson(
					this.joinUrl(this.config.stacks.nodeRpcUrl, '/v2/info'),
					{
						method: 'GET',
						headers: this.getRequestHeaders(),
					},
					coreInfoSchema
				),
			this.config.retry,
			this.logger,
			'node.getCurrentBlockHeight'
		);

		return response.stacks_tip_height;
	}

	private async fetchJson<T>(url: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
		this.logger.debug(
			{
				method: init.method ?? 'GET',
				url,
			},
			'Outbound transaction request'
		);

		const response = await fetch(url, init);
		if (!response.ok) {
			const responseBody = await safeJson(response);
			if (response.status >= 500) {
				throw new HttpRequestError(`Request to ${url} failed with ${response.status}`, response.status, responseBody);
			}

			throw new Error(`Request to ${url} failed with ${response.status}`);
		}

		const body = await safeJson(response);
		return schema.parse(body);
	}

	private getRequestHeaders(overrides: Record<string, string> = {}): Record<string, string> {
		return {
			...(this.config.stacks.hiroApiKey ? { 'x-api-key': this.config.stacks.hiroApiKey } : {}),
			...overrides,
		};
	}

	private joinUrl(baseUrl: string, path: string): string {
		return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
	}
}

function isRejectedBroadcast(response: TxBroadcastResult): response is Extract<TxBroadcastResult, { error: string }> {
	return typeof (response as { error?: string }).error === 'string';
}

function isRetryableRejectionReason(reason: string): boolean {
	const normalizedReason = reason.toLowerCase();
	return (
		normalizedReason.includes('feetoolow') ||
		normalizedReason.includes('toomuchchaining') ||
		normalizedReason.includes('temporarilyblacklisted') ||
		normalizedReason.includes('serverfailure') ||
		normalizedReason.includes('conflictingnonceinmempool')
	);
}

function normalizeTxStatus(status: string): TxStatus {
	switch (status) {
		case 'pending':
		case 'success':
		case 'abort_by_response':
		case 'abort_by_post_condition':
		case 'dropped_replace_by_fee':
		case 'dropped_replace_across_fork':
		case 'dropped_too_expensive':
		case 'dropped_stale_garbage_collect':
			return status;
		default:
			return 'unknown';
	}
}

function isRetryableTxStatus(status: TxStatus): boolean {
	switch (status) {
		case 'dropped_replace_by_fee':
		case 'dropped_replace_across_fork':
		case 'dropped_too_expensive':
		case 'dropped_stale_garbage_collect':
			return true;
		default:
			return false;
	}
}

function asBigInt(value: string | number): bigint {
	return BigInt(value);
}

async function safeJson(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) {
		return {};
	}

	return JSON.parse(text) as unknown;
}