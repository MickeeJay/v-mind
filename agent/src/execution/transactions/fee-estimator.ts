import type { AppLogger } from '../../utils/logger';
import type { TransactionNodeClient } from './stacks-node-client';
import type { FeeEstimate, UnsignedContractCallTransaction } from './types';

export interface FeeEstimatorOptions {
  nodeClient: TransactionNodeClient;
  feeMultiplier: number;
  minFeeMicroStx?: bigint;
  logger: AppLogger;
}

export class FeeEstimator {
  private readonly feeMultiplier: number;

  constructor(private readonly options: FeeEstimatorOptions) {
    if (!Number.isFinite(options.feeMultiplier) || options.feeMultiplier <= 0) {
      throw new Error('Fee multiplier must be greater than 0');
    }

    this.feeMultiplier = options.feeMultiplier;
  }

  async estimateFee(unsignedTransaction: UnsignedContractCallTransaction): Promise<FeeEstimate> {
    const baseFee = await this.options.nodeClient.estimateContractCallFee(unsignedTransaction.transaction);
    const multipliedFee = applyMultiplier(baseFee, this.feeMultiplier);
    const finalFee = this.options.minFeeMicroStx ? maxBigInt(multipliedFee, this.options.minFeeMicroStx) : multipliedFee;

    this.options.logger.debug(
      {
        contractAddress: unsignedTransaction.contractAddress,
        contractName: unsignedTransaction.contractName,
        functionName: unsignedTransaction.functionName,
        baseFeeMicroStx: baseFee.toString(),
        feeMultiplier: this.feeMultiplier,
        finalFeeMicroStx: finalFee.toString(),
      },
      'Estimated contract call fee'
    );

    return {
      feeMicroStx: finalFee,
      baseFeeMicroStx: baseFee,
      multiplier: this.feeMultiplier,
    };
  }
}

function applyMultiplier(fee: bigint, multiplier: number): bigint {
  const precision = 1_000_000n;
  const scaledMultiplier = BigInt(Math.ceil(multiplier * Number(precision)));
  const numerator = fee * scaledMultiplier;

  return (numerator + precision - 1n) / precision;
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
