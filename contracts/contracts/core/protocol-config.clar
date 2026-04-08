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
