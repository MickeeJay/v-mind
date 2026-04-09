# External Protocol Interfaces (Stacks Mainnet)

Last verified: 2026-04-09

This document captures the deployed contract principals and integration entry points used by the V-Mind protocol adapter layer.

## Sources

- Hiro interface API (`https://api.hiro.so/v2/contracts/interface/...`) for ABI-level function signatures and response types.
- ALEX docs mainnet contract list (`alexgo-io/alexlab-doc`, `developers/integrations/networks/mainnet.md`).
- StackingDAO docs page `core-contracts/ststx-stacking-dao-core-v6` (principal extraction from page source).
- Hermetica docs page `usdh/how-it-works/technical-primitives` (principal extraction from page source).
- Zest ABI validated on Hiro; principal corroborated by live integration references and ABI availability.

## Zest Protocol (Lending)

Primary deployer principal:

- `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N`

Relevant contracts:

- Borrow helper: `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.borrow-helper-v2-1-5`
- Reserve: `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.pool-0-reserve`
- sBTC zToken: `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.zsbtc-v2-0`
- Incentives: `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.incentives`
- Oracle (sBTC): `SP2VCQJGH7PHP2DJK7Z0V48AGBHQAW3R3ZW1QF4N.oracle-sbtc`
- sBTC token: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`

Deposit/withdraw functions:

- `supply(lp, pool-reserve, asset, amount, owner, referral, incentives) -> (response bool uint)`
- `withdraw(lp, pool-reserve, asset, oracle, amount, owner, assets, incentives, price-feed-bytes) -> (response bool uint)`

Balance helper used for adapter accounting:

- `pool-0-reserve.get-user-underlying-asset-balance(lp-token, asset, user) -> (response uint uint)`

## ALEX Lab (AMM Liquidity)

Primary protocol principal (mainnet):

- `SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9`

Relevant contract for pool position management:

- `SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.amm-swap-pool-v1-1`

Deposit/withdraw functions:

- `add-to-position(token-x-trait, token-y-trait, factor, dx, max-dy) -> (response { dx: uint, dy: uint, supply: uint } uint)`
- `reduce-position(token-x-trait, token-y-trait, factor, percent) -> (response { dx: uint, dy: uint } uint)`

Additional quote helper:

- `get-position-given-mint(token-x, token-y, factor, token-amount) -> (response { dx: uint, dy: uint } uint)`

## StackingDAO (stSTX)

Primary protocol principal:

- `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG`

Relevant contracts:

- Core: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.stacking-dao-core-v6`
- Reserve: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.reserve-v1`
- Direct helpers: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.direct-helpers-v4`
- Commission: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.commission-v2`
- Staking contract ref used by core: `SP4SZE494VC2YC5JYG7AYFQ44F5Q4PYV7DVMDPBG.staking-v0`

Deposit/withdraw functions:

- `deposit(reserve, commission-contract, staking-contract, direct-helpers, stx-amount, referrer, pool) -> (response uint uint)`
- `init-withdraw(reserve, direct-helpers, ststx-amount) -> (response uint uint)`
- `withdraw-idle(reserve, direct-helpers, commission-contract, staking-contract, ststx-amount) -> (response { stx-fee-amount: uint, stx-user-amount: uint } uint)`

Balance/rate helpers used for adapter accounting:

- `reserve-v1.get-total-stx() -> (response uint none)`
- `direct-helpers-v4.get-user-balance-in-protocol(user, protocol, index) -> (response uint uint)`

## Hermetica (USDh Yield)

Primary protocol principal:

- `SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG`

Relevant contracts:

- Staking: `SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.staking-v1-1`
- sUSDh token: `SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.susdh-token-v1`
- USDh token: `SPN5AKG35QZSK2M8GAMR4AFX45659RJHDW353HSG.usdh-token-v1`

Deposit/withdraw functions:

- `stake(amount, affiliate) -> (response bool uint)`
- `unstake(amount) -> (response uint uint)`

Yield accrual/accounting helper:

- `get-usdh-per-susdh() -> (response uint none)`
- `susdh-token-v1.get-balance(account) -> (response uint none)`

## Integration Notes For V-Mind Adapters

- All adapters should normalize external error codes into V-Mind adapter-specific errors while preserving external code in emitted event payloads.
- External calls returning structured tuples should be flattened into adapter outputs expected by execution engine traits.
- Adapters should be test-configurable and run against local mocks that mimic these same signatures and response shapes.

### Local Simulation Assumption

- The current repository implementation uses local protocol mocks as execution targets so contracts compile and run in Clarinet without mainnet requirements.
- Mainnet principals and ABI signatures in this document are the source-of-truth references for production adapter wiring.
