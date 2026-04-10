# V-Mind On-Chain Architecture

## Overview

V-Mind is a Stacks-native strategy automation protocol for Bitcoin L2 DeFi vault management. The contract system is organized so traits and libraries stay dependency-free, adapters wrap external integrations, and core contracts enforce protocol policy and user state transitions.

## Reconciled Contract Layout

Canonical layout under contracts/contracts:

- traits/
- libraries/
- adapters/
- core/
- mocks/

Contract inventory by responsibility:

- traits/sip-010-ft-trait.clar: Canonical SIP-010 FT trait.
- traits/strategy-trait.clar: Strategy executor interface.
- traits/vault-token-trait.clar: Vault receipt token interface.
- traits/protocol-adapter-trait.clar: Common adapter interface.
- traits/alex-liquidity-trait.clar: ALEX adapter trait.
- traits/zest-lending-trait.clar: Zest adapter trait.
- traits/stackingdao-ststx-trait.clar: StackingDAO adapter trait.
- traits/hermetica-usdh-trait.clar: Hermetica adapter trait.

- libraries/constants-lib.clar: Protocol constants, role IDs, external principals.
- libraries/error-codes-lib.clar: Canonical error code catalog.
- libraries/strategy-validation-lib.clar: Strategy parameter/risk validation helpers.
- libraries/vault-accounting-lib.clar: Share-price, fee, and proportional-allocation math.

- adapters/zest-protocol-adapter.clar: Zest integration wrapper.
- adapters/alex-liquidity-adapter.clar: ALEX integration wrapper.
- adapters/stackingdao-adapter.clar: StackingDAO integration wrapper.
- adapters/hermetica-adapter.clar: Hermetica integration wrapper.

- core/access-control.clar: Ownership, role lifecycle, emergency pause state.
- core/protocol-config.clar: Protocol parameters, supported assets, fee overrides.
- core/strategy-registry.clar: Strategy registry, activation state, metadata.
- core/vault-receipt-token.clar: SIP-010 receipt token with vault-scoped share accounting.
- core/vault-core.clar: User vault lifecycle, accounting, and privileged controls.
- core/strategy-execution.clar: Strategy execution, rebalance, cooldown and fee orchestration.

- mocks/mock-strategy.clar
- mocks/mock-vault-token.clar
- mocks/mock-protocol-adapter.clar
- mocks/mock-defi-integrations.clar
- mocks/mock-zest-protocol.clar
- mocks/mock-alex-amm.clar
- mocks/mock-stackingdao-core.clar
- mocks/mock-hermetica-staking.clar

## Dependency Graph

Expected direction:

1. Traits and libraries have no upstream protocol dependencies.
2. Adapters depend on traits and libraries only.
3. Core contracts depend on traits, libraries, and adapters (strategy-execution path).
4. No production contract depends on mocks.

Practical dependency sequence for deployment and analysis:

1. traits/sip-010-ft-trait.clar
2. remaining trait contracts
3. libraries/constants-lib.clar
4. libraries/error-codes-lib.clar
5. libraries/strategy-validation-lib.clar
6. libraries/vault-accounting-lib.clar
7. adapter contracts
8. core/access-control.clar
9. core/protocol-config.clar
10. core/strategy-registry.clar
11. core/vault-receipt-token.clar
12. core/vault-core.clar
13. core/strategy-execution.clar

## Runtime Interaction Model

- access-control is the source of truth for owner and role checks across core contracts.
- protocol-config provides mutable policy values such as fee rate, cooldown bounds, treasury, and supported assets.
- strategy-registry gates strategy activation and metadata used by vault and execution flows.
- vault-core owns user vault state and share/accounting lifecycle.
- vault-receipt-token mints, burns, and tracks receipt shares per vault.
- strategy-execution validates cooldown and strategy status, routes assets through adapters, and records execution state.

## Network and Mock Policy

- Mocks are local-test contracts and are excluded from public-network deployment plans.
- Simnet/devnet workflows include mocks for deterministic testing.
- Testnet/mainnet deployment plans must target production contracts only.

## Notes

- There is no vault-registry contract in the reconciled architecture.
- Vault identity and lifecycle state are handled directly by core/vault-core.clar.
