import type { StacksNetwork } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  type StacksTransaction,
} from '@stacks/transactions';
import type { AppLogger } from '../../utils/logger';
import type { SignTransactionRequest } from './types';

export class TransactionSigner {
  constructor(
    private readonly network: StacksNetwork,
    private readonly logger: AppLogger,
    private readonly defaultSenderKey?: string
  ) {}

  async sign(request: SignTransactionRequest): Promise<StacksTransaction> {
    const senderKey = request.senderKey ?? request.unsigned.senderKey ?? this.defaultSenderKey;
    if (!senderKey) {
      throw new Error('Missing sender key: provide senderKey or configure STACKS_PRIVATE_KEY');
    }

    const signed = await makeContractCall({
      senderKey,
      contractAddress: request.unsigned.contractAddress,
      contractName: request.unsigned.contractName,
      functionName: request.unsigned.functionName,
      functionArgs: request.unsigned.functionArgs,
      fee: request.feeMicroStx,
      nonce: request.nonce,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      network: this.network,
    });

    this.logger.debug(
      {
        contractAddress: request.unsigned.contractAddress,
        contractName: request.unsigned.contractName,
        functionName: request.unsigned.functionName,
        feeMicroStx: request.feeMicroStx.toString(),
        nonce: request.nonce.toString(),
      },
      'Signed transaction for contract execution'
    );

    return signed;
  }
}
