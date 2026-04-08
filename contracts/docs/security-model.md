# V-Mind Security Model

## Purpose

This document defines trust assumptions, authorization boundaries, emergency controls, and core invariants for the V-Mind smart contract system.

## Trust Assumptions

- Governance owner is trusted to set safe fee and treasury parameters.
- Access-control owner and role admins are trusted to manage role assignment securely.
- Approved strategy implementations are audited before registration.
- Adapter contracts for external DeFi protocols can fail and must be treated as untrusted dependencies.
- Off-chain automation and keeper systems are untrusted for authorization and must pass on-chain checks.

## Authorization Matrix

### Owner-only functions

- access-control.transfer-ownership
- access-control.accept-ownership (restricted to pending owner)
- access-control.grant-role
- access-control.revoke-role
- protocol-config.set-treasury
- protocol-config.set-platform-fee-bps
- protocol-config.set-performance-fee-bps
- protocol-config.pause-protocol
- protocol-config.unpause-protocol
- strategy-registry.register-strategy
- strategy-registry.set-strategy-enabled
- strategy-registry.update-strategy-metadata
- vault-registry.register-vault
- vault-registry.set-vault-enabled
- vault-registry.update-vault-metadata
- strategy-vault.set-vault-enabled (vault owner)

### Operator-callable functions

- strategy-vault.execute-strategy (planned operator role gate)

### User-callable functions

- strategy-vault.deposit
- strategy-vault.withdraw

### Public read-only functions

- Registry and configuration getters.
- Role and owner visibility methods.
- Accounting and quote helper methods.

## Privileged Function Conditions

Additional expected conditions for privileged calls:

- Role management functions must reject if protocol governance is paused for admin actions.
- Registry update functions must reject malformed metadata and invalid risk scores.
- Vault enable and disable operations must emit deterministic state transitions to avoid ambiguous status.
- Strategy execution must verify strategy remains enabled immediately before external calls.

## Emergency Pause Design

### Global pause

- Stored in core/protocol-config.clar as protocol-paused.
- When true, all state-mutating operations in vaults and registries should reject by policy.
- Activated by owner or guardian flow once guardian integration is wired.

### Local vault containment

- Stored per vault via strategy-vault.vault-enabled.
- Allows quarantine of a single vault without stopping protocol-wide operations.

### Expected emergency process

1. Guardian or owner detects incident.
2. Global or local pause is activated.
3. Strategy execution path is disabled first.
4. Deposits are disabled.
5. Controlled withdrawal or recovery procedures are executed.

## On-Chain Invariants

Accounting invariants:

- total-shares equals sum of all issued user shares.
- total-assets is never negative and never underflows.
- Burned shares are removed from total-supply and holder balances atomically.

Registry invariants:

- strategy IDs are unique and monotonic.
- vault IDs are unique and monotonic.
- vault-id-by-contract has one-to-one mapping with vault entries.

Authorization invariants:

- Only owners and designated roles can mutate configuration and registry state.
- Unauthorized callers cannot execute privileged methods.

Safety invariants:

- Paused protocol cannot execute strategy actions.
- Disabled vault cannot accept new deposits.
- Strategies must be enabled in registry before vault execution.

Pause invariants:

- When protocol-paused is true, execute-strategy must always fail.
- When protocol-paused is true, deposit must always fail.
- Withdrawal policy under pause must be explicitly chosen and consistently enforced.

## Failure Domains and Mitigations

- Misconfigured fees: bounded by basis-point caps and owner procedures.
- Malicious strategy logic: mitigated via strategy registry approval and disable controls.
- Adapter loss or bad external response: mitigated by adapter-level sanity checks and pause controls.
- Keeper abuse or spam: mitigated by strict role checks and idempotent execution guards.

## Future Hardening Checklist

- Replace direct owner checks with access-control role checks in all core contracts.
- Add reentrancy-safe sequencing conventions even with Clarity execution model.
- Add explicit slippage and min-return constraints for adapter interactions.
- Add delayed config changes for high-impact parameters.
- Add monitoring hooks for pause events and strategy execution anomalies.
- Add invariant-based Clarinet tests for share accounting and registry uniqueness.
