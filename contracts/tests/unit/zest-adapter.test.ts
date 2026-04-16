import { tx } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADDR,
  bootSimnet,
  expectErr,
  expectOkBool,
  expectOkUint,
  mine,
  u,
} from '../helpers/simnet';

function zestConfig(reserveContract: string) {
  const principal = Cl.contractPrincipal(ADDR.deployer, reserveContract);
  return [principal, principal, principal, principal, principal];
}

describe('zest-protocol-adapter', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  it('reads mocked reserve balances proportionally', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('zest-protocol-adapter', 'set-zest-config', zestConfig('mock-zest-protocol'), ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'set-mock-mode', [Cl.bool(true)], ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'deposit-to-zest', [u(10), u(1_000_000)], ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'deposit-to-zest', [u(11), u(500_000)], ADDR.deployer),
      tx.callPublicFn('mock-zest-protocol', 'set-user-underlying', [Cl.contractPrincipal(ADDR.deployer, 'zest-protocol-adapter'), u(3_000_000)], ADDR.deployer),
    ]);

    expectOkBool(setup[0].result, true);
    expectOkBool(setup[1].result, true);
    expectOkUint(setup[2].result, 1_000_000);
    expectOkUint(setup[3].result, 500_000);
    expectOkBool(setup[4].result, true);

    const vaultTen = simnet.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [u(10)], ADDR.deployer);
    const vaultEleven = simnet.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [u(11)], ADDR.deployer);

    expectOkUint(vaultTen.result, 2_000_000);
    expectOkUint(vaultEleven.result, 1_000_000);
  });

  it('fails closed when live reserve reads are unavailable in non-mock mode', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('zest-protocol-adapter', 'set-zest-config', zestConfig('mock-zest-protocol'), ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'set-mock-mode', [Cl.bool(false)], ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'deposit-to-zest', [u(1), u(1_000_000)], ADDR.deployer),
    ]);

    expectOkBool(setup[0].result, true);
    expectOkBool(setup[1].result, true);
    expectOkUint(setup[2].result, 1_000_000);

    const balance = simnet.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [u(1)], ADDR.deployer);
    expectErr(balance.result, 3403);
  });

  it('syncs live reserve balances into the cached production read path', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('zest-protocol-adapter', 'set-zest-config', zestConfig('mock-zest-protocol'), ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'set-mock-mode', [Cl.bool(false)], ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'deposit-to-zest', [u(10), u(1_000_000)], ADDR.deployer),
      tx.callPublicFn('zest-protocol-adapter', 'deposit-to-zest', [u(11), u(500_000)], ADDR.deployer),
      tx.callPublicFn('mock-zest-protocol', 'set-user-underlying', [Cl.contractPrincipal(ADDR.deployer, 'zest-protocol-adapter'), u(3_000_000)], ADDR.deployer),
      tx.callPublicFn(
        'zest-protocol-adapter',
        'sync-live-zest-underlying-balance',
        [Cl.contractPrincipal(ADDR.deployer, 'mock-zest-protocol')],
        ADDR.deployer,
      ),
    ]);

    expectOkBool(setup[0].result, true);
    expectOkBool(setup[1].result, true);
    expectOkUint(setup[2].result, 1_000_000);
    expectOkUint(setup[3].result, 500_000);
    expectOkBool(setup[4].result, true);
    expectOkUint(setup[5].result, 3_000_000);

    const vaultTen = simnet.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [u(10)], ADDR.deployer);
    const vaultEleven = simnet.callReadOnlyFn('zest-protocol-adapter', 'get-vault-zest-underlying-balance', [u(11)], ADDR.deployer);

    expectOkUint(vaultTen.result, 2_000_000);
    expectOkUint(vaultEleven.result, 1_000_000);
  });
});