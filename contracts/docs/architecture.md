# V-Mind On-Chain Architecture

## Overview

V-Mind is a Stacks-native strategy automation protocol for Bitcoin L2 DeFi vault management. The architecture is intentionally modular so governance, configuration, strategy approval, vault deployment, and integration layers can evolve independently.

This document defines the baseline contract architecture and responsibilities before full business logic implementation.

Related documentation:

- Configuration changelog: docs/configuration-changelog.md

## Directory Structure

The smart contract layout under contracts/contracts is structured as follows:

- core/: State-heavy protocol modules and user-facing contracts.
- traits/: Interface definitions for strategies, vault tokens, and external adapters.
- libraries/: Shared constants, validations, and accounting helpers.
- mocks/: Test-only contracts for deterministic local and CI workflows.

Current scaffold:

- core/access-control.clar
- core/protocol-config.clar
- core/strategy-registry.clar
- core/vault-registry.clar
- core/vault-core.clar
- traits/strategy-trait.clar
- traits/vault-token-trait.clar
- traits/protocol-adapter-trait.clar
- libraries/error-codes-lib.clar
- libraries/constants-lib.clar
- libraries/vault-accounting-lib.clar
- libraries/strategy-validation-lib.clar
- mocks/mock-strategy.clar
- mocks/mock-vault-token.clar
- mocks/mock-protocol-adapter.clar

## Naming Conventions

- Trait files end with -trait.clar.
- Library files end with -lib.clar.
- Mock contracts used only for testing start with mock-.
- Core production contracts use functional protocol names without prefix or suffix.

## Contract Responsibilities

### core/access-control.clar

Purpose:
- Defines protocol ownership and role membership state.
- Serves as canonical authorization layer for admin-gated actions.

Primary responsibilities:
- Role grant and revoke lifecycle.
- Ownership transfer lifecycle.
- Role lookup utility for dependent contracts.

### core/protocol-config.clar

Purpose:
- Stores global protocol configuration and emergency pause state.

Primary responsibilities:
- Fee parameter storage and update controls.
- Treasury address management.
- Supported asset, strategy-type whitelist, and fee-override management.
- Configuration versioning and on-chain event emission.

### core/strategy-registry.clar

Purpose:
- Stores approved strategy contracts and strategy metadata.

Primary responsibilities:
- Strategy onboarding and status management.
- Risk score and metadata URI storage.
- Strategy discovery for vault deployments and frontends.

### core/vault-registry.clar

Purpose:
- Tracks all deployed strategy vaults and vault metadata.

Primary responsibilities:
- Vault registration and status toggles.
- Mapping vault contracts to strategy IDs.
- Canonical vault discovery endpoint for clients.

### core/vault-core.clar

Purpose:
- Holds user positions, issues shares, and executes approved strategy lifecycle calls.

Primary responsibilities:
- Deposit and withdrawal accounting.
- Share mint and burn accounting.
- Strategy execution triggers under policy checks.

### traits/strategy-trait.clar

Purpose:
- Defines required interface every approved strategy must implement.

Primary responsibilities:
- Execution readiness checks.
- Execution entry point.
- Deposit and withdraw lifecycle hooks.

### traits/vault-token-trait.clar

Purpose:
- Defines share token interface for vault receipt tokens.

Primary responsibilities:
- Share mint and burn hooks.
- Transfer and balance read APIs.
- Total supply visibility.

### traits/protocol-adapter-trait.clar

Purpose:
- Defines composable interface for external protocol adapters.

Primary responsibilities:
- Deposit and withdraw operations into external protocols.
- Harvest and quote operations.

### libraries/*.clar

Purpose:
- Reusable constants, errors, accounting and validation utilities.

Primary responsibilities:
- Reduce duplicated logic across core contracts.
- Normalize validation behavior and fee math semantics.

### mocks/*.clar

Purpose:
- Deterministic non-production implementations used in tests.

