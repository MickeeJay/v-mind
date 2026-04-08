;; @title V-Mind Protocol Configuration
;; @version 0.1.0
;; @author V-Mind Core Team
;; @notice Stores global protocol parameters such as fee rates, treasury target, and pause state.
;; @dev Core contracts read this contract to enforce system-wide governance and emergency controls.
;; @contract protocol-config
;; @constants
;; - bps-denominator: Basis points denominator used by all fee settings.
;; - err-owner-only: Returned when caller lacks owner permissions.
;; - err-invalid-fee: Returned when fee exceeds configured cap.
;; @data-vars
;; - contract-owner: Current configuration owner.
;; - treasury: Protocol treasury principal.
;; - platform-fee-bps: Protocol management fee in basis points.
;; - performance-fee-bps: Performance fee in basis points.
;; - protocol-paused: Global circuit breaker state.
;; @maps
;; - none
;; @public-functions
;; - set-treasury: Updates treasury principal.
;; - set-platform-fee-bps: Updates protocol management fee.
;; - set-performance-fee-bps: Updates protocol performance fee.
;; - pause-protocol: Enables global pause state.
;; - unpause-protocol: Disables global pause state.
;; @external-contracts
;; - Read by: strategy-vault, strategy-registry, vault-registry.
;; - Admin expected from: access-control.
;; @limitations
;; - Access-control integration is deferred; this scaffold uses owner checks directly.

(define-constant bps-denominator u10000)
(define-constant max-platform-fee-bps u1000)
(define-constant max-performance-fee-bps u3000)
(define-constant err-owner-only (err u2100))
(define-constant err-invalid-fee (err u2101))

(define-data-var contract-owner principal tx-sender)
(define-data-var treasury principal tx-sender)
(define-data-var platform-fee-bps uint u100)
(define-data-var performance-fee-bps uint u1000)
(define-data-var protocol-paused bool false)

(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (ok (var-set treasury new-treasury))
  )
)

(define-public (set-platform-fee-bps (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (asserts! (<= new-fee max-platform-fee-bps) err-invalid-fee)
    (ok (var-set platform-fee-bps new-fee))
  )
)

(define-public (set-performance-fee-bps (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (asserts! (<= new-fee max-performance-fee-bps) err-invalid-fee)
    (ok (var-set performance-fee-bps new-fee))
  )
)

(define-public (pause-protocol)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (ok (var-set protocol-paused true))
  )
)

(define-public (unpause-protocol)
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (ok (var-set protocol-paused false))
  )
)

(define-read-only (is-paused)
  (var-get protocol-paused)
)
