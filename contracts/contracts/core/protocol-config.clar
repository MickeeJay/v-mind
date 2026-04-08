;; @title V-Mind Protocol Configuration
;; @version 0.2.0
;; @author V-Mind Core Team
;; @notice Single source of truth for protocol-level parameters and risk limits.
;; @dev All mutating methods are intended to be owner-gated through access-control.
;; @contract protocol-config

(define-constant bps-denominator u10000)
(define-constant max-performance-fee-bps u2000)
(define-constant max-max-active-vaults-per-user u200)
(define-constant max-minimum-deposit-microstx u1000000000000)
(define-constant max-rebalance-frequency-blocks u52595)
(define-constant max-asset-symbol-length u16)
(define-constant max-override-key-length u32)
(define-constant role-owner u1)

(define-constant err-owner-only (err u2100))
(define-constant err-invalid-fee-rate (err u2101))
(define-constant err-invalid-max-active-vaults (err u2102))
(define-constant err-invalid-minimum-deposit (err u2103))
(define-constant err-invalid-rebalance-frequency (err u2104))
(define-constant err-invalid-asset-limits (err u2105))
(define-constant err-invalid-asset-symbol (err u2106))
(define-constant err-asset-already-supported (err u2107))
(define-constant err-asset-not-supported (err u2108))
(define-constant err-invalid-override-key (err u2109))
(define-constant err-override-not-found (err u2110))

(define-data-var protocol-performance-fee-bps uint u1000)
(define-data-var max-active-vaults-per-user uint u10)
(define-data-var minimum-deposit-microstx uint u1000000)
(define-data-var max-strategy-rebalance-frequency-blocks uint u144)
(define-data-var protocol-treasury principal tx-sender)
(define-data-var config-version uint u1)

(define-map supported-assets
	{ asset-contract: principal }
	{
		asset-contract: principal,
		symbol: (string-ascii 16),
		active: bool,
		min-deposit-microstx: uint,
		max-deposit-microstx: uint
	}
)

(define-map fee-overrides
	{ override-key: (string-ascii 32) }
	{
		fee-rate-bps: uint,
		active: bool
	}
)

(define-private (is-owner (caller principal))
	(or
		(contract-call? .access-control has-role caller role-owner)
		(is-eq caller (contract-call? .access-control get-owner))
	)
)

(define-private (assert-owner)
	(asserts! (is-owner tx-sender) err-owner-only)
)

(define-private (bump-config-version)
	(let ((next-version (+ (var-get config-version) u1)))
		(begin
			(var-set config-version next-version)
			next-version
		)
	)
)

(define-public (set-protocol-performance-fee-bps (new-fee-rate-bps uint))
	(begin
		(try! (assert-owner))
		(asserts! (<= new-fee-rate-bps max-performance-fee-bps) err-invalid-fee-rate)
		(var-set protocol-performance-fee-bps new-fee-rate-bps)
		(let ((next-version (bump-config-version)))
			(begin
				(print {
					event: "config-updated",
					parameter: "protocol-performance-fee-bps",
					value: new-fee-rate-bps,
					version: next-version,
					caller: tx-sender
				})
				(ok new-fee-rate-bps)
			)
		)
	)
)

(define-read-only (get-protocol-performance-fee-bps)
	(var-get protocol-performance-fee-bps)
)

(define-read-only (get-max-active-vaults-per-user)
	(var-get max-active-vaults-per-user)
)

(define-read-only (get-minimum-deposit-microstx)
	(var-get minimum-deposit-microstx)
)

(define-read-only (get-max-strategy-rebalance-frequency-blocks)
	(var-get max-strategy-rebalance-frequency-blocks)
)

(define-read-only (get-protocol-treasury)
	(var-get protocol-treasury)
)

(define-read-only (get-config-version)
	(var-get config-version)
)

(define-read-only (get-supported-asset (asset-contract principal))
	(map-get? supported-assets { asset-contract: asset-contract })
)

(define-read-only (get-fee-override (override-key (string-ascii 32)))
	(map-get? fee-overrides { override-key: override-key })
)