Primary responsibilities:
- Isolate core protocol tests from external protocol assumptions.
- Validate trait compatibility and integration points.

## Dependencies and Interaction Model

Dependency order from lowest to highest:

1. libraries/error-codes-lib.clar
2. libraries/constants-lib.clar
3. libraries/vault-accounting-lib.clar
4. libraries/strategy-validation-lib.clar
5. traits/strategy-trait.clar
6. traits/vault-token-trait.clar
7. traits/protocol-adapter-trait.clar
8. core/access-control.clar
9. core/protocol-config.clar
10. core/strategy-registry.clar
11. core/vault-registry.clar
12. core/vault-core.clar
13. mocks/*

Logical runtime relationships:

- vault-core reads protocol-config for pause and global fee parameters.
- vault-core references strategy-registry to ensure strategy approval and status.
- vault-core references vault-registry for canonical vault status and metadata checks.
- vault-core relies on access-control for operator and guardian authorization.
- strategy contracts implement strategy-trait and may call protocol-adapter-trait implementations.

## Function Access Conditions

Expected call-condition policy by module:

- access-control:
	- grant-role and revoke-role require owner authorization.
	- renounce-role requires tx-sender to be the role holder.
- protocol-config:
	- set-treasury and fee setters require owner role.
	- pause and unpause require owner or guardian role.
- strategy-registry and vault-registry:
	- registration and metadata updates require owner or governance role.
	- read-only getters are permissionless.
- vault-core:
	- deposit and withdraw are permissionless for users unless paused.
	- execute-strategy requires operator role, vault enabled state, and strategy enabled state.
	- set-vault-enabled requires vault owner or governance role.

## Deployment Sequencing

Recommended deployment sequence for production:

1. Deploy libraries and traits.
2. Deploy access-control and assign bootstrap roles.
3. Deploy protocol-config and wire governance owner.
4. Deploy strategy-registry and vault-registry with access-control references.
5. Deploy vault-core instances and register them in vault-registry.
6. Register approved strategies after trait compliance and risk review.
7. Enable automation callers for execute-strategy.

## Funds Flow: Deposit to Execution to Withdrawal

### 1. Deposit

- User submits deposit to vault-core.
- Vault validates pause state and vault status.
- Vault updates internal total-assets and user share balance.
- Optional strategy on-deposit hook is called for post-accounting integration.

### 2. Strategy Execution

- Authorized operator or automation caller invokes execute-strategy.
- Vault validates global pause state and strategy enabled state.
- Vault calls strategy-trait can-execute and then execute.
- Strategy may route assets through a protocol-adapter-trait implementation.
- Vault records resulting position delta and updates accounting.

### 3. Withdrawal

- User submits share amount for redemption.
- Vault validates balances, pause policy, and liquidity assumptions.
- Vault burns shares and computes asset amount via accounting library rules.
- Vault optionally calls strategy on-withdraw hook for unwind coordination.
- User receives assets according to final settlement amount.

## Security Model Summary

Authorization boundaries:

- Owner/admin functions: role assignment, protocol configuration, registry onboarding and status controls.
- Operator functions: strategy execution and selected vault operations.
- User functions: deposit, withdraw, and read-only queries.

Emergency controls:

- protocol-config provides global pause circuit breaker.
- Vault-level enable flags allow per-vault containment.
- Guardian role is expected to trigger emergency pause actions.

Key invariants:

- Only approved strategies can be selected for production vaults.
- Registered vault IDs map one-to-one with vault contract principals.
- total-shares must remain consistent with share balance ledger.
- total-assets and withdrawals must not underflow under any execution path.

## Known Design Assumptions

- Access control and protocol config are authoritative and non-malicious once governed.
- Off-chain automation callers are replaceable and not trusted for safety-critical validation.
- External protocol adapters can fail or return adversarial values; vaults must enforce strict checks.
- Metadata URIs are advisory and should not be trusted for on-chain critical logic.
