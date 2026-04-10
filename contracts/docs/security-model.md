# V-Mind Security Model

## Purpose

This document defines the current authorization boundaries, critical state protections, and first-pass security controls in the reconciled V-Mind contract system.

## Trust Assumptions

- Protocol owner governance is trusted to manage roles and policy parameters.
- Registered strategy executors are trusted for operational execution, but still constrained by on-chain checks.
- External protocol adapters are treated as untrusted dependencies and all integration calls are wrapped and validated.

## Authorization Model

Source of truth:

- core/access-control.clar

Role identifiers:

- owner
- strategy-executor
- strategy-registrar
- vault-operator
- emergency-pauser

Ownership model:

- Two-step ownership transfer via commit and accept.

Emergency controls:

- Protocol pause and unpause managed in access-control.
- Emergency pauser role and owner can trigger pause controls.

## Core Contract Access Patterns

core/protocol-config.clar:

- All state-mutating setters are owner-only through access-control owner checks.

core/strategy-registry.clar:

- Strategy registration and metadata/lifecycle updates are strategy-registrar-or-owner.

core/vault-core.clar:

- create-vault is permissionless for users creating their own vaults.
- deposit, withdraw, pause-vault, unpause-vault, close-vault are vault-owner-only.
- emergency-withdraw and emergency-withdraw-all are protocol-owner-only.
- lock/unlock/execute-approved-strategy are strategy-executor-or-protocol-owner.
- fee and yield accounting mutations are protocol-owner-only.

core/strategy-execution.clar:

- execute-strategy and rebalance are strategy-executor-or-protocol-owner.
- emergency-exit-vault is protocol-owner-only.
- query helpers are permissionless.

core/vault-receipt-token.clar:

- initialize-token is owner-only.
- transfer is token-owner-only.
- mint, burn, and sync-vault-assets are vault-core-only.

## State and Accounting Invariants

- Vault IDs and strategy IDs are monotonic.
- close-vault requires zero balance.
- Vault execution lock state is explicit and checked around strategy execution flows.
- Vault receipt supply and vault asset tracking are synchronized via vault-receipt-token accounting updates.
- Price-per-share includes a defined initial value when supply is zero.

## Adapter Interaction Safety

- Adapters implement trait-based external interfaces.
- Adapter calls are wrapped with protocol-level events for observability.
- External interaction failures are mapped to named adapter error codes.
- External protocol principals are sourced from constants, not inline literals.

## Mock Policy

- Mock contracts are strictly local testing artifacts.
- Every mock includes the explicit non-deployment warning header.
- Mocks expose deterministic responses and configurable failure toggles to support failure-path tests.

## Outstanding Hardening Work

- Consolidate practical cross-contract error-code reuse pattern around error-codes-lib while preserving Clarity compatibility.
- Expand adapter and execution tests for failure ordering and state-transition invariants.
- Add dedicated invariant tests for vault receipt share/accounting synchronization under edge-case flows.
