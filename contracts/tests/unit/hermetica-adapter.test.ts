import { tx } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADDR,
  bootSimnet,
  expectErr,
  expectOk,
  expectOkBool,
  expectOkUint,
  mine,
  u,
} from '../helpers/simnet';

function hermeticaConfig() {
  const staking = Cl.contractPrincipal('SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG', 'staking-v1-1');
  const susdh = Cl.contractPrincipal('SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG', 'susdh-token-v1');
  return [staking, susdh];
}

function hermeticaMock() {
  return Cl.contractPrincipal(ADDR.deployer, 'mock-hermetica-staking');
}

describe('hermetica-adapter', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  it('reads a fresh synced staking rate in non-mock mode', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('hermetica-adapter', 'set-hermetica-config', hermeticaConfig(), ADDR.deployer),
      tx.callPublicFn('hermetica-adapter', 'set-mock-mode', [Cl.bool(false)], ADDR.deployer),
      tx.callPublicFn('hermetica-adapter', 'set-cached-rate', [u(77_000_000)], ADDR.deployer),
      tx.callPublicFn('mock-hermetica-staking', 'set-usdh-per-susdh', [u(131_000_000)], ADDR.deployer),
      tx.callPublicFn('hermetica-adapter', 'sync-hermetica-rate', [hermeticaMock()], ADDR.deployer),
    ]);

    expectOkBool(setup[0].result, true);
    expectOkBool(setup[1].result, true);
    expectOkBool(setup[2].result, true);
    expectOkBool(setup[3].result, true);
    expectOkUint(setup[4].result, 131_000_000);

    const cachedRate = simnet.callReadOnlyFn('hermetica-adapter', 'get-cached-rate', [], ADDR.deployer);
    expectOkUint(cachedRate.result, 131_000_000);

    const updatedBlock = simnet.callReadOnlyFn('hermetica-adapter', 'get-cached-rate-last-updated-block', [], ADDR.deployer);
    expectOk(updatedBlock.result);
    expect(updatedBlock.result.value.type).toBe('uint');
    expect(Number(updatedBlock.result.value.value)).toBeGreaterThan(0);

    const liveRate = simnet.callReadOnlyFn('hermetica-adapter', 'get-usdh-per-susdh-rate', [], ADDR.deployer);
    expectOkUint(liveRate.result, 131_000_000);

  });

  it('fails closed when the configured staking contract is not the live Hermetica principal', () => {
    const setup = mine(simnet, [
      tx.callPublicFn('hermetica-adapter', 'set-hermetica-config', [
        Cl.contractPrincipal(ADDR.deployer, 'missing-hermetica-staking'),
        Cl.contractPrincipal(ADDR.deployer, 'missing-hermetica-susdh'),
      ], ADDR.deployer),
      tx.callPublicFn('hermetica-adapter', 'set-mock-mode', [Cl.bool(false)], ADDR.deployer),
      tx.callPublicFn('hermetica-adapter', 'set-cached-rate', [u(222_000_000)], ADDR.deployer),
    ]);

    expectOkBool(setup[0].result, true);
    expectOkBool(setup[1].result, true);
    expectOkBool(setup[2].result, true);

    const rate = simnet.callReadOnlyFn('hermetica-adapter', 'get-usdh-per-susdh-rate', [], ADDR.deployer);
    expectErr(rate.result, 3709);

    const balance = simnet.callReadOnlyFn('hermetica-adapter', 'get-vault-usdh-balance', [u(11)], ADDR.deployer);
    expectErr(balance.result, 3709);
  });
});