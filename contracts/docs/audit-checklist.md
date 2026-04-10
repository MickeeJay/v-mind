# V-Mind Smart Contracts Security Checklist

## Scope

This checklist covers all production V-Mind contracts under `contracts/contracts`:

- `core/access-control.clar`
- `core/protocol-config.clar`
- `core/strategy-registry.clar`
- `core/vault-registry.clar`
- `core/strategy-vault.clar`
- `core/vault-receipt-token.clar`
- `core/strategy-execution.clar`
- `adapters/zest-protocol-adapter.clar`
- `adapters/alex-liquidity-adapter.clar`
- `adapters/stackingdao-adapter.clar`
- `adapters/hermetica-adapter.clar`
- `v-mind-core.clar`

Mocks and traits are out of direct production scope, but are reviewed for test realism and assumptions.

## Security Assumptions

- Clarity integer arithmetic is bounded and aborts on overflow/underflow.
- `access-control` owner is securely managed and uncompromised.
- `strategy-execution` is deployed under the same principal namespace as adapters and is the only intended orchestrator for adapter position calls.
- Protocol adapters are integration shims; they do not custody real tokens in this codebase and rely on external protocol contracts and mocks for transfer semantics.
- `protocol-config` treasury principal is authoritative for fee routing.

## Required Invariants

### Vault Core and Share Accounting

- Vault asset accounting parity:
  - `strategy-vault` map `total-assets` must equal `vault-receipt-token` map `vault-total-assets` after every state-mutating vault operation.
- Share supply mutation constraints:
  - Vault share supply can only be changed through `vault-receipt-token.mint` and `vault-receipt-token.burn`.
  - `sync-vault-assets` must not change share supply.
- Withdrawal safety:
  - No withdrawal path may underflow vault assets.
  - No withdrawal may burn more shares than user balance or total supply.

### Execution Engine and Allocation

- Sum of protocol allocations in `strategy-execution` must never exceed `strategy-vault` tracked vault assets.
- Execution lock must be acquired before external protocol calls and released on successful completion.
- On failure, lock/state rollback depends on transaction atomicity and must leave vault unlocked.

### Circuit Breaker

- `strategy-vault.max-aum-drop-bps-per-tx` defines the allowed maximum single-transaction AUM drop.
- Any controlled vault-asset reduction that exceeds this threshold must revert with `err-aum-drop-exceeded`.

## Authorization Matrix

### Core Contracts

- `access-control`
  - `transfer-ownership`: owner-only
  - `accept-ownership`: pending-owner-only
  - `grant-role`: owner-only
  - `revoke-role`: owner-only
  - `renounce-role`: self-only
- `protocol-config`
  - all mutating functions: owner-only
- `strategy-registry`
  - all mutating functions: strategy-registrar role or owner fallback
- `vault-registry`
  - all mutating functions: owner-only
- `strategy-vault`
  - `create-vault`: permissionless by design
  - `deposit`, `withdraw`, lifecycle controls: vault-owner-only
  - `apply-performance-fee`, `accrue-yield`, `emergency-withdraw`, `set-max-aum-drop-bps-per-tx`: protocol-owner-only
  - `lock-vault-for-execution`, `unlock-vault-after-execution`, `execute-approved-strategy`: strategy executor or protocol owner
- `vault-receipt-token`
  - `initialize-token`: owner-only
  - `transfer`: token-holder-only
  - `mint`, `burn`, `sync-vault-assets`: vault-core-only (`contract-caller` check)
- `strategy-execution`
  - `execute-strategy`, `rebalance-vault`: strategy executor or protocol owner
  - `emergency-exit-vault`: protocol-owner-only

### Adapter Contracts

- Config mutators (`set-*`): owner-only
- Position mutators and fee hooks (`deposit*`, `withdraw*`, `collect*`, `emergency-exit*`): restricted to `strategy-execution` as `contract-caller` or adapter owner
- Fee collection hooks enforce treasury destination equals `protocol-config.get-protocol-treasury()`

## Reentrancy-Equivalent Review (Clarity External Calls)

- `strategy-execution` now acquires vault execution lock before adapter calls.
- Allocation state is updated before outbound protocol calls in execution and rebalance paths.
- Emergency exit clears tracked positions before outbound exit calls.
- Atomic transaction semantics ensure full rollback if any downstream call fails.

## Arithmetic/Bounds Review

- Added explicit subtraction preconditions before all sensitive decrements in vault and execution paths.
- Deposit bounds in vault enforce `amount <= (max - current-assets)` to avoid unchecked intermediate sum usage.
- Withdrawal and fee paths assert source balances before subtraction.
- Adapter trackers guard against subtraction underflow in deployed totals and per-vault positions.

## Adversarial Test Coverage Strategy

Security-focused tests are split by attack scenario:

- Unauthorized privileged calls:
  - `tests/security.unauthorized-privileged_test.ts`
- Withdraw more than deposited:
  - `tests/security.withdraw-over-deposit_test.ts`
- Execute deactivated strategy:
  - `tests/security.execute-deactivated-strategy_test.ts`
- Cooldown bypass attempts:
  - `tests/security.cooldown-bypass_test.ts`
- Cross-vault drain attempts:
  - `tests/security.cross-vault-drain_test.ts`
- Adapter unauthorized caller guard:
  - `tests/security.adapter-caller-guard_test.ts`
- AUM circuit breaker:
  - `tests/security.aum-circuit-breaker_test.ts`
- Execution lock integrity:
  - `tests/security.execution-lock-integrity_test.ts`

Coverage principle:

- Every public mutating function should have at least one success-path and one expected-failure-path assertion across the combined existing and added suite.
- Existing domain tests remain in place for positive-path protocol behavior.

## Known Limitations and Follow-Ups

- Current local Clarinet binary in this environment does not support `clarinet test`; validation relies on `clarinet check` and static diagnostics until toolchain alignment.
- Adapter fee collection functions validate treasury and authorization but still act as accounting hooks; transfer semantics depend on integrated protocol/token contracts.
- Role hierarchy in `access-control` is owner-administered and flat; no delegated admin model is implemented.
- Emergency owner controls are powerful; operationally, production deployments should use multisig custody for owner principal.

## External Auditor Hand-off Notes

- Re-verify deployment principal assumptions for inter-contract caller checks, especially adapter `strategy-execution` caller restriction.
- Re-run full Clarinet tests and coverage in CI using a Clarinet version with `test --coverage` support.
- Confirm that production adapters are wired to real protocol/token transfer implementations and not mocks.
- Validate that operational policy sets a non-trivial `max-aum-drop-bps-per-tx` threshold before mainnet launch.
