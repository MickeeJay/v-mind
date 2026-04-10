import { tx } from '@hirosystems/clarinet-sdk';
import { describe, it, beforeEach } from 'vitest';
import { ADDR, bootSimnet, expectErr, expectOkBool, mine, p, u } from '../helpers/simnet';

describe('access-control', () => {
  let simnet: Awaited<ReturnType<typeof bootSimnet>>;

  beforeEach(async () => {
    simnet = await bootSimnet();
  });

  describe('grant-role', () => {
    it('grant-role: owner grants a role to a new principal — role is correctly recorded', () => {
      const receipts = mine(simnet, [
        tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet1), u(2)], ADDR.deployer),
      ]);
      expectOkBool(receipts[0].result, true);

      const has = simnet.callReadOnlyFn('access-control', 'has-role', [p(ADDR.wallet1), u(2)], ADDR.deployer);
      expect(has.result.type).toBe('true');
    });

    it('grant-role: non-owner attempts to grant a role — returns the correct ERR-NOT-OWNER error code', () => {
      const receipts = mine(simnet, [
        tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet1), u(2)], ADDR.wallet2),
      ]);
      expectErr(receipts[0].result, 2000);
    });
  });

  describe('revoke-role', () => {
    it('revoke-role: owner revokes an existing role — role is no longer held by the principal', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet1), u(2)], ADDR.deployer)]);
      const revoke = mine(simnet, [
        tx.callPublicFn('access-control', 'revoke-role', [p(ADDR.wallet1), u(2)], ADDR.deployer),
      ]);
      expectOkBool(revoke[0].result, true);

      const has = simnet.callReadOnlyFn('access-control', 'has-role', [p(ADDR.wallet1), u(2)], ADDR.deployer);
      expect(has.result.type).toBe('false');
    });

    it('revoke-role: attempting to revoke a role not held — returns the correct error', () => {
      const revoke = mine(simnet, [
        tx.callPublicFn('access-control', 'revoke-role', [p(ADDR.wallet1), u(2)], ADDR.deployer),
      ]);
      expectErr(revoke[0].result, 2002);
    });
  });

  describe('renounce-role', () => {
    it('renounce-role: principal renounces their own role — role is removed', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet1), u(2)], ADDR.deployer)]);
      const renounce = mine(simnet, [tx.callPublicFn('access-control', 'renounce-role', [u(2)], ADDR.wallet1)]);
      expectOkBool(renounce[0].result, true);

      const has = simnet.callReadOnlyFn('access-control', 'has-role', [p(ADDR.wallet1), u(2)], ADDR.deployer);
      expect(has.result.type).toBe('false');
    });

    it('renounce-role: principal attempts to renounce a role they do not hold — returns the correct error', () => {
      const renounce = mine(simnet, [tx.callPublicFn('access-control', 'renounce-role', [u(2)], ADDR.wallet1)]);
      expectErr(renounce[0].result, 2002);
    });
  });

  describe('transfer-ownership / accept-ownership', () => {
    it('transfer-ownership: owner initiates a two-step transfer — pending-owner is set correctly', () => {
      const step1 = mine(simnet, [
        tx.callPublicFn('access-control', 'transfer-ownership', [p(ADDR.wallet1)], ADDR.deployer),
      ]);
      expectOkBool(step1[0].result, true);
    });

    it('transfer-ownership: new owner accepts — contract owner is updated, pending-owner is cleared', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'transfer-ownership', [p(ADDR.wallet1)], ADDR.deployer)]);
      const accept = mine(simnet, [tx.callPublicFn('access-control', 'accept-ownership', [], ADDR.wallet1)]);
      expectOkBool(accept[0].result, true);

      const owner = simnet.callReadOnlyFn('access-control', 'get-owner', [], ADDR.deployer);
      expect(owner.result.type).toBe('address');
      expect(owner.result.value).toBe(ADDR.wallet1);
    });

    it('transfer-ownership: non-pending-owner attempts to accept — returns the correct error', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'transfer-ownership', [p(ADDR.wallet1)], ADDR.deployer)]);
      const accept = mine(simnet, [tx.callPublicFn('access-control', 'accept-ownership', [], ADDR.wallet2)]);
      expectErr(accept[0].result, 2000);
    });
  });

  describe('emergency-pause / emergency-unpause', () => {
    it('emergency-pause: pauser role holder pauses the protocol — pause state is true', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet2), u(5)], ADDR.deployer)]);
      const pause = mine(simnet, [tx.callPublicFn('access-control', 'emergency-pause', [], ADDR.wallet2)]);
      expectOkBool(pause[0].result, true);

      const paused = simnet.callReadOnlyFn('access-control', 'is-protocol-paused', [], ADDR.deployer);
      expect(paused.result.type).toBe('true');
    });

    it('emergency-pause: non-pauser attempts to pause — returns the correct error', () => {
      const pause = mine(simnet, [tx.callPublicFn('access-control', 'emergency-pause', [], ADDR.wallet2)]);
      expectErr(pause[0].result, 2003);
    });

    it('unpause: owner unpauses — pause state is false', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'emergency-pause', [], ADDR.deployer)]);
      const unpause = mine(simnet, [tx.callPublicFn('access-control', 'emergency-unpause', [], ADDR.deployer)]);
      expectOkBool(unpause[0].result, true);

      const paused = simnet.callReadOnlyFn('access-control', 'is-protocol-paused', [], ADDR.deployer);
      expect(paused.result.type).toBe('false');
    });

    it('unpause: non-owner attempts to unpause — returns the correct error', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'emergency-pause', [], ADDR.deployer)]);
      const unpause = mine(simnet, [tx.callPublicFn('access-control', 'emergency-unpause', [], ADDR.wallet1)]);
      expectErr(unpause[0].result, 2003);
    });
  });

  describe('has-role', () => {
    it('has-role: returns true for a principal with a role, false for one without', () => {
      mine(simnet, [tx.callPublicFn('access-control', 'grant-role', [p(ADDR.wallet3), u(3)], ADDR.deployer)]);
      const has = simnet.callReadOnlyFn('access-control', 'has-role', [p(ADDR.wallet3), u(3)], ADDR.deployer);
      const missing = simnet.callReadOnlyFn('access-control', 'has-role', [p(ADDR.wallet4), u(3)], ADDR.deployer);

      expect(has.result.type).toBe('true');
      expect(missing.result.type).toBe('false');
    });
  });
});
