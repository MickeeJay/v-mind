import { tx } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADDR,
  ascii,
  bootSimnet,
  expectErr,
  expectOk,
  expectOkBool,
  expectOkUint,
  mine,
  p,
  registerDefaultAssetAndStrategy,
  u,
  utf8,
} from '../helpers/simnet';

describe('vault-receipt-token', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  function initializeToken(
    name = 'V-Mind Vault Share',
    symbol = 'vMIND',
    decimals = 6,
    uri: ReturnType<typeof Cl.some> | ReturnType<typeof Cl.none> = Cl.none(),
  ) {
    return mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'initialize-token',
        [Cl.contractPrincipal(ADDR.deployer, 'vault-core'), ascii(name), ascii(symbol), u(decimals), uri],
        ADDR.deployer,
      ),
    ]);
  }

  function seedSingleVault(initialDeposit = 2_000_000) {
    registerDefaultAssetAndStrategy(simnet);
    return mine(simnet, [
      tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(initialDeposit), u(1)], ADDR.deployer),
    ]);
  }

  it('initialize-token: owner can initialize once and metadata is exposed via SIP-010 read-onlys', () => {
    const init = initializeToken('V-Mind Alpha Share', 'vALPHA', 6, Cl.some(utf8('https://v-mind.xyz/token/alpha')));
    expectOkBool(init[0].result, true);

    const name = simnet.callReadOnlyFn('vault-receipt-token', 'get-name', [], ADDR.deployer);
    expect(name.result.type).toBe('ok');
    expect(name.result.value.type).toBe('ascii');
    expect(name.result.value.value).toBe('V-Mind Alpha Share');

    const symbol = simnet.callReadOnlyFn('vault-receipt-token', 'get-symbol', [], ADDR.deployer);
    expect(symbol.result.type).toBe('ok');
    expect(symbol.result.value.type).toBe('ascii');
    expect(symbol.result.value.value).toBe('vALPHA');

    const decimals = simnet.callReadOnlyFn('vault-receipt-token', 'get-decimals', [], ADDR.deployer);
    expectOkUint(decimals.result, 6);

    const uri = simnet.callReadOnlyFn('vault-receipt-token', 'get-token-uri', [], ADDR.deployer);
    expect(uri.result.type).toBe('ok');
    expect(uri.result.value.type).toBe('some');
    expect(uri.result.value.value.type).toBe('utf8');
    expect(uri.result.value.value.value).toBe('https://v-mind.xyz/token/alpha');

    const isInitialized = simnet.callReadOnlyFn('vault-receipt-token', 'is-initialized', [], ADDR.deployer);
    expect(isInitialized.result.type).toBe('true');

    const core = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-core-contract', [], ADDR.deployer);
    expect(core.result.type).toBe('contract');
  });

  it('initialize-token: non-owner fails and re-initialization fails with correct errors', () => {
    const init = mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'initialize-token',
        [Cl.contractPrincipal(ADDR.deployer, 'vault-core'), ascii('A'), ascii('A'), u(6), Cl.none()],
        ADDR.wallet1,
      ),
      tx.callPublicFn(
        'vault-receipt-token',
        'initialize-token',
        [Cl.contractPrincipal(ADDR.deployer, 'vault-core'), ascii('B'), ascii('B'), u(6), Cl.none()],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'vault-receipt-token',
        'initialize-token',
        [Cl.contractPrincipal(ADDR.deployer, 'vault-core'), ascii('C'), ascii('C'), u(6), Cl.none()],
        ADDR.deployer,
      ),
    ]);

    expectErr(init[0].result, 2801);
    expectOkBool(init[1].result, true);
    expectErr(init[2].result, 2802);
  });

  it('vault-core-only: direct calls to mint/burn/sync-vault-assets are rejected', () => {
    initializeToken();

    const calls = mine(simnet, [
      tx.callPublicFn('vault-receipt-token', 'mint', [u(1), p(ADDR.deployer), u(1_000_000)], ADDR.deployer),
      tx.callPublicFn('vault-receipt-token', 'burn', [u(1), p(ADDR.deployer), u(100_000)], ADDR.deployer),
      tx.callPublicFn('vault-receipt-token', 'sync-vault-assets', [u(1), u(1_000_000)], ADDR.deployer),
    ]);

    expectErr(calls[0].result, 2804);
    expectErr(calls[1].result, 2804);
    expectErr(calls[2].result, 2804);
  });

  it('initial mint path: create-vault mints shares 1:1 and updates per-vault and global supply', () => {
    initializeToken();
    const create = seedSingleVault(2_000_000);
    expectOkUint(create[0].result, 1);

    const vaultBalance = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-balance', [u(1), p(ADDR.deployer)], ADDR.deployer);
    expectOkUint(vaultBalance.result, 2_000_000);

    const vaultSupply = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-total-supply', [u(1)], ADDR.deployer);
    expectOkUint(vaultSupply.result, 2_000_000);

    const totalSupply = simnet.callReadOnlyFn('vault-receipt-token', 'get-total-supply', [], ADDR.deployer);
    expectOkUint(totalSupply.result, 2_000_000);

    const pps = simnet.callReadOnlyFn('vault-receipt-token', 'get-price-per-share', [u(1)], ADDR.deployer);
    expectOkUint(pps.result, 1_000_000);
  });

  it('price-per-share: accrue-yield updates cached vault assets and share price', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const accrue = mine(simnet, [tx.callPublicFn('vault-core', 'accrue-yield', [u(1), u(500_000)], ADDR.deployer)]);
    expectOkUint(accrue[0].result, 2_500_000);

    const assets = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-total-assets', [u(1)], ADDR.deployer);
    expectOkUint(assets.result, 2_500_000);

    const pps = simnet.callReadOnlyFn('vault-receipt-token', 'get-price-per-share', [u(1)], ADDR.deployer);
    expectOkUint(pps.result, 1_250_000);
  });

  it('transfer: caller must equal sender (token-owner-only)', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const transfer = mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'transfer',
        [u(100_000), p(ADDR.deployer), p(ADDR.wallet3), Cl.none()],
        ADDR.wallet2,
      ),
    ]);
    expectErr(transfer[0].result, 2800);
  });

  it('transfer: sender with multiple active vault contexts is rejected', () => {
    initializeToken();

    mine(simnet, [
      tx.callPublicFn(
        'protocol-config',
        'add-supported-asset',
        [p(ADDR.wallet1), ascii('STX'), u(1_000_000), u(30_000_000)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'protocol-config',
        'add-supported-asset',
        [p(ADDR.wallet4), ascii('sBTC'), u(1_000_000), u(30_000_000)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'strategy-registry',
        'register-strategy',
        [ascii('CTX A'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
        ADDR.deployer,
      ),
      tx.callPublicFn(
        'strategy-registry',
        'register-strategy',
        [ascii('CTX B'), u(1), p(ADDR.wallet4), u(1), p(ADDR.wallet2)],
        ADDR.deployer,
      ),
      tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet1), u(1_000_000), u(1)], ADDR.deployer),
      tx.callPublicFn('vault-core', 'create-vault', [p(ADDR.wallet4), u(1_000_000), u(2)], ADDR.deployer),
      tx.callPublicFn(
        'vault-receipt-token',
        'transfer',
        [u(100_000), p(ADDR.deployer), p(ADDR.wallet3), Cl.none()],
        ADDR.deployer,
      ),
    ]);

    const result = mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'transfer',
        [u(100_000), p(ADDR.deployer), p(ADDR.wallet3), Cl.none()],
        ADDR.deployer,
      ),
    ]);
    expectErr(result[0].result, 2807);
  });

  it('transfer: single-vault sender can transfer shares and balances update for both accounts', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const transfer = mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'transfer',
        [u(500_000), p(ADDR.deployer), p(ADDR.wallet3), Cl.none()],
        ADDR.deployer,
      ),
    ]);
    expectOkBool(transfer[0].result, true);

    const sender = simnet.callReadOnlyFn('vault-receipt-token', 'get-balance', [p(ADDR.deployer)], ADDR.deployer);
    expectOkUint(sender.result, 1_500_000);

    const recipient = simnet.callReadOnlyFn('vault-receipt-token', 'get-balance', [p(ADDR.wallet3)], ADDR.deployer);
    expectOkUint(recipient.result, 500_000);

    const senderVaultBal = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-balance', [u(1), p(ADDR.deployer)], ADDR.deployer);
    expectOkUint(senderVaultBal.result, 1_500_000);

    const recipientVaultBal = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-balance', [u(1), p(ADDR.wallet3)], ADDR.deployer);
    expectOkUint(recipientVaultBal.result, 500_000);
  });

  it('withdraw path: burning more shares than held fails with token insufficient-shares error', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const withdraw = mine(simnet, [tx.callPublicFn('vault-core', 'withdraw', [u(1), u(3_000_000)], ADDR.deployer)]);
    expectErr(withdraw[0].result, 2806);
  });

  it('sync path: emergency-withdraw-all in vault-core zeroes token-tracked vault assets', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const emergency = mine(simnet, [tx.callPublicFn('vault-core', 'emergency-withdraw-all', [u(1)], ADDR.deployer)]);
    expectOkUint(emergency[0].result, 1);

    const assets = simnet.callReadOnlyFn('vault-receipt-token', 'get-vault-total-assets', [u(1)], ADDR.deployer);
    expectOkUint(assets.result, 2_000_000);
  });

  it('get-price-per-share: uninitialized vault-id returns initial 1.0 share price', () => {
    const pps = simnet.callReadOnlyFn('vault-receipt-token', 'get-price-per-share', [u(999)], ADDR.deployer);
    expectOkUint(pps.result, 1_000_000);
  });

  it('initialize-token: decimals above max are rejected', () => {
    const init = initializeToken('V-Mind', 'vM', 19);
    expectErr(init[0].result, 2803);
  });

  it('transfer: zero amount is rejected', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const transfer = mine(simnet, [
      tx.callPublicFn('vault-receipt-token', 'transfer', [u(0), p(ADDR.deployer), p(ADDR.wallet3), Cl.none()], ADDR.deployer),
    ]);
    expectErr(transfer[0].result, 2805);
  });

  it('transfer: sender-to-self surfaces FT-level transfer error and preserves balance', () => {
    initializeToken();
    seedSingleVault(2_000_000);

    const before = simnet.callReadOnlyFn('vault-receipt-token', 'get-balance', [p(ADDR.deployer)], ADDR.deployer);
    expectOkUint(before.result, 2_000_000);

    const transfer = mine(simnet, [
      tx.callPublicFn(
        'vault-receipt-token',
        'transfer',
        [u(250_000), p(ADDR.deployer), p(ADDR.deployer), Cl.none()],
        ADDR.deployer,
      ),
    ]);
    expect(transfer[0].result.type).toBe('err');

    const after = simnet.callReadOnlyFn('vault-receipt-token', 'get-balance', [p(ADDR.deployer)], ADDR.deployer);
    expectOkUint(after.result, 2_000_000);
  });
});
