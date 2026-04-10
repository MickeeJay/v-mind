import { tx } from '@hirosystems/clarinet-sdk';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADDR, ascii, bootSimnet, expectErr, expectOkBool, expectOkUint, mine, p, u } from '../helpers/simnet';

describe('strategy-registry', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  describe('register-strategy', () => {
    it('register-strategy: registrar role holder registers a valid strategy — stored with correct metadata, ID counter incremented', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet2), u(3)], ADDR.deployer)]);

      const reg = mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Yield Alpha'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.wallet2,
        ),
      ]);
      expectOkUint(reg[0].result, 1);

      const strategy = simnet.callReadOnlyFn('strategy-registry', 'get-strategy', [u(1)], ADDR.deployer);
      expect(strategy.result.type).toBe('some');
      expect(strategy.result.value.value.name.value).toBe('Yield Alpha');
      expect(strategy.result.value.value['target-protocol-principal'].value).toBe(ADDR.wallet1);

      const total = simnet.callReadOnlyFn('strategy-registry', 'get-total-strategies', [], ADDR.deployer);
      expect(total.result.type).toBe('uint');
      expect(Number(total.result.value)).toBe(1);
    });

    it('register-strategy: non-registrar attempts to register — returns the correct unauthorised error', () => {
      const reg = mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Blocked'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.wallet3,
        ),
      ]);
      expectErr(reg[0].result, 2203);
    });
  });

  describe('activate-strategy / deactivate-strategy', () => {
    it('activate-strategy: deactivated strategy is activated — is-active becomes true', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Toggle Me'), u(1), p(ADDR.wallet1), u(1), p(ADDR.deployer)],
          ADDR.deployer,
        ),
      ]);
      mine(simnet, [tx.callPublicFn('strategy-registry', 'deactivate-strategy', [u(1)], ADDR.deployer)]);

      const activate = mine(simnet, [tx.callPublicFn('strategy-registry', 'activate-strategy', [u(1)], ADDR.deployer)]);
      expectOkBool(activate[0].result, true);

      const active = simnet.callReadOnlyFn('strategy-registry', 'is-strategy-active', [u(1)], ADDR.deployer);
      expect(active.result.type).toBe('true');
    });

    it('deactivate-strategy: active strategy is deactivated — is-active becomes false', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Deactivate Me'), u(1), p(ADDR.wallet1), u(1), p(ADDR.deployer)],
          ADDR.deployer,
        ),
      ]);

      const deactivate = mine(simnet, [tx.callPublicFn('strategy-registry', 'deactivate-strategy', [u(1)], ADDR.deployer)]);
      expectOkBool(deactivate[0].result, true);

      const active = simnet.callReadOnlyFn('strategy-registry', 'is-strategy-active', [u(1)], ADDR.deployer);
      expect(active.result.type).toBe('false');
    });
  });

  describe('get-strategy', () => {
    it('get-strategy: retrieves a strategy by ID — all fields match what was registered', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Query Strategy'), u(2), p(ADDR.wallet4), u(3), p(ADDR.wallet2)],
          ADDR.deployer,
        ),
      ]);

      const strategy = simnet.callReadOnlyFn('strategy-registry', 'get-strategy', [u(1)], ADDR.deployer);
      expect(strategy.result.type).toBe('some');
      expect(strategy.result.value.value.name.value).toBe('Query Strategy');
      expect(Number(strategy.result.value.value.type.value)).toBe(2);
      expect(Number(strategy.result.value.value['risk-tier'].value)).toBe(3);
      expect(strategy.result.value.value['is-active'].type).toBe('true');
    });

    it('get-strategy: non-existent ID — returns none', () => {
      const strategy = simnet.callReadOnlyFn('strategy-registry', 'get-strategy', [u(999)], ADDR.deployer);
      expect(strategy.result.type).toBe('none');
    });
  });

  describe('validate-strategy-for-execution', () => {
    it('validate-strategy-for-execution: active strategy, correct caller — returns ok true', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Exec OK'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.deployer,
        ),
      ]);

      const validate = simnet.callReadOnlyFn('strategy-registry', 'validate-strategy-for-execution', [u(1)], ADDR.wallet2);
      expectOkBool(validate.result, true);
    });

    it('validate-strategy-for-execution: inactive strategy — returns the correct error', () => {
      mine(simnet, [
        tx.callPublicFn(
          'strategy-registry',
          'register-strategy',
          [ascii('Exec NO'), u(1), p(ADDR.wallet1), u(1), p(ADDR.wallet2)],
          ADDR.deployer,
        ),
      ]);
      mine(simnet, [tx.callPublicFn('strategy-registry', 'deactivate-strategy', [u(1)], ADDR.deployer)]);

      const validate = simnet.callReadOnlyFn('strategy-registry', 'validate-strategy-for-execution', [u(1)], ADDR.wallet2);
      expectErr(validate.result, 2208);
    });
  });
});
