import { tx } from '@hirosystems/clarinet-sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADDR,
  adapterTraits,
  ascii,
  bootSimnet,
  expectErr,
  expectOk,
  expectOkBool,
  expectOkUint,
  initializeVaultToken,
  mine,
  p,
  u,
} from '../helpers/simnet';

describe('strategy-execution', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
    const init = initializeVaultToken(simnet);
    expectOkBool(init[0].result, true);
  });

  function setupBase(strategyName = 'Execution Strategy') {
    const setup = mine(simnet, [
      tx.callPublicFn('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [u(1)], ADDR.deployer),
      tx.callPublicFn('protocol-config', 'set-protocol-performance-fee-bps', [u(1000)], ADDR.deployer),
      tx.callPublicFn(
        'protocol-config',
        'add-supported-asset',
        [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(30_000_000)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'strategy-registry',
        'register-strategy',
        [ascii(strategyName), u(1), p(ADDR.wallet1), u(1), p(ADDR.deployer)],
        ADDR.deployer,
      ),
      tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(8_000_000), u(1)], ADDR.deployer),
    ]);

    expectOkUint(setup[0].result, 1);
    expectOkUint(setup[1].result, 1000);
    expectOkUint(setup[3].result, 1);
    expectOkUint(setup[4].result, 1);
  }

  function getPositionAllocated(vaultId: number, protocolId: number): number {
    const position = simnet.callReadOnlyFn('strategy-execution', 'get-vault-position', [u(vaultId), u(protocolId)], ADDR.deployer);
    expect(position.result.type).toBe('some');
    expect(position.result.value.type).toBe('tuple');
    return Number(position.result.value.value['allocated-assets'].value);
  }

  it('execute-strategy: successful execution updates position and fee tracking', () => {
    setupBase();

    const exec = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(1_000_000), u(200_000), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOk(exec[0].result);

    expect(getPositionAllocated(1, 1)).toBe(1_180_000);

    const fees = simnet.callReadOnlyFn('strategy-execution', 'get-vault-fees-collected', [u(1)], ADDR.deployer);
    expectOkUint(fees.result, 20_000);

    const mockFees = simnet.callReadOnlyFn('mock-defi-integrations', 'get-total-fees-collected', [], ADDR.deployer);
    expectOkUint(mockFees.result, 20_000);
  });

  it('execute-strategy: cooldown is enforced until required blocks elapse', () => {
    setupBase();

    const tightenCooldown = mine(simnet, [
      tx.callPublicFn('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [u(2)], ADDR.deployer),
    ]);
    expectOkUint(tightenCooldown[0].result, 2);

    const first = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(500_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOk(first[0].result);

    const second = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(500_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectErr(second[0].result, 2606);

    simnet.mineBlock([]);

    const third = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(500_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOk(third[0].result);
  });

  it('execute-strategy: non-executor/non-owner caller is rejected', () => {
    setupBase();

    const unauthorized = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(500_000), u(0), ...adapterTraits()],
        ADDR.wallet5,
      ),
    ]);
    expectErr(unauthorized[0].result, 2600);
  });

  it('execute-strategy: unsupported protocol id is rejected', () => {
    setupBase();

    const invalid = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(99), u(500_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectErr(invalid[0].result, 2608);
  });

  it('execute-strategy: strategy id mismatch against vault strategy is rejected', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('protocol-config', 'set-max-strategy-rebalance-frequency-blocks', [u(1)], ADDR.deployer),
      tx.callPublicFn(
        'protocol-config',
        'add-supported-asset',
        [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(30_000_000)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'strategy-registry',
        'register-strategy',
        [ascii('Primary'), u(1), p(ADDR.wallet1), u(1), p(ADDR.deployer)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'strategy-registry',
        'register-strategy',
        [ascii('Secondary'), u(1), p(ADDR.wallet1), u(1), p(ADDR.deployer)],
        ADDR.deployer,
      ),
      tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(8_000_000), u(1)], ADDR.deployer),
    ]);
    expectOkUint(setup[4].result, 1);

    const mismatch = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(2), u(1), u(500_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectErr(mismatch[0].result, 2604);
  });

  it('rebalance-vault: moves allocation between protocols and preserves total allocation', () => {
    setupBase();

    const seed = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(2_000_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOk(seed[0].result);

    const rebalance = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'rebalance-vault',
        [u(1), u(1), u(1), u(2), u(1_250_000), u(4000), u(6000), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOkBool(rebalance[0].result, true);

    expect(getPositionAllocated(1, 1)).toBe(750_000);
    expect(getPositionAllocated(1, 2)).toBe(1_250_000);

    const total = simnet.callReadOnlyFn('strategy-execution', 'get-total-allocated-assets', [u(1)], ADDR.deployer);
    expectOkUint(total.result, 2_000_000);
  });

  it('rebalance-vault: amount larger than source position is rejected', () => {
    setupBase();

    mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(1_000_000), u(0), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);

    const rebalance = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'rebalance-vault',
        [u(1), u(1), u(1), u(2), u(2_000_000), u(5000), u(5000), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectErr(rebalance[0].result, 2609);
  });

  it('emergency-exit-vault: only owner can call and successful call clears tracked positions', () => {
    setupBase();

    const exec = mine(simnet, [
      tx.callPublicFn(
        'strategy-execution',
        'execute-strategy',
        [u(1), u(1), u(1), u(2_000_000), u(100_000), ...adapterTraits()],
        ADDR.deployer,
      ),
    ]);
    expectOk(exec[0].result);

    const blocked = mine(simnet, [
      tx.callPublicFn('strategy-execution', 'emergency-exit-vault', [u(1), ...adapterTraits()], ADDR.wallet4),
    ]);
    expectErr(blocked[0].result, 2601);

    const exit = mine(simnet, [
      tx.callPublicFn('strategy-execution', 'emergency-exit-vault', [u(1), ...adapterTraits()], ADDR.deployer),
    ]);
    expectOk(exit[0].result);

    expect(getPositionAllocated(1, 1)).toBe(0);
  });
});
