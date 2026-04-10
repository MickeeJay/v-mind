import { initSimnet } from '@hirosystems/clarinet-sdk';
import { describe, expect, it } from 'vitest';

describe('clarinet-sdk smoke', () => {
  it('boots simnet and reads access-control owner', async () => {
    const simnet = await initSimnet('./Clarinet.toml');
    const accounts = simnet.getAccounts();

    const deployer = accounts.get('deployer');
    expect(deployer).toBeDefined();

    const ownerResponse = simnet.callReadOnlyFn('access-control', 'get-owner', [], deployer!);
    expect(ownerResponse.result).toBeDefined();
  });
});
