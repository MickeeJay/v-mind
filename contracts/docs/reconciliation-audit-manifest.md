# V-Mind Contract Reconciliation Audit Manifest

Date: 2026-04-10
Branch: feat/contract-reconciliation

## Scope
Full audit of all Clarity contracts under contracts/contracts before any implementation edits.

## Contract Inventory (.clar)

| Path | Approx. Lines | Documentation Header |
| --- | ---: | :---: |
| contracts/contracts/adapters/alex-liquidity-adapter.clar | 225 | yes |
| contracts/contracts/adapters/hermetica-adapter.clar | 243 | yes |
| contracts/contracts/adapters/stackingdao-adapter.clar | 271 | yes |
| contracts/contracts/adapters/zest-protocol-adapter.clar | 225 | yes |
| contracts/contracts/core/access-control.clar | 116 | yes |
| contracts/contracts/core/protocol-config.clar | 483 | yes |
| contracts/contracts/core/strategy-execution.clar | 514 | yes |
| contracts/contracts/core/strategy-registry.clar | 315 | yes |
| contracts/contracts/core/vault-core.clar | 678 | yes |
| contracts/contracts/core/vault-receipt-token.clar | 345 | yes |
| contracts/contracts/core/vault-registry.clar | 116 | yes |
| contracts/contracts/libraries/constants-lib.clar | 56 | yes |
| contracts/contracts/libraries/error-codes-lib.clar | 35 | yes |
| contracts/contracts/libraries/strategy-validation-lib.clar | 39 | yes |
| contracts/contracts/libraries/vault-accounting-lib.clar | 39 | yes |
| contracts/contracts/mocks/mock-alex-amm.clar | 82 | yes |
| contracts/contracts/mocks/mock-defi-integrations.clar | 155 | yes |
| contracts/contracts/mocks/mock-hermetica-staking.clar | 94 | yes |
| contracts/contracts/mocks/mock-protocol-adapter.clar | 55 | yes |
| contracts/contracts/mocks/mock-stackingdao-core.clar | 124 | yes |
| contracts/contracts/mocks/mock-strategy.clar | 56 | yes |
| contracts/contracts/mocks/mock-vault-token.clar | 73 | yes |
| contracts/contracts/mocks/mock-zest-protocol.clar | 87 | yes |
| contracts/contracts/traits/alex-liquidity-trait.clar | 13 | yes |
| contracts/contracts/traits/hermetica-usdh-trait.clar | 13 | yes |
| contracts/contracts/traits/protocol-adapter-trait.clar | 30 | yes |
| contracts/contracts/traits/sip-010-ft-trait.clar | 14 | yes |
| contracts/contracts/traits/stackingdao-ststx-trait.clar | 13 | yes |
| contracts/contracts/traits/strategy-trait.clar | 32 | yes |
| contracts/contracts/traits/vault-token-trait.clar | 38 | yes |
| contracts/contracts/traits/zest-lending-trait.clar | 13 | yes |

## Structural Findings Before Fixes

2. Core contract is named vault-core.clar and must be renamed to vault-core.clar.
4. Core directory contains an extra vault-registry.clar not listed in canonical target core set; needs resolution.
5. Adapters contain inline hardcoded principal literals rather than library constants.
6. Libraries currently expose mostly read-only helpers; constants-lib is incomplete for required protocol constants and external principal constants.
7. error-codes-lib is incomplete relative to project-wide err usage and contracts still contain inline error constants.
8. access-control lacks required role names (strategy-registrar, vault-operator, emergency-pauser) and global emergency pause/unpause entry points.
9. protocol-config naming diverges from required names (e.g. get-max-active-vaults-per-user vs max-vaults-per-user), and supported-asset map exists but core required fields need harmonization.
10. strategy-registry has required activation/deactivation and retrieval logic but function naming differs from required validate-strategy-for-execution.
11. strategy-execution function exists but named rebalance-vault instead of rebalance and references vault-core principal name.
12. Mocks do not uniformly contain required top warning comment text and should be normalized.
13. Test framework under contracts/tests uses Clarinet v1 Deno-style APIs and requires Clarinet v2 SDK + Vitest setup.

## Reconciliation Plan

2. Rename vault-core.clar to vault-core.clar and update all references.
3. Reconcile trait, library, adapter, and core function names to canonical required set.
4. Centralize external principals in constants-lib and remove inline adapter principals.
5. Consolidate error constants into error-codes-lib and update err references.
6. Reorder Clarinet.toml declarations in strict dependency order and isolate mocks to local dev/test network only.
7. Migrate test framework to @hirosystems/clarinet-sdk + Vitest and validate startup.
8. Update architecture and security documentation after code reconciliation.
