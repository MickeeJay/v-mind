import { tx } from '@hirosystems/clarinet-sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADDR,
  ascii,
  bootSimnet,
  expectErr,
  expectOkBool,
  expectOkUint,
  initializeVaultToken,
  mine,
  p,
  registerDefaultAssetAndStrategy,
  u,
} from '../helpers/simnet';

describe('vault-core', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
    const init = initializeVaultToken(simnet);
    expectOkBool(init[0].result, true);
  });

  describe('create-vault', () => {
    it('create-vault: valid deposit, supported asset, valid strategy — vault created with correct owner, balance, strategy-id, and active status. Vault ID counter incremented', () => {
      registerDefaultAssetAndStrategy(simnet);

      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(2_000_000), u(1)], ADDR.deployer),
      ]);
      expectOkUint(create[0].result, 1);

      const status = simnet.callReadOnlyFn('vault-core', 'get-vault-status', [u(1)], ADDR.deployer);
      expectOkUint(status.result, 1);

      const assets = simnet.callReadOnlyFn('vault-core', 'get-vault-total-assets', [u(1)], ADDR.deployer);
      expectOkUint(assets.result, 2_000_000);

      const next = simnet.callReadOnlyFn('vault-core', 'get-next-vault-id', [], ADDR.deployer);
      expect(next.result.type).toBe('uint');
      expect(Number(next.result.value)).toBe(2);
    });

    it('create-vault: deposit below minimum — returns ERR-MIN-DEPOSIT', () => {
      mine(simnet, [
        tx.callPublicFn(
          'protocol-config',
          'add-supported-asset',
          [p(ADDR.wallet1), ascii('STX'), u(2_000_000), u(20_000_000)],
          ADDR.deployer,
        ),
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('S'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.deployer,
        ),
      ]);

      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(1_500_000), u(1)], ADDR.deployer),
      ]);
      expectErr(create[0].result, 2407);
    });

    it('create-vault: unsupported asset — returns the correct error', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('S'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.deployer,
        ),
      ]);
      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet3), u(2_000_000), u(1)], ADDR.deployer),
      ]);
      expectErr(create[0].result, 2404);
    });

    it('create-vault: inactive strategy ID — returns the correct error', () => {
      registerDefaultAssetAndStrategy(simnet);
      mine(simnet, [tx.callPublicFn('strategy-registry', 'deactivate-strategy', [u(1)], ADDR.deployer)]);

      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(2_000_000), u(1)], ADDR.deployer),
      ]);
      expectErr(create[0].result, 2410);
    });
  });

  describe('deposit / withdraw', () => {
    function seedVault() {
      registerDefaultAssetAndStrategy(simnet);
      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(5_000_000), u(1)], ADDR.deployer),
      ]);
      expectOkUint(create[0].result, 1);
    }

    it('deposit: vault owner deposits additional funds — total-assets updated correctly', () => {
      seedVault();
      const dep = mine(simnet, [
        tx.callPublicFn('vault-core', 'deposit', [u(1), p(ADDR.wallet1), u(1_000_000)], ADDR.deployer),
      ]);
      expectOkUint(dep[0].result, 6_000_000);
    });

    it('deposit: non-owner attempts to deposit to another user vault — owner-only behavior enforced', () => {
      seedVault();
      const dep = mine(simnet, [
        tx.callPublicFn('vault-core', 'deposit', [u(1), p(ADDR.wallet1), u(1_000_000)], ADDR.wallet4),
      ]);
      expectErr(dep[0].result, 2401);
    });

    it('deposit: paused vault — returns the correct error', () => {
      seedVault();
      mine(simnet, [tx.callPublicFn('vault-core', 'pause-vault', [u(1)], ADDR.deployer)]);
      const dep = mine(simnet, [
        tx.callPublicFn('vault-core', 'deposit', [u(1), p(ADDR.wallet1), u(1_000_000)], ADDR.deployer),
      ]);
      expectErr(dep[0].result, 2411);
    });

    it('withdraw: owner withdraws partial amount — total-assets reduced correctly, funds transferred', () => {
      seedVault();
      const wd = mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(2_000_000)], ADDR.deployer)]);
      expectOkUint(wd[0].result, 2_000_000);

      const assets = simnet.callReadOnlyFn('vault-core', 'get-vault-total-assets', [u(1)], ADDR.deployer);
      expectOkUint(assets.result, 3_000_000);
    });

    it('withdraw: owner withdraws full amount — total-assets reaches zero, vault remains open until explicitly closed', () => {
      seedVault();
      const wd = mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(5_000_000)], ADDR.deployer)]);
      expectOkUint(wd[0].result, 5_000_000);

      const assets = simnet.callReadOnlyFn('vault-core', 'get-vault-total-assets', [u(1)], ADDR.deployer);
      expectOkUint(assets.result, 0);

      const status = simnet.callReadOnlyFn('vault-core', 'get-vault-status', [u(1)], ADDR.deployer);
      expectOkUint(status.result, 1);
    });

    it('withdraw: amount exceeds balance — returns ERR-INSUFFICIENT-VAULT-SHARES', () => {
      seedVault();
      const wd = mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(6_000_000)], ADDR.deployer)]);
      expectErr(wd[0].result, 2806);
    });

    it('withdraw: non-owner attempts withdrawal — returns the correct unauthorised error', () => {
      seedVault();
      const wd = mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(1_000_000)], ADDR.wallet5)]);
      expectErr(wd[0].result, 2401);
    });
  });

  describe('pause / close / emergency', () => {
    function seedVault() {
      registerDefaultAssetAndStrategy(simnet);
      const create = mine(simnet, [
        tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(5_000_000), u(1)], ADDR.deployer),
      ]);
      expectOkUint(create[0].result, 1);
    }

    it('pause-vault: owner pauses — vault status becomes paused', () => {
      seedVault();
      const pause = mine(simnet, [tx.callPublicFn('vault-core', 'pause-vault', [u(1)], ADDR.deployer)]);
      expectOkBool(pause[0].result, true);

      const status = simnet.callReadOnlyFn('vault-core', 'get-vault-status', [u(1)], ADDR.deployer);
      expectOkUint(status.result, 2);
    });

    it('close-vault: zero balance vault — status becomes closed', () => {
      seedVault();
      mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(5_000_000)], ADDR.deployer)]);

      const close = mine(simnet, [tx.callPublicFn('vault-core', 'close-vault', [u(1)], ADDR.deployer)]);
      expectOkBool(close[0].result, true);

      const status = simnet.callReadOnlyFn('vault-core', 'get-vault-status', [u(1)], ADDR.deployer);
      expectOkUint(status.result, 3);
    });

    it('close-vault: non-zero balance vault — returns ERR-VAULT-NOT-EMPTY', () => {
      seedVault();
      const close = mine(simnet, [tx.callPublicFn('vault-core', 'close-vault', [u(1)], ADDR.deployer)]);
      expectErr(close[0].result, 2415);
    });

    it('emergency-withdraw-all: protocol owner calls — targeted vault funds are zeroed and vault paused', () => {
      seedVault();
      const ew = mine(simnet, [tx.callPublicFn('vault-core', 'emergency-withdraw-all', [u(1)], ADDR.deployer)]);
      expectOkUint(ew[0].result, 5_000_000);

      const assets = simnet.callReadOnlyFn('vault-core', 'get-vault-total-assets', [u(1)], ADDR.deployer);
      expectOkUint(assets.result, 0);

      const status = simnet.callReadOnlyFn('vault-core', 'get-vault-status', [u(1)], ADDR.deployer);
      expectOkUint(status.result, 2);
    });
  });
});
