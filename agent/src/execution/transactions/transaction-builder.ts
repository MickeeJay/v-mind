import {
  AnchorMode,
  PostConditionMode,
  createStacksPrivateKey,
  getPublicKey,
  makeUnsignedContractCall,
  publicKeyToString,
} from '@stacks/transactions';

import type { BuildUnsignedTransactionRequest, UnsignedContractCallTransaction } from './types';
import type { AppLogger } from '../../utils/logger';
import type { StacksNetwork } from '@stacks/network';

export class TransactionBuilder {
  constructor(
    private readonly network: StacksNetwork,
    private readonly logger: AppLogger,
    private readonly defaultSenderKey?: string
  ) {}

  async buildUnsignedContractCall(request: BuildUnsignedTransactionRequest): Promise<UnsignedContractCallTransaction> {
    const senderKey = request.senderKey ?? this.defaultSenderKey;
    if (!senderKey) {
      throw new Error('Missing sender key: provide senderKey or configure STACKS_PRIVATE_KEY');
    }

    const { contractAddress, contractName } = parseContractPrincipal(request.contractPrincipal);
    const publicKey = publicKeyToString(getPublicKey(createStacksPrivateKey(senderKey)));

    const transaction = await makeUnsignedContractCall({
      publicKey,
      contractAddress,
      contractName,
      functionName: request.functionName,
      functionArgs: request.functionArgs,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      network: this.network,
      fee: request.fee ?? 0,
      nonce: request.nonce ?? 0,
    });

    this.logger.debug(
      {
        contractAddress,
        contractName,
        functionName: request.functionName,
      },
      'Constructed unsigned contract call transaction'
    );

    return {
      transaction,
      contractAddress,
      contractName,
      functionName: request.functionName,
      functionArgs: request.functionArgs,
      senderKey,
    };
  }
}

function parseContractPrincipal(contractPrincipal: string): { contractAddress: string; contractName: string } {
  const [contractAddress, contractName] = contractPrincipal.split('.');
  if (!contractAddress || !contractName) {
    throw new Error('Contract principal must be in <address>.<contract-name> format');
  }

  return { contractAddress, contractName };
}
