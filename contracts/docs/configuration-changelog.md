# Protocol Configuration Changelog

## Overview

The protocol configuration contract (`core/protocol-config.clar`) is the canonical source for mutable protocol parameters.
Every configuration write is owner-gated through the `access-control` contract and increments `config-version`.

Required role for all mutating functions:
- `owner` role (`role-owner = u1`) in `access-control`

## Configurable Parameters

| Parameter | Storage Type | Value Type | Valid Range | Setter Function | Required Role |
|---|---|---|---|---|---|
| `protocol-performance-fee-bps` | data-var | `uint` | `0..2000` bps | `set-protocol-performance-fee-bps` | owner |
| `max-active-vaults-per-user` | data-var | `uint` | `1..200` | `set-max-active-vaults-per-user` | owner |
| `minimum-deposit-microstx` | data-var | `uint` | `1..1000000000000` microSTX | `set-minimum-deposit-microstx` | owner |
| `max-strategy-rebalance-frequency-blocks` | data-var | `uint` | `1..52595` blocks | `set-max-strategy-rebalance-frequency-blocks` | owner |
| `protocol-treasury` | data-var | `principal` | Any valid principal | `set-protocol-treasury` | owner |
| `supported-assets[asset-contract]` | map | `{ asset-contract, symbol, active, min-deposit-microstx, max-deposit-microstx }` | `symbol` length `1..16`, `min > 0`, `min <= max` | `add-supported-asset`, `set-supported-asset-active`, `remove-supported-asset` | owner |
| `fee-overrides[override-key]` | map | `{ fee-rate-bps, active }` | `override-key` length `1..32`, `fee-rate-bps <= 2000` | `set-fee-override`, `set-fee-override-active`, `remove-fee-override` | owner |
| `whitelisted-strategy-types[strategy-type]` | map | `{ active }` | `strategy-type` length `1..32` | `add-whitelisted-strategy-type`, `set-whitelisted-strategy-type-active`, `remove-whitelisted-strategy-type` | owner |

## Versioning and Event Log

- `config-version` starts at `u1`.
- Any successful configuration change increments `config-version` by `u1`.
- Every configuration mutation emits a `print` event with:
  - `event`: event name
  - `version`: post-update configuration version
  - `caller`: transaction sender
  - parameter-specific fields (for example `value`, `asset-contract`, `override-key`)

## Initial Release Notes (2026-04-08)

- Added scalar protocol parameters for fee, vault limits, deposit floor, rebalance frequency, and treasury destination.
- Added supported asset registry with activation and per-asset deposit constraints.
- Added fee override registry for strategy tiers and vault classes.
- Added strategy type whitelist registry for governance-controlled strategy-category activation.
- Added deterministic versioning and event emission on all configuration writes.
