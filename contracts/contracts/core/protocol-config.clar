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
(define-constant err-strategy-type-already-whitelisted (err u2111))
(define-constant err-strategy-type-not-whitelisted (err u2112))

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

(define-map whitelisted-strategy-types
	{ strategy-type: (string-ascii 32) }
	{ active: bool }
)

(define-private (is-owner (caller principal))
	(or
		(contract-call? .access-control has-role caller role-owner)
		(is-eq caller (contract-call? .access-control get-owner))
	)
)

(define-private (assert-owner)
	(if (is-owner tx-sender)
		(ok true)
		err-owner-only
	)
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

(define-public (set-max-active-vaults-per-user (new-max-active-vaults uint))
	(begin
		(try! (assert-owner))
		(asserts! (> new-max-active-vaults u0) err-invalid-max-active-vaults)
		(asserts! (<= new-max-active-vaults max-max-active-vaults-per-user) err-invalid-max-active-vaults)
		(var-set max-active-vaults-per-user new-max-active-vaults)
		(let ((next-version (bump-config-version)))
			(begin
				(print {
					event: "config-updated",
					parameter: "max-active-vaults-per-user",
					value: new-max-active-vaults,
					version: next-version,
					caller: tx-sender
				})
				(ok new-max-active-vaults)
			)
		)
	)
)

(define-public (set-minimum-deposit-microstx (new-minimum-deposit uint))
	(begin
		(try! (assert-owner))
		(asserts! (> new-minimum-deposit u0) err-invalid-minimum-deposit)
		(asserts! (<= new-minimum-deposit max-minimum-deposit-microstx) err-invalid-minimum-deposit)
		(var-set minimum-deposit-microstx new-minimum-deposit)
		(let ((next-version (bump-config-version)))
			(begin
				(print {
					event: "config-updated",
					parameter: "minimum-deposit-microstx",
					value: new-minimum-deposit,
					version: next-version,
					caller: tx-sender
				})
				(ok new-minimum-deposit)
			)
		)
	)
)

(define-public (set-max-strategy-rebalance-frequency-blocks (new-max-frequency uint))
	(begin
		(try! (assert-owner))
		(asserts! (> new-max-frequency u0) err-invalid-rebalance-frequency)
		(asserts! (<= new-max-frequency max-rebalance-frequency-blocks) err-invalid-rebalance-frequency)
		(var-set max-strategy-rebalance-frequency-blocks new-max-frequency)
		(let ((next-version (bump-config-version)))
			(begin
				(print {
					event: "config-updated",
					parameter: "max-strategy-rebalance-frequency-blocks",
					value: new-max-frequency,
					version: next-version,
					caller: tx-sender
				})
				(ok new-max-frequency)
			)
		)
	)
)

(define-public (set-protocol-treasury (new-treasury principal))
	(begin
		(try! (assert-owner))
		(var-set protocol-treasury new-treasury)
		(let ((next-version (bump-config-version)))
			(begin
				(print {
					event: "config-updated",
					parameter: "protocol-treasury",
					value: new-treasury,
					version: next-version,
					caller: tx-sender
				})
				(ok new-treasury)
			)
		)
	)

	(define-public (add-supported-asset
		(asset-contract principal)
		(symbol (string-ascii 16))
		(min-deposit-microstx uint)
		(max-deposit-microstx uint)
	)
		(begin
			(try! (assert-owner))
			(asserts! (is-none (map-get? supported-assets { asset-contract: asset-contract })) err-asset-already-supported)
			(asserts! (> (len symbol) u0) err-invalid-asset-symbol)
			(asserts! (<= (len symbol) max-asset-symbol-length) err-invalid-asset-symbol)
			(asserts! (> min-deposit-microstx u0) err-invalid-asset-limits)
			(asserts! (<= min-deposit-microstx max-deposit-microstx) err-invalid-asset-limits)
			(map-set supported-assets
				{ asset-contract: asset-contract }
				{
					asset-contract: asset-contract,
					symbol: symbol,
					active: true,
					min-deposit-microstx: min-deposit-microstx,
					max-deposit-microstx: max-deposit-microstx
				}
			)
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "asset-added",
						asset-contract: asset-contract,
						symbol: symbol,
						active: true,
						min-deposit-microstx: min-deposit-microstx,
						max-deposit-microstx: max-deposit-microstx,
						version: next-version,
						caller: tx-sender
					})
					(ok asset-contract)
				)
			)
		)
	)

	(define-public (remove-supported-asset (asset-contract principal))
		(begin
			(try! (assert-owner))
			(asserts! (is-some (map-get? supported-assets { asset-contract: asset-contract })) err-asset-not-supported)
			(map-delete supported-assets { asset-contract: asset-contract })
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "asset-removed",
						asset-contract: asset-contract,
						version: next-version,
						caller: tx-sender
					})
					(ok true)
				)
			)
		)
	)

	(define-public (set-supported-asset-active (asset-contract principal) (active bool))
		(begin
			(try! (assert-owner))
			(match (map-get? supported-assets { asset-contract: asset-contract })
				asset-entry
					(begin
					(map-set supported-assets
						{ asset-contract: asset-contract }
						{
							asset-contract: (get asset-contract asset-entry),
							symbol: (get symbol asset-entry),
							active: active,
							min-deposit-microstx: (get min-deposit-microstx asset-entry),
							max-deposit-microstx: (get max-deposit-microstx asset-entry)
						}
					)
					(let ((next-version (bump-config-version)))
						(begin
							(print {
								event: "asset-status-updated",
								asset-contract: asset-contract,
								active: active,
								version: next-version,
								caller: tx-sender
							})
							(ok true)
						)
					)
					)
				err-asset-not-supported
			)
		)
	)

	(define-public (set-fee-override (override-key (string-ascii 32)) (fee-rate-bps uint))
		(begin
			(try! (assert-owner))
			(asserts! (> (len override-key) u0) err-invalid-override-key)
			(asserts! (<= (len override-key) max-override-key-length) err-invalid-override-key)
			(asserts! (<= fee-rate-bps max-performance-fee-bps) err-invalid-fee-rate)
			(map-set fee-overrides
				{ override-key: override-key }
				{
					fee-rate-bps: fee-rate-bps,
					active: true
				}
			)
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "fee-override-updated",
						override-key: override-key,
						fee-rate-bps: fee-rate-bps,
						active: true,
						version: next-version,
						caller: tx-sender
					})
					(ok true)
				)
			)
		)
	)

	(define-public (remove-fee-override (override-key (string-ascii 32)))
		(begin
			(try! (assert-owner))
			(asserts! (is-some (map-get? fee-overrides { override-key: override-key })) err-override-not-found)
			(map-delete fee-overrides { override-key: override-key })
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "fee-override-removed",
						override-key: override-key,
						version: next-version,
						caller: tx-sender
					})
					(ok true)
				)
			)
		)
	)

	(define-public (set-fee-override-active (override-key (string-ascii 32)) (active bool))
		(begin
			(try! (assert-owner))
			(match (map-get? fee-overrides { override-key: override-key })
				override-entry
					(begin
					(map-set fee-overrides
						{ override-key: override-key }
						{
							fee-rate-bps: (get fee-rate-bps override-entry),
							active: active
						}
					)
					(let ((next-version (bump-config-version)))
						(begin
							(print {
								event: "fee-override-status-updated",
								override-key: override-key,
								active: active,
								version: next-version,
								caller: tx-sender
							})
							(ok true)
						)
					)
					)
				err-override-not-found
			)
		)
	)

	(define-public (add-whitelisted-strategy-type (strategy-type (string-ascii 32)))
		(begin
			(try! (assert-owner))
			(asserts! (> (len strategy-type) u0) err-invalid-override-key)
			(asserts! (<= (len strategy-type) max-override-key-length) err-invalid-override-key)
			(asserts! (is-none (map-get? whitelisted-strategy-types { strategy-type: strategy-type })) err-strategy-type-already-whitelisted)
			(map-set whitelisted-strategy-types { strategy-type: strategy-type } { active: true })
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "strategy-type-whitelisted",
						strategy-type: strategy-type,
						active: true,
						version: next-version,
						caller: tx-sender
					})
					(ok true)
				)
			)
		)
	)

	(define-public (remove-whitelisted-strategy-type (strategy-type (string-ascii 32)))
		(begin
			(try! (assert-owner))
			(asserts! (is-some (map-get? whitelisted-strategy-types { strategy-type: strategy-type })) err-strategy-type-not-whitelisted)
			(map-delete whitelisted-strategy-types { strategy-type: strategy-type })
			(let ((next-version (bump-config-version)))
				(begin
					(print {
						event: "strategy-type-removed",
						strategy-type: strategy-type,
						version: next-version,
						caller: tx-sender
					})
					(ok true)
				)
			)
		)
	)

	(define-public (set-whitelisted-strategy-type-active (strategy-type (string-ascii 32)) (active bool))
		(begin
			(try! (assert-owner))
			(match (map-get? whitelisted-strategy-types { strategy-type: strategy-type })
				strategy-type-entry
					(begin
						(map-set whitelisted-strategy-types { strategy-type: strategy-type } { active: active })
						(let ((next-version (bump-config-version)))
							(begin
								(print {
									event: "strategy-type-status-updated",
									strategy-type: strategy-type,
									active: active,
									version: next-version,
									caller: tx-sender
								})
								(ok true)
							)
						)
					)
				err-strategy-type-not-whitelisted
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

(define-read-only (get-whitelisted-strategy-type (strategy-type (string-ascii 32)))
	(map-get? whitelisted-strategy-types { strategy-type: strategy-type })
)
