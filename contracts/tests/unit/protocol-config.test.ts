import { tx } from '@hirosystems/clarinet-sdk';
import { describe, it, beforeEach, expect } from 'vitest';
import { ADDR, ascii, b, bootSimnet, expectErr, expectOkBool, expectOkUint, mine, p, u } from '../helpers/simnet';

describe('protocol-config', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  describe('set-performance-fee-rate', () => {
    it('set-performance-fee-rate: owner sets a valid fee rate — stored correctly, version counter incremented', () => {
      const beforeVersion = simnet.callReadOnlyFn('protocol-config', 'get-config-version', [], ADDR.deployer);
      expect(beforeVersion.result.type).toBe('uint');
      expect(Number(beforeVersion.result.value)).toBe(1);

      const receipts = mine(simnet, [
        tx.callPublicFn('protocol-config', 'set-performance-fee-rate-bps', [u(1500)], ADDR.deployer),
      ]);
      expectOkUint(receipts[0].result, 1500);

      const fee = simnet.callReadOnlyFn('protocol-config', 'get-performance-fee-rate-bps', [], ADDR.deployer);
      expect(fee.result.type).toBe('uint');
      expect(Number(fee.result.value)).toBe(1500);

      const afterVersion = simnet.callReadOnlyFn('protocol-config', 'get-config-version', [], ADDR.deployer);
      expect(afterVersion.result.type).toBe('uint');
      expect(Number(afterVersion.result.value)).toBe(2);
    });

    it('set-performance-fee-rate: owner sets fee rate above maximum (2000 basis points) — returns ERR-INVALID-FEE-RATE', () => {
      const receipts = mine(simnet, [
        tx.callPublicFn('protocol-config', 'set-performance-fee-rate-bps', [u(2001)], ADDR.deployer),
      ]);
      expectErr(receipts[0].result, 2101);
    });

    it('set-performance-fee-rate: non-owner attempts to set — returns the correct unauthorised error', () => {
      const receipts = mine(simnet, [
        tx.callPublicFn('protocol-config', 'set-performance-fee-rate-bps', [u(1200)], ADDR.wallet1),
      ]);
      expectErr(receipts[0].result, 2100);
    });
  });

  describe('set-treasury-address', () => {
    it('set-treasury-address: owner updates treasury — stored correctly', () => {
      const receipts = mine(simnet, [
        tx.callPublicFn('protocol-config', 'set-treasury-address', [p(ADDR.wallet3)], ADDR.deployer),
      ]);
      expect(receipts[0].result.type).toBe('ok');

      const treasury = simnet.callReadOnlyFn('protocol-config', 'get-treasury-address', [], ADDR.deployer);
      expect(treasury.result.type).toBe('address');
      expect(treasury.result.value).toBe(ADDR.wallet3);
    });
  });

  describe('register-asset / deregister-asset', () => {
    it('register-asset: owner registers a supported asset — asset appears in supported-assets map with correct metadata', () => {
      const add = mine(simnet, [
        tx.callPublicFn(
          'protocol-config',
          'add-supported-asset',
          [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(10_000_000)],
          ADDR.deployer,
        ),
      ]);
      expect(add[0].result.type).toBe('ok');

      const asset = simnet.callReadOnlyFn('protocol-config', 'get-supported-asset', [p(ADDR.wallet1)], ADDR.deployer);
      expect(asset.result.type).toBe('some');
      expect(asset.result.value.value.active.type).toBe('true');
      expect(asset.result.value.value.symbol.type).toBe('ascii');
      expect(asset.result.value.value.symbol.value).toBe('STX');
    });

    it('register-asset: owner registers same asset twice — returns duplicate error', () => {
      mine(simnet, [
        tx.callPublicFn(
          'protocol-config',
          'add-supported-asset',
          [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(10_000_000)],
          ADDR.deployer,
        ),
      ]);

      const second = mine(simnet, [
        tx.callPublicFn(
          'protocol-config',
          'add-supported-asset',
          [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(12_000_000)],
          ADDR.deployer,
        ),
      ]);
      expectErr(second[0].result, 2107);
    });

    it('deregister-asset: owner deregisters an asset — asset is marked inactive', () => {
      mine(simnet, [
        tx.callPublicFn(
          'protocol-config',
          'add-supported-asset',
          [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(10_000_000)],
          ADDR.deployer,
        ),
      ]);

      const deactivate = mine(simnet, [
        tx.callPublicFn('protocol-config', 'set-supported-asset-active', [p(ADDR.wallet1), b(false)], ADDR.deployer),
      ]);
      expectOkBool(deactivate[0].result, true);

      const asset = simnet.callReadOnlyFn('protocol-config', 'get-supported-asset', [p(ADDR.wallet1)], ADDR.deployer);
      expect(asset.result.type).toBe('some');
      expect(asset.result.value.value.active.type).toBe('false');
    });
  });

  describe('get-config', () => {
    it('get-config: returns all current configuration values with correct types', () => {
      const fee = simnet.callReadOnlyFn('protocol-config', 'get-performance-fee-rate-bps', [], ADDR.deployer);
      const vaults = simnet.callReadOnlyFn('protocol-config', 'get-max-vaults-per-user', [], ADDR.deployer);
      const min = simnet.callReadOnlyFn('protocol-config', 'get-min-deposit-amount', [], ADDR.deployer);
      const cooldown = simnet.callReadOnlyFn('protocol-config', 'get-max-rebalance-frequency-blocks', [], ADDR.deployer);
      const treasury = simnet.callReadOnlyFn('protocol-config', 'get-treasury-address', [], ADDR.deployer);

      expect(fee.result.type).toBe('uint');
      expect(vaults.result.type).toBe('uint');
      expect(min.result.type).toBe('uint');
      expect(cooldown.result.type).toBe('uint');
      expect(treasury.result.type).toBe('address');
    });
  });
});
